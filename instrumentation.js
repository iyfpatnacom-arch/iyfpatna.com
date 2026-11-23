import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const posthogLogsUrl = posthogHost ? `${posthogHost.replace(/\/+$/, "")}/i/v1/logs` : null;

export const loggerProvider =
  process.env.NEXT_RUNTIME === "nodejs" && posthogToken && posthogLogsUrl
    ? new LoggerProvider({
        resource: resourceFromAttributes({ "service.name": "iyfpatna-com" }),
        processors: [
          new BatchLogRecordProcessor(
            new OTLPLogExporter({
              url: posthogLogsUrl,
              headers: {
                Authorization: `Bearer ${posthogToken}`,
                "Content-Type": "application/json",
              },
              timeoutMillis: 2000,
            }),
            { exportTimeoutMillis: 2000 },
          ),
        ],
      })
    : null;

// This logger is intentionally separate from console and application loggers:
// only log records added by this integration are exported to PostHog.
export const paymentWebhookLogger = loggerProvider?.getLogger("posthog.payment_webhook");

if (!loggerProvider && process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV !== "production") {
  if (!posthogToken) {
    console.warn(
      "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
    );
  }
  if (!posthogHost) {
    console.warn(
      "NEXT_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_HOST is configured",
    );
  }
}

if (loggerProvider && process.env.NEXT_RUNTIME === "nodejs") {
  process.once("SIGTERM", () => {
    void loggerProvider.shutdown().catch(() => {});
  });
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "production") return; // never auto-seed a real database
  if (process.env.MONGODB_URI) return; // real database — seed explicitly via `npm run seed`

  const { runSeed } = await import("./lib/db/seedData.js");
  await runSeed({ log: (msg) => console.log(msg) }).catch((err) => {
    console.error("[instrumentation] in-memory dev DB seed failed", err);
  });
}
