"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startPayment } from "@/lib/payments/redirect";

const KNOWN_ERRORS = ["rate_limited", "not_found", "payment_unavailable", "network", "generic"];

/**
 * Re-opens the billing page for an order that has not been paid for — a
 * declined card, a cancelled checkout, a dropped connection. The order and its
 * ID stay the same; only the payment attempt is new.
 */
export function PayNowButton({ orderId, token, label }) {
  const t = useTranslations("order");
  const tc = useTranslations("checkout");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    const result = await startPayment({ orderId, token, lang: locale });
    // On success the browser is already leaving, so the button stays busy
    // rather than flashing back to idle.
    if (result.ok) return;
    setBusy(false);
    const key = KNOWN_ERRORS.includes(result.error) ? result.error : "generic";
    toast.error(tc(`errors.${key}`));
  }

  return (
    <Button
      type="button"
      onClick={pay}
      disabled={busy}
      className="h-12 w-full rounded-full text-base font-semibold shadow-lg shadow-primary/25"
    >
      {busy ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {t("redirecting")}
        </>
      ) : (
        <>
          <CreditCard className="size-4" aria-hidden="true" />
          {label}
        </>
      )}
    </Button>
  );
}
