"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Panel } from "@/components/site/Panel";
import { AdmitResult } from "@/components/admin/AdmitResult";
import { admitPass } from "@/app/[locale]/admin/registrations/actions";

/**
 * Admits the pass this page was opened for, once, as soon as it loads.
 *
 * This is the path for a volunteer using the phone's ordinary camera app: the
 * QR is a link, the link opens here, and the admission happens without a
 * further tap. It is a POST from the browser rather than a write during the
 * page render so that nothing that merely *fetches* the URL — a link preview,
 * a prefetch — can ever mark someone present.
 *
 * The ref keeps React's development double-mount from sending a second
 * request, which would show "already admitted" for someone just let in.
 */
export function AdmitOnOpen({ orderId, token }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const sent = useRef(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    admitPass(orderId, token, locale)
      .then(setResult)
      .catch(() => setResult({ status: "invalid" }));
  }, [orderId, token, locale]);

  if (!result) {
    return (
      <Panel className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        {t("admit_checking")}
      </Panel>
    );
  }

  return <AdmitResult result={result} />;
}
