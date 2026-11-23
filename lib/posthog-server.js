import { PostHog } from "posthog-node";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

let posthogServer = null;

export function getPostHogServer() {
  if (!token || !host) {
    return null;
  }

  posthogServer ??= new PostHog(token, {
    host,
    flushAt: 1,
    flushInterval: 0,
    requestTimeout: 2000,
    captureAiRequestTimeoutMs: 2000,
    fetchRetryCount: 0,
    privacyMode: false,
    enableExceptionAutocapture: process.env.NEXT_RUNTIME === "nodejs",
  });

  return posthogServer;
}
