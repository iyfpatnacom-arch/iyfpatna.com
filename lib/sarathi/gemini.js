/**
 * A single call to Google's Gemini API, over plain `fetch`.
 *
 * No SDK: one POST is all this needs, and the REST shape is stable. Gemini
 * because its free tier covers a site this size; the models are environment
 * variables so moving to a newer one is a config change, not a code change.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * 2.5 Flash is closed to keys created after its retirement; 3.6 is what
 * Google points new keys at. On the free tier each model has its own spikes
 * of 503 "high demand", and they rarely coincide — so the fallbacks are a
 * sibling Flash and then Flash-Lite, which is lighter but usually answers in
 * a second or two.
 */
const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_FALLBACKS = "gemini-3.7-flash,gemini-3.1-flash-lite";

/** Per model. A slow answer beats none, but not by more than this. */
const TIMEOUT_MS = 25000;

/** Worth trying the next model: overloaded, over quota, or broken upstream. */
const FALLBACK_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * The model's own hidden reasoning, turned down. The prompt already asks for
 * an explicit chain of thought, so a second, invisible one only spends
 * free-tier tokens and seconds. 2.5 Flash takes a token budget (Pro rejects
 * zero); Gemini 3 takes a level, and "low" is the lowest every Gemini 3 model
 * accepts — 3.7, 3.8 and flash-latest refuse "minimal".
 */
function thinkingConfigFor(model) {
  if (model.startsWith("gemini-2.5-flash")) return { thinkingBudget: 0 };
  if (model.startsWith("gemini-3") || model.includes("-latest")) return { thinkingLevel: "low" };
  return undefined;
}

function modelChain() {
  const primary = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS ?? DEFAULT_FALLBACKS)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
}

export class GeminiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    /** "not_configured" | "rate_limited" | "busy" | "blocked" | "upstream" */
    this.code = code ?? "upstream";
  }
}

export function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * @param {object} options
 * @param {string} options.system  the system instruction
 * @param {Array<{role: "user"|"model", parts: Array<{text: string}>}>} options.contents
 * @param {object} [options.schema] a Gemini `responseSchema`; forces JSON output
 * @returns {Promise<string>} the model's text
 */
export async function generate({ system, contents, schema, temperature = 0.7 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("GEMINI_API_KEY is not set", { code: "not_configured" });

  let lastError;
  for (const model of modelChain()) {
    try {
      return await callModel({ apiKey, model, system, contents, schema, temperature });
    } catch (error) {
      lastError = error;
      if (!error.fallback) break;
      console.warn(`[sarathi] ${model} unavailable (${error.message.slice(0, 120)}); trying next model`);
    }
  }
  throw lastError;
}

async function callModel({ apiKey, model, system, contents, schema, temperature }) {
  const thinkingConfig = thinkingConfigFor(model);

  let response;
  try {
    response = await fetch(`${ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature,
          maxOutputTokens: 4096,
          ...(schema && { responseMimeType: "application/json", responseSchema: schema }),
          ...(thinkingConfig && { thinkingConfig }),
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    throw Object.assign(new GeminiError(`${model} unreachable: ${error.message}`), { fallback: true });
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw Object.assign(
      new GeminiError(`${model} ${response.status}: ${detail.slice(0, 500)}`, {
        status: response.status,
        code: response.status === 429 ? "rate_limited" : response.status === 503 ? "busy" : "upstream",
      }),
      { fallback: FALLBACK_STATUSES.has(response.status) }
    );
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];

  if (!candidate || data?.promptFeedback?.blockReason || candidate.finishReason === "SAFETY") {
    throw new GeminiError("Gemini declined to answer", { code: "blocked" });
  }

  const text = (candidate.content?.parts ?? [])
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("");

  if (!text) throw new GeminiError(`${model}: empty response (finishReason ${candidate.finishReason})`);
  return text;
}
