"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  ArrowUp,
  BookOpenText,
  Check,
  ChevronDown,
  ExternalLink,
  Loader2,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { AvatarPortrait } from "@/components/sarathi/AvatarPortrait";

/**
 * The conversation with an AI avatar.
 *
 * The conversation lives only in this component's state: nothing is stored,
 * on the server or in the browser, and a reload is a fresh start. Each
 * question is sent with the recent turns so the avatar can follow a thread.
 *
 * The reasoning is shown, not hidden. While an answer is being worked out the
 * steps stream in as they happen — understanding the question, thinking,
 * checking, reading a verse on Vedabase — and once the answer lands they fold
 * away under one line. Seeing *why* the answer names Bhagavad-gita 2.13 is
 * part of the point; it is also most of what makes a seven-second wait feel
 * like attention rather than lag.
 */

let nextId = 0;
const newId = () => `m${++nextId}`;

export function AvatarChat({ avatar }) {
  const t = useTranslations("sarathi.chat");
  const locale = useLocale();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const pending = messages.some((message) => message.status === "streaming");

  const abortRef = useRef(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (messages.length > 0) endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  const update = (id, change) =>
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...change(message) } : message))
    );

  async function ask(question, base = messages) {
    const text = question.trim();
    if (!text || pending) return;

    // Only settled turns go back as context — never a half-streamed or failed one.
    const history = base
      .filter((message) => message.status === "done")
      .map((message) => ({ role: message.role, text: message.text }));

    const replyId = newId();
    setMessages([
      ...base,
      { id: newId(), role: "user", text, status: "done" },
      { id: replyId, role: "avatar", text: "", question: text, trace: [], sources: [], status: "streaming" },
    ]);
    setInput("");

    const controller = new AbortController();
    abortRef.current = controller;

    const fail = (code) => update(replyId, () => ({ status: "error", error: code }));

    let response;
    try {
      response = await fetch("/api/sarathi/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: avatar.slug, question: text, history }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name !== "AbortError") fail("network");
      return;
    }

    if (!response.ok || !response.body) {
      const body = await response.json().catch(() => ({}));
      fail(body.error ?? "upstream");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let settled = false;

    const handle = (event) => {
      if (event.type === "step") {
        update(replyId, (message) => ({
          trace: [...message.trace, { kind: "step", step: event.step, text: event.text }],
        }));
      } else if (event.type === "tool") {
        update(replyId, (message) => ({
          trace: [...message.trace, { kind: "tool", tool: event.tool, input: event.input, state: "running" }],
        }));
      } else if (event.type === "tool_done") {
        update(replyId, (message) => {
          const trace = [...message.trace];
          const index = trace.findLastIndex((item) => item.kind === "tool" && item.state === "running");
          if (index !== -1) trace[index] = { ...trace[index], state: event.ok ? "ok" : "failed" };
          return { trace };
        });
      } else if (event.type === "answer") {
        settled = true;
        update(replyId, () => ({ text: event.text, sources: event.sources ?? [], status: "done" }));
      } else if (event.type === "error") {
        settled = true;
        fail(event.code);
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            handle(JSON.parse(line));
          } catch {
            // A malformed line is skipped; the stream carries on.
          }
        }
      }
      if (!settled) fail("upstream");
    } catch (error) {
      if (error.name !== "AbortError") fail("network");
    }
  }

  function retry(message) {
    // Drop the failed reply and the question that produced it, then ask again.
    const index = messages.findIndex((item) => item.id === message.id);
    ask(message.question, messages.slice(0, Math.max(0, index - 1)));
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }

  const submit = (event) => {
    event.preventDefault();
    ask(input);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* The avatar speaks first, so the page opens on a voice, not a form. */}
      <AvatarBubble avatar={avatar}>
        <AnswerText text={avatar.greeting[locale]} />
      </AvatarBubble>

      {messages.length === 0 && (
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("suggestions")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {avatar.suggestions[locale].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => ask(suggestion)}
                className="rounded-full border border-border bg-card px-3.5 py-2 text-left text-sm text-foreground transition-colors hover:border-brand-purple/40"
                style={{ touchAction: "manipulation" }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((message) =>
        message.role === "user" ? (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end"
          >
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-primary-foreground">
              {message.text}
            </p>
          </motion.div>
        ) : (
          <AvatarBubble key={message.id} avatar={avatar}>
            <Trace t={t} message={message} />

            {message.status === "done" && (
              <>
                <AnswerText text={message.text} />
                {message.sources.length > 0 && <Sources t={t} sources={message.sources} />}
              </>
            )}

            {message.status === "error" && (
              <div className="flex flex-col items-start gap-3">
                <p className="flex items-start gap-2 text-sm leading-relaxed text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {t.has(`error_${message.error}`) ? t(`error_${message.error}`) : t("error_upstream")}
                </p>
                {message.error !== "not_configured" && (
                  <button
                    type="button"
                    onClick={() => retry(message)}
                    disabled={pending}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground disabled:opacity-40"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    {t("retry")}
                  </button>
                )}
              </div>
            )}
          </AvatarBubble>
        )
      )}

      <div ref={endRef} />

      <form
        onSubmit={submit}
        // Sticky above the phone's app dock (5.5rem plus the home-bar inset),
        // so the box stays in reach while a long answer scrolls past.
        className="sticky bottom-[calc(6rem+env(safe-area-inset-bottom))] z-10 mt-2 flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm md:bottom-4"
      >
        <label htmlFor="sarathi-question" className="sr-only">
          {t("placeholder")}
        </label>
        <textarea
          id="sarathi-question"
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              ask(input);
            }
          }}
          rows={1}
          maxLength={1000}
          placeholder={t("placeholder")}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] leading-relaxed text-foreground outline-none [field-sizing:content] placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          aria-label={t("send")}
          className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="size-5" aria-hidden="true" />
          )}
        </button>
      </form>

      {messages.length > 0 && (
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 self-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {t("new_chat")}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- pieces */

function AvatarBubble({ avatar, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
      <AvatarPortrait avatar={avatar} size="sm" className="mt-1" />
      <Panel tone="accent" className="min-w-0 flex-1 rounded-tl-md p-4">
        <div className="flex flex-col gap-3">{children}</div>
      </Panel>
    </motion.div>
  );
}

/** The chain of thought: open while it streams, folded once the answer lands. */
function Trace({ t, message }) {
  const streaming = message.status === "streaming";
  if (!streaming && message.trace.length === 0) return null;

  const list = (
    <ol className="flex flex-col gap-2">
      {message.trace.map((item, index) => (
        <li key={index} className="flex gap-2 text-xs leading-relaxed">
          {item.kind === "step" ? (
            <>
              <span className="mt-px shrink-0 rounded-md bg-brand-purple/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-brand-purple uppercase">
                {t.has(`step_${item.step}`) ? t(`step_${item.step}`) : item.step}
              </span>
              <span className="text-muted-foreground">{item.text}</span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              {item.state === "running" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : item.state === "ok" ? (
                <Check className="size-3.5 text-primary" aria-hidden="true" />
              ) : (
                <TriangleAlert className="size-3.5" aria-hidden="true" />
              )}
              {item.tool === "getVerse" ? (
                <BookOpenText className="size-3.5" aria-hidden="true" />
              ) : (
                <Search className="size-3.5" aria-hidden="true" />
              )}
              <span>
                {t.has(`tool_${item.tool}`) ? t(`tool_${item.tool}`, { input: item.input }) : item.tool}
                {item.state === "failed" && <> — {t("tool_failed")}</>}
              </span>
            </span>
          )}
        </li>
      ))}
    </ol>
  );

  if (streaming) {
    return (
      <div className="flex flex-col gap-3">
        {list}
        <p className="flex items-center gap-2 text-sm font-medium text-brand-purple" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t("reflecting")}
        </p>
      </div>
    );
  }

  return (
    <details className="group rounded-lg border border-border/70 bg-card/60 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span>
          {t("how")} · {t("thought_count", { count: message.trace.length })}
        </span>
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-3">{list}</div>
    </details>
  );
}

/** Paragraphs, line breaks and **bold** — the only formatting the prompt allows. */
function AnswerText({ text }) {
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-foreground">
      {text.split(/\n{2,}/).map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line">
          {paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, partIndex) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={partIndex} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      ))}
    </div>
  );
}

function Sources({ t, sources }) {
  return (
    <div className="border-t border-border/70 pt-3">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t("sources")}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40"
            >
              {source.label}
              <ExternalLink className="size-3 text-muted-foreground" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
