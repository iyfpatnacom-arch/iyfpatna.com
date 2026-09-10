"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useLocale, useTranslations } from "next-intl";

import { Panel } from "@/components/site/Panel";

/**
 * A printable QR for a place's own page.
 *
 * This is the answer to the problem GPS cannot solve. Inside a masonry temple
 * a phone's fix is tens of metres wide on a campus ninety metres across, so
 * "you are here" is a coin flip indoors. A code on the signboard by the door is
 * not: whoever scans it was standing at that sign, which is a better position
 * fix than any satellite will give them in there, and it costs a sheet of
 * paper.
 *
 * Drawn to a canvas in the browser rather than fetched from a QR service, the
 * same decision `components/admin/CheckInDisplay.jsx` already made: no third
 * party learns the campus's URLs, and it keeps working when the temple's wifi
 * does not.
 *
 * The URL is built from `window.location.origin` rather than from
 * `NEXT_PUBLIC_SITE_URL`, so a code generated while previewing a deployment
 * points at that deployment instead of silently sending everyone to production.
 * That means it can only be drawn after mount, which is why the canvas starts
 * as a reserved empty box rather than appearing and shifting the page.
 */
export function PlaceQr({ placeKey }) {
  const t = useTranslations("campus");
  const locale = useLocale();
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const url = `${window.location.origin}/${locale}/campus/${placeKey}`;

    QRCode.toCanvas(canvasRef.current, url, {
      width: 220,
      margin: 1,
      // "M" recovers from about 15% damage — the right level for something
      // that will be taped to a wall in a courtyard and rained on.
      errorCorrectionLevel: "M",
      // Fixed black on white, never the theme's tokens. A QR printed in dark
      // mode's colours is a low-contrast rectangle that no scanner will read,
      // and this canvas exists to be printed.
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => setFailed(true));
  }, [locale, placeKey]);

  if (failed) return null;

  return (
    <Panel className="p-5">
      <h2 className="text-sm font-semibold text-foreground">{t("qr_title")}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {t("qr_body")}
      </p>
      <div className="mt-4 w-fit rounded-xl bg-white p-3">
        <canvas ref={canvasRef} width={220} height={220} className="block" />
      </div>
    </Panel>
  );
}
