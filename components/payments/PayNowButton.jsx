"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CreditCard, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startPayment } from "@/lib/payments/redirect";
import { GatewayModal } from "@/components/payments/GatewayChoice";

const KNOWN_ERRORS = ["rate_limited", "not_found", "payment_unavailable", "network", "generic"];

/**
 * Re-opens the checkout for an order that has not been paid for — a
 * declined card, a cancelled checkout, a dropped connection. The order and its
 * ID stay the same; only the payment attempt is new.
 *
 * Serves a course seat and a donation alike; `kind` says which, and only so the
 * server can skip a lookup.
 *
 * `gateways` is what this payment may be paid through (empty, or one, for a
 * payment with no choice to make). It matters most here of all: the commonest
 * reason to be on this page is a payment that failed, and the second gateway
 * is the obvious thing to try next.
 */
export function PayNowButton({ orderId, token, label, kind = "course", gateways = [] }) {
  const t = useTranslations("order");
  const tc = useTranslations("checkout");
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);

  /* More than one way to pay means the question is worth asking; one means it
     is not, and the single gateway is simply used. */
  const choice = gateways.length > 1;

  async function pay(gateway) {
    setBusy(true);
    const result = await startPayment({ orderId, token, kind, lang: locale, gateway });
    // On success the browser is already leaving, so the button stays busy
    // rather than flashing back to idle.
    if (result.ok) return;
    setBusy(false);
    setAsking(false);
    if (result.cancelled) return;
    const key = KNOWN_ERRORS.includes(result.error) ? result.error : "generic";
    toast.error(tc(`errors.${key}`));
  }

  return (
    <>
      <Button
        type="button"
        animatedBorder
        onClick={() => (choice ? setAsking(true) : pay(gateways[0]?.id))}
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

      <GatewayModal
        open={asking}
        // Not while the browser is on its way to a gateway.
        onOpenChange={(next) => !busy && setAsking(next)}
        gateways={gateways}
        onPick={pay}
        disabled={busy}
      />
    </>
  );
}
