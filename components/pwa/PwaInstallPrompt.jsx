"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Download } from "lucide-react";
import { GlassCard } from "@/components/glass/GlassCard";

const DISMISS_KEY = "iyf-pwa-install-dismissed";

export function PwaInstallPrompt() {
  const t = useTranslations("pwa");
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    function onBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80">
      <GlassCard className="flex items-start gap-3 p-4">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-gold-light to-brand-gold text-brand-ink">
          <Download className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground">{t("install_title")}</p>
          <p className="mt-1 text-xs text-foreground/60">{t("install_body")}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="rounded-xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-3 py-1.5 text-xs font-bold text-brand-ink"
            >
              {t("install_cta")}
            </button>
            <button
              onClick={dismiss}
              className="rounded-xl border border-glass/10 px-3 py-1.5 text-xs font-semibold text-foreground/70"
            >
              {t("install_dismiss")}
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-foreground/40">
          <X className="h-4 w-4" />
        </button>
      </GlassCard>
    </div>
  );
}
