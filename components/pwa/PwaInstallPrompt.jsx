"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, Download } from "lucide-react";
import { Panel } from "@/components/site/Panel";

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
      <Panel className="flex items-start gap-3 p-4 shadow-lg">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Download className="h-4 w-4" />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{t("install_title")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("install_body")}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={install}
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              {t("install_cta")}
            </button>
            <button
              onClick={dismiss}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
            >
              {t("install_dismiss")}
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </Panel>
    </div>
  );
}
