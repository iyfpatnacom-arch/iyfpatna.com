import { generate, GeminiError } from "@/lib/sarathi/gemini";
import { buildSystemPrompt, STEP_BATCH_SCHEMA } from "@/lib/sarathi/prompt";
import { runTool } from "@/lib/sarathi/tools";

/**
 * The chain-of-thought loop for an AI avatar.
 *
 * The same shape as the course's `04_cot_tool.js` — keep asking the model for
 * the next steps, run any TOOL_REQUEST, feed back a TOOL_OUTPUT, stop at
 * OUTPUT — written as an async generator so the route can stream every step
 * to the browser the moment it exists. Watching the avatar "reflect" is most
 * of what makes a seven-second answer feel short.
 *
 * Yields, in order:
 *   { type: "step", step, text }           INITIAL / THINK / ANALYSE notes
 *   { type: "tool", tool, input }          a lookup has started
 *   { type: "tool_done", tool, ok, label } …and finished
 *   { type: "answer", text, sources }      the OUTPUT; always last on success
 */

const MAX_TOOL_CALLS = 3;
/** Model calls per question. Tool calls + 1 is the normal case; this is the ceiling. */
const MAX_ROUNDS = MAX_TOOL_CALLS + 2;

const STEPS = new Set(["INITIAL", "THINK", "ANALYSE", "TOOL_REQUEST", "OUTPUT"]);

function parseBatch(raw) {
  try {
    const parsed = JSON.parse(raw);
    const steps = Array.isArray(parsed) ? parsed : parsed?.steps;
    if (!Array.isArray(steps)) return [];
    return steps
      .filter((item) => item && STEPS.has(String(item.step).toUpperCase()))
      .map((item) => ({ ...item, step: String(item.step).toUpperCase(), text: String(item.text ?? "") }));
  } catch {
    return [];
  }
}

const userTurn = (text) => ({ role: "user", parts: [{ text }] });
const modelTurn = (text) => ({ role: "model", parts: [{ text }] });

/**
 * Earlier answers go back in as OUTPUT-only batches, not as bare prose, so the
 * history itself keeps showing the model the format it must answer in. The
 * private reasoning of past turns is dropped — it is tokens, not context.
 */
function historyToContents(history) {
  return history.map((turn) =>
    turn.role === "user"
      ? userTurn(turn.text)
      : modelTurn(JSON.stringify({ steps: [{ step: "OUTPUT", text: turn.text }] }))
  );
}

export async function* runAvatar({ persona, history, question }) {
  const system = buildSystemPrompt(persona);
  const contents = [...historyToContents(history), userTurn(question)];
  const sources = [];
  let toolCalls = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const lastRound = round === MAX_ROUNDS - 1;
    const raw = await generate({ system, contents, schema: STEP_BATCH_SCHEMA });
    const steps = parseBatch(raw);
    contents.push(modelTurn(raw));

    let request = null;
    for (const step of steps) {
      if (step.step === "OUTPUT") {
        if (!step.text.trim()) break;
        yield { type: "answer", text: step.text.trim(), sources };
        return;
      }
      if (step.step === "TOOL_REQUEST") {
        request = step;
        break; // anything after a tool request was written before its result; discard it
      }
      yield { type: "step", step: step.step, text: step.text };
    }

    if (request && toolCalls < MAX_TOOL_CALLS && !lastRound) {
      toolCalls += 1;
      const tool = String(request.tool ?? "");
      const input = String(request.input ?? "");
      yield { type: "tool", tool, input };

      const result = await runTool(tool, input);
      if (result.source && !sources.some((source) => source.url === result.source.url)) {
        sources.push(result.source);
      }
      yield { type: "tool_done", tool, ok: !result.forModel.error, label: result.source?.label ?? input };

      const budgetNote =
        toolCalls >= MAX_TOOL_CALLS
          ? " You have used all your tool requests. Your next batch must end with OUTPUT."
          : "";
      contents.push(
        userTurn(JSON.stringify({ step: "TOOL_OUTPUT", tool, output: result.forModel }) + budgetNote)
      );
      continue;
    }

    // No OUTPUT and no usable tool request — an empty batch, a tool request
    // over budget, or a batch that simply stopped. Say what is wanted.
    contents.push(
      userTurn(
        JSON.stringify({
          step: "SYSTEM",
          text: request
            ? "No more tools are available. Answer now from what you know, and end this batch with OUTPUT."
            : "Continue the pipeline and end this batch with OUTPUT.",
        })
      )
    );
  }

  throw new GeminiError("The avatar did not reach an answer", { code: "upstream" });
}
