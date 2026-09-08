"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { Users } from "lucide-react";
import { Panel } from "@/components/site/Panel";

/**
 * The screen at the door.
 *
 * Meant to be put on a laptop, a TV or a printed-out tablet at the entrance,
 * so everything is sized to be scanned from a metre away and read from three.
 * The QR is redrawn every minute with a fresh token, and the six digits under
 * it rotate with it — a photograph of this screen is useless within about two
 * minutes, which is the entire reason attendance recorded this way means
 * anything.
 *
 * The QR is rendered to a canvas in the browser rather than fetched as an
 * image, so the screen keeps rotating codes even if the venue's wifi drops
 * after the page has loaded — and no third-party QR service ever sees the
 * check-in URLs.
 */
export function CheckInDisplay({ programId, programTitle, origin }) {
  const t = useTranslations("playground.checkin");
  const locale = useLocale();
  const canvasRef = useRef(null);

  const [state, setState] = useState(null);
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/checkin/display?programId=${encodeURIComponent(programId)}`
      );
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      setState(data);
      setError(false);
      setSeconds(Math.ceil(data.rotatesInMs / 1000));
    } catch {
      setError(true);
    }
  }, [programId]);

  /* First fetch, then one every twenty seconds so the screen never drifts more
     than that behind a rotation.

     The lint rule below sees `refresh` reaching a `setState` and assumes a
     cascading render. It is an async function whose first statement is an
     `await fetch`, so nothing is set synchronously — this is the "subscribe to
     an external system and set state in the callback" shape the rule exists to
     protect, and polling an endpoint is exactly what an effect is for. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const id = setInterval(refresh, 20_000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((current) => (current <= 1 ? 60 : current - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Draw whenever the token changes.
  useEffect(() => {
    if (!state?.token || !canvasRef.current) return;
    const url = `${origin}/${locale}/check-in/${programId}/${state.token}`;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      // Fixed black on white regardless of theme: a QR needs contrast and a
      // quiet zone far more than it needs to match the page.
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => setError(true));
  }, [state?.token, origin, locale, programId]);

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">{programTitle}</p>
        <h2 className="mt-1 text-2xl font-semibold text-foreground">
          {t("scan_title")}
        </h2>

        <div className="mt-6 inline-block rounded-2xl bg-white p-4">
          <canvas ref={canvasRef} className="block size-80 max-w-full" />
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{t("code_label")}</p>
        <p className="mt-1 text-5xl font-semibold tracking-[0.2em] tabular-nums text-foreground">
          {state?.code ?? "······"}
        </p>

        <p className="mt-4 text-xs text-muted-foreground tabular-nums">
          {error ? t("error_generic") : t("host_refresh_in", { count: seconds })}
        </p>
      </Panel>

      <Panel className="p-5">
        <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Users className="size-5 text-primary" aria-hidden="true" />
          {t("host_count", { count: state?.count ?? 0 })}
        </p>

        {state?.recent?.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {t("host_recent")}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {state.recent.map((person, index) => (
                <li
                  key={`${person.name}-${index}`}
                  className="rounded-full border border-border bg-card/50 px-3 py-1 text-sm text-foreground"
                >
                  {person.name}
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>
    </div>
  );
}
