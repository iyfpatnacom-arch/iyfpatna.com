"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { Play, Pause } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";
import { cn } from "@/lib/utils";

export function KirtanPlayer({ tracks }) {
  const locale = useLocale();
  const audioRef = useRef(null);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    function onEnded() {
      setPlayingId(null);
    }
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  function toggle(track) {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === track._id) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    audio.src = track.audioUrl;
    audio.play();
    setPlayingId(track._id);
  }

  return (
    <div className="mt-8 flex flex-col gap-3">
      <audio ref={audioRef} />
      {tracks.map((track) => {
        const isPlaying = playingId === track._id;
        return (
          <GlassCard
            key={track._id}
            className="flex items-center gap-4 p-3"
          >
            {track.coverImage && (
              <img
                src={track.coverImage}
                alt=""
                className="h-14 w-14 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-foreground">{track.title[locale]}</p>
              {track.artist && (
                <p className="truncate text-xs text-foreground/50">{track.artist}</p>
              )}
            </div>
            <button
              onClick={() => toggle(track)}
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-full",
                isPlaying
                  ? "bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-ink"
                  : "border border-glass/15 text-foreground"
              )}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          </GlassCard>
        );
      })}
    </div>
  );
}
