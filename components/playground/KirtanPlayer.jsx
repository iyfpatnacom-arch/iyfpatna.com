"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Music, Pause, Play, Repeat } from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { haptic } from "@/lib/playground/haptics";
import { isSynced, mergeTracks } from "@/lib/kirtan/library";
import { cn } from "@/lib/utils";

/**
 * The kirtan library, with the words scrolling in time.
 *
 * Two states, one component. When a track has a recording *and* timed lines,
 * the active line lights up and the sheet scrolls itself, and tapping any line
 * seeks the audio to it. When it has no recording — which is every track in the
 * built-in library — the same sheet renders as something to sing from, which is
 * the thing people actually need in a kirtan and the thing that is hardest to
 * find.
 *
 * Nothing here degrades to an empty state. A library that says "recordings are
 * being uploaded" is useless to someone holding a phone in a temple hall.
 */

const SCRIPT_OPTIONS = ["devanagari", "roman", "meaning"];

export function KirtanPlayer({ tracks: dbTracks = [] }) {
  const t = useTranslations("playground.kirtan");
  const locale = useLocale();

  const tracks = useMemo(() => mergeTracks(dbTracks), [dbTracks]);
  const [openId, setOpenId] = useState(null);

  const open = tracks.find((track) => track.id === openId) ?? null;

  if (open) {
    return (
      <TrackView
        t={t}
        locale={locale}
        track={open}
        onBack={() => setOpenId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {tracks.map((track) => (
        <button
          key={track.id}
          type="button"
          onClick={() => {
            haptic("confirm");
            setOpenId(track.id);
          }}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card/40 p-3 text-left transition-colors active:bg-muted/50"
        >
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10 text-primary">
            {track.coverImage ? (
              // A remote cover from the database — any https host is allowed
              // by next.config, and next/image gives it a real intrinsic size
              // so the row cannot shift as the thumbnail arrives.
              <Image
                src={track.coverImage}
                alt=""
                width={48}
                height={48}
                className="size-full object-cover"
              />
            ) : (
              <Music className="size-5" aria-hidden="true" />
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">
              {track.title[locale]}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {track.attribution
                ? track.attribution[locale]
                : t("lyrics")}
            </span>
          </span>

          {track.audioUrl && (
            <span className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground">
              <Play className="size-3.5" aria-hidden="true" />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- one track */

function TrackView({ t, locale, track, onBack }) {
  const audioRef = useRef(null);
  const lineRefs = useRef([]);

  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [loop, setLoop] = useState(false);
  const [script, setScript] = useState("devanagari");
  const [follow, setFollow] = useState(true);

  const synced = isSynced(track);

  /* Which line is being sung. The last line whose timestamp has passed —
     computed rather than tracked, so seeking backwards is correct for free. */
  const activeIndex = useMemo(() => {
    if (!synced) return -1;
    let found = -1;
    for (let index = 0; index < track.lines.length; index += 1) {
      if (track.lines[index].at <= position + 0.15) found = index;
      else break;
    }
    return found;
  }, [position, synced, track.lines]);

  // Keep the active line in view, unless the reader has scrolled away.
  useEffect(() => {
    if (!follow || activeIndex < 0) return;
    lineRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [activeIndex, follow]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const onTime = () => setPosition(audio.currentTime);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    haptic("bead");
    if (audio.paused) {
      audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false)
      );
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, []);

  const seekTo = useCallback(
    (seconds) => {
      const audio = audioRef.current;
      if (!audio || !synced) return;
      haptic("bead");
      audio.currentTime = seconds;
      setPosition(seconds);
      setFollow(true);
    },
    [synced]
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t("back_to_library")}
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground">
          {track.title[locale]}
        </h2>
        {track.attribution && (
          <p className="mt-1 text-sm text-muted-foreground">
            {track.attribution[locale]}
          </p>
        )}
      </div>

      {/* Script switcher. A kirtan is sung from whichever line the singer can
          read fastest, so this is not a preference panel — it is the control
          that decides whether someone can join in at all. */}
      <div className="flex gap-1 rounded-2xl border border-border bg-muted/30 p-1">
        {SCRIPT_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={script === option}
            onClick={() => {
              haptic("bead");
              setScript(option);
            }}
            className={cn(
              "min-h-10 flex-1 rounded-xl px-2 text-sm font-medium transition-colors",
              script === option
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            {option === "devanagari"
              ? t("script_devanagari")
              : option === "roman"
                ? t("script_roman")
                : t("meaning")}
          </button>
        ))}
      </div>

      {script === "meaning" ? (
        <Panel className="p-5">
          <p className="text-[15px] leading-relaxed text-foreground">
            {track.meaning
              ? track.meaning[locale]
              : track.lines
                  .map((line) => line.meaning?.[locale])
                  .filter(Boolean)
                  .join(" ") || t("no_meaning")}
          </p>
        </Panel>
      ) : (
        <Panel
          className="p-5"
          // Scrolling the sheet by hand means the reader wants to look
          // somewhere else; auto-scroll stops fighting them until they ask for
          // it back. Listening for the gesture rather than for scroll events,
          // because `scrollIntoView` fires those itself.
          onWheel={() => setFollow(false)}
          onTouchMove={() => setFollow(false)}
        >
          <ol className="flex flex-col gap-3">
            {track.lines.map((line, index) => {
              const active = index === activeIndex;
              const sung = synced && index < activeIndex;
              return (
                <li key={index} ref={(node) => (lineRefs.current[index] = node)}>
                  <button
                    type="button"
                    disabled={!synced}
                    onClick={() => seekTo(line.at)}
                    className={cn(
                      "w-full text-left transition-colors",
                      script === "devanagari"
                        ? "font-hindi text-xl leading-relaxed"
                        : "text-base leading-relaxed italic",
                      active
                        ? "font-semibold text-primary"
                        : sung
                          ? "text-muted-foreground/60"
                          : "text-foreground",
                      !synced && "cursor-default"
                    )}
                  >
                    {script === "devanagari" ? line.devanagari : line.roman}
                  </button>
                </li>
              );
            })}
          </ol>

          {synced && (
            <p className="mt-4 text-xs text-muted-foreground">{t("tap_line")}</p>
          )}
        </Panel>
      )}

      {track.audioUrl ? (
        <>
          <audio ref={audioRef} src={track.audioUrl} loop={loop} preload="metadata" />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              {playing ? (
                <Pause className="size-4" aria-hidden="true" />
              ) : (
                <Play className="size-4" aria-hidden="true" />
              )}
              {track.title[locale]}
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={loop}
              aria-label={t("loop")}
              onClick={() => {
                haptic("bead");
                setLoop((current) => !current);
              }}
              className={cn(
                "grid size-12 shrink-0 place-items-center rounded-full border transition-colors",
                loop
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              )}
            >
              <Repeat className="size-4" aria-hidden="true" />
            </button>
          </div>

          {synced && !follow && (
            <button
              type="button"
              onClick={() => setFollow(true)}
              className="mx-auto rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground"
            >
              {t("autoscroll")}
            </button>
          )}
        </>
      ) : (
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {t("no_audio")}
        </p>
      )}
    </div>
  );
}
