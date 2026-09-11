import { NextResponse } from "next/server";
import { z } from "zod";
import { avatarBySlug } from "@/lib/sarathi/avatars";
import { personaBySlug } from "@/lib/sarathi/personas";
import { runAvatar } from "@/lib/sarathi/engine";
import { geminiConfigured, GeminiError } from "@/lib/sarathi/gemini";

/**
 * Ask an AI avatar a question. Streams NDJSON — one event per line, in the
 * order `runAvatar` yields them, then `{ type: "error", code }` if it failed.
 *
 * Signed-out and stateless on purpose, like the rest of the playground: the
 * browser holds the conversation and sends the recent part of it with each
 * question. Which makes the rate limit below the only thing standing between
 * a public endpoint and the Gemini quota. It is per-instance memory, so on a
 * serverless host it is a speed bump rather than a wall — enough for a
 * refresh-happy visitor, not for someone determined.
 */

export const maxDuration = 60;

const bodySchema = z.object({
  slug: z.string().max(80),
  question: z.string().trim().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "avatar"]),
        text: z.string().max(4000),
      })
    )
    .max(40)
    .default([]),
});

/** Earlier turns sent back to the model. Six exchanges is plenty of context. */
const HISTORY_TURNS = 12;

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 12;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Keep the map from growing without bound on a long-lived instance.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((time) => now - time >= RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

function clientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request) {
  let json;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { slug, question, history } = parsed.data;

  const avatar = avatarBySlug(slug);
  const persona = personaBySlug(slug);
  if (!avatar || avatar.status !== "live" || !persona) {
    return NextResponse.json({ error: "unknown_avatar" }, { status: 404 });
  }

  if (!geminiConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  if (rateLimited(clientIp(request))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        for await (const event of runAvatar({
          persona,
          history: history.slice(-HISTORY_TURNS),
          question,
        })) {
          send(event);
        }
      } catch (error) {
        console.error("[sarathi] avatar failed", error);
        send({ type: "error", code: error instanceof GeminiError ? error.code : "upstream" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
