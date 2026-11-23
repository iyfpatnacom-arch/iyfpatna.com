import { randomUUID } from "node:crypto";
import { PostHog } from "posthog-node";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

const posthog =
  token && host
    ? new PostHog(token, {
        host,
        flushAt: 1,
        flushInterval: 0,
        requestTimeout: 2000,
        captureAiRequestTimeoutMs: 2000,
        fetchRetryCount: 0,
        privacyMode: false,
      })
    : null;

if (!posthog && process.env.NODE_ENV !== "production") {
  if (!token) {
    console.warn(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured"
    );
  }
  if (!host) {
    console.warn(
      "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured"
    );
  }
}

function capture(event, sessionId, traceId, properties) {
  try {
    posthog?.captureAi({
      distinctId: sessionId,
      event,
      properties: {
        $ai_trace_id: traceId,
        $ai_session_id: sessionId,
        ...properties,
      },
    });
  } catch {
    // Analytics must not affect the avatar response when capture is unavailable.
  }
}

export function captureGeneration({
  sessionId,
  traceId,
  model,
  input,
  output,
  usage,
  latency,
  temperature,
  status,
  stopReason,
  error,
}) {
  if (!sessionId || !traceId) return;

  capture("$ai_generation", sessionId, traceId, {
    $ai_span_id: randomUUID(),
    $ai_parent_id: traceId,
    $ai_span_name: "gemini_generate_content",
    $ai_model: model,
    $ai_provider: "gemini",
    $ai_input: input,
    ...(output && { $ai_output_choices: [{ role: "assistant", content: output }] }),
    ...(Number.isFinite(usage?.promptTokenCount) && { $ai_input_tokens: usage.promptTokenCount }),
    ...(Number.isFinite(usage?.candidatesTokenCount) && { $ai_output_tokens: usage.candidatesTokenCount }),
    $ai_latency: latency,
    ...(status && { $ai_http_status: status }),
    ...(stopReason && { $ai_stop_reason: stopReason }),
    $ai_temperature: temperature,
    $ai_max_tokens: 4096,
    ...(error && { $ai_is_error: true, $ai_error: error }),
  });
}

export function captureToolRun({ sessionId, traceId, tool, input, output, latency, error }) {
  if (!sessionId || !traceId) return;

  capture("$ai_span", sessionId, traceId, {
    $ai_span_id: randomUUID(),
    $ai_parent_id: traceId,
    $ai_span_name: tool || "sarathi_tool",
    $ai_input_state: { input },
    ...(output && { $ai_output_state: output }),
    $ai_latency: latency,
    ...(error && { $ai_is_error: true, $ai_error: error }),
  });
}

export async function flushAiObservability() {
  await posthog?.flush().catch(() => {});
}
