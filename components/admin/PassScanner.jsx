"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, CameraOff, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/site/Panel";
import { AdmitResult } from "@/components/admin/AdmitResult";
import { admitByOrderId, admitPass } from "@/app/[locale]/admin/registrations/actions";

/**
 * The gate: point the camera at pass after pass, like a cinema usher.
 *
 * Decoding uses the browser's own `BarcodeDetector` — built into Chrome on
 * Android, which is what the volunteers carry — so there is no scanning
 * library to ship. Where it is missing (iOS Safari, Firefox) the camera
 * section explains the fallback: the phone's own camera app opens the pass
 * link directly, and that page admits them just the same. The typed order ID
 * works everywhere.
 *
 * The camera never stops between people. Each code is ignored for a few
 * seconds after it is read, so a pass held in front of the lens is admitted
 * once rather than every frame.
 */

const SCAN_EVERY_MS = 250;
const SAME_CODE_COOLDOWN_MS = 4000;

/** Pulls { orderId, token } out of whatever a pass QR contains. */
function parsePass(raw) {
  try {
    const url = new URL(String(raw).trim());
    const match = url.pathname.match(/\/admin\/registrations\/admit\/([^/?#]+)/);
    if (!match) return null;
    return {
      orderId: decodeURIComponent(match[1]),
      token: url.searchParams.get("t") || "",
    };
  } catch {
    return null;
  }
}

function feedback(status) {
  try {
    navigator.vibrate?.(status === "admitted" ? 120 : [80, 60, 80, 60, 80]);
  } catch {
    /* Vibration is a nicety. */
  }
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.frequency.value = status === "admitted" ? 880 : 220;
    gain.gain.value = 0.08;
    tone.connect(gain).connect(context.destination);
    tone.start();
    tone.stop(context.currentTime + (status === "admitted" ? 0.12 : 0.35));
    tone.onended = () => context.close();
  } catch {
    /* So is sound. */
  }
}

export function PassScanner() {
  const t = useTranslations("admin");
  const locale = useLocale();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastRef = useRef({ value: "", at: 0 });
  const workingRef = useRef(false);

  const [supported, setSupported] = useState(null);
  const [running, setRunning] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [result, setResult] = useState(null);
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(0);

  // Decided after mount: the server has no `window` to ask.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  const report = useCallback((outcome) => {
    setResult(outcome);
    feedback(outcome?.status);
    if (outcome?.status === "admitted") setCount((current) => current + 1);
  }, []);

  const handleCode = useCallback(
    async (raw) => {
      const now = Date.now();
      if (raw === lastRef.current.value && now - lastRef.current.at < SAME_CODE_COOLDOWN_MS) return;
      lastRef.current = { value: raw, at: now };

      const pass = parsePass(raw);
      if (!pass) {
        report({ status: "invalid" });
        return;
      }

      workingRef.current = true;
      try {
        report(await admitPass(pass.orderId, pass.token, locale));
      } catch {
        report({ status: "invalid" });
      } finally {
        workingRef.current = false;
      }
    },
    [locale, report]
  );

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(async () => {
    setCameraError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setRunning(true);
    } catch {
      setCameraError(true);
      stop();
    }
  }, [stop]);

  /* The scan loop, alive only while the camera is. */
  useEffect(() => {
    if (!running || !supported) return;
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    let cancelled = false;

    const id = setInterval(async () => {
      const video = videoRef.current;
      if (cancelled || workingRef.current || !video || video.readyState < 2) return;
      try {
        const codes = await detector.detect(video);
        if (!cancelled && codes[0]?.rawValue) handleCode(codes[0].rawValue);
      } catch {
        /* A frame that could not be read; the next one will be. */
      }
    }, SCAN_EVERY_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [running, supported, handleCode]);

  useEffect(() => stop, [stop]);

  async function onTyped(event) {
    event.preventDefault();
    const value = typed.trim().toUpperCase();
    if (!value) return;
    setSubmitting(true);
    try {
      report(await admitByOrderId(value, locale));
      setTyped("");
    } catch {
      report({ status: "invalid" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-5">
        <Panel className="overflow-hidden p-0">
          <div className="relative aspect-square w-full bg-black sm:aspect-[4/3]">
            <video
              ref={videoRef}
              playsInline
              muted
              className={running ? "size-full object-cover" : "hidden"}
            />
            {running ? (
              <div
                className="pointer-events-none absolute inset-[18%] rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                aria-hidden="true"
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/80">
                <div>
                  <Camera className="mx-auto size-10 opacity-70" aria-hidden="true" />
                  <p className="mt-3 max-w-xs text-sm">
                    {supported === false
                      ? t("scan_unsupported")
                      : cameraError
                        ? t("scan_camera_error")
                        : t("scan_idle")}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground tabular-nums">
              {t("scan_count", { count })}
            </p>
            {running ? (
              <Button variant="outline" className="rounded-full" onClick={stop}>
                <CameraOff className="size-4" aria-hidden="true" />
                {t("scan_stop")}
              </Button>
            ) : (
              <Button className="rounded-full" onClick={start} disabled={supported === false}>
                <Camera className="size-4" aria-hidden="true" />
                {t("scan_start")}
              </Button>
            )}
          </div>
        </Panel>

        <Panel className="p-4">
          <form onSubmit={onTyped} className="flex flex-col gap-2">
            <label htmlFor="typed-order" className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Keyboard className="size-4 text-muted-foreground" aria-hidden="true" />
              {t("scan_type_label")}
            </label>
            <div className="flex gap-2">
              <Input
                id="typed-order"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="DYS-101"
                autoCapitalize="characters"
                autoComplete="off"
                className="h-10 font-mono uppercase"
              />
              <Button type="submit" className="h-10 rounded-lg" disabled={submitting || !typed.trim()}>
                {t("scan_type_submit")}
              </Button>
            </div>
          </form>
        </Panel>
      </div>

      <div className="lg:sticky lg:top-24">
        {result ? (
          <AdmitResult result={result} />
        ) : (
          <Panel className="p-8 text-center text-sm text-muted-foreground">{t("scan_waiting")}</Panel>
        )}
      </div>
    </div>
  );
}
