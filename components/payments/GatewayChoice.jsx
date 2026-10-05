"use client";

import { useTranslations } from "next-intl";
import { Building2, ChevronRight, CreditCard, Smartphone, Wallet } from "lucide-react";
import { Modal } from "@/components/site/Modal";
import { cn } from "@/lib/utils";

/**
 * Which gateway to pay through — Razorpay or CCAvenue.
 *
 * The two do not accept the same things: Razorpay takes cards, net banking and
 * UPI, CCAvenue only net banking and wallets. Someone who picks the narrower
 * one expecting to scan a UPI QR and finds none would simply give up, so each
 * option spells out what it accepts, drawn from the methods the server sent
 * (`GATEWAYS` in `lib/payments/gateways.js`) rather than written out here —
 * the labels cannot drift from what the merchant accounts actually take.
 *
 * One tap, not a radio button and a Continue: the customer has already pressed
 * a pay button to get here, and asking them to confirm a choice twice is how a
 * checkout loses people. So the choice is only ever put to them when there is
 * a real one — `GatewayModal` renders nothing with a single gateway on offer,
 * and callers skip straight to it.
 */

const METHOD_ICONS = {
  card: CreditCard,
  netbanking: Building2,
  upi: Smartphone,
  wallet: Wallet,
};

/** The options on their own, for a caller that brings its own dialog. */
export function GatewayOptions({ gateways, onPick, disabled = false }) {
  const t = useTranslations("checkout");

  return (
    <div className="flex flex-col gap-2.5">
      {gateways.map((gateway, index) => (
        <button
          key={gateway.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(gateway.id)}
          className={cn(
            "flex items-center gap-3 rounded-xl border p-3.5 text-start transition-colors",
            "hover:border-primary/50 hover:bg-primary/5",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            // The first option is the one we want taken, and a border says so
            // before anybody reads a word of it.
            index === 0 ? "border-primary/40 bg-primary/5" : "border-input",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{t(`gateways.${gateway.id}.name`)}</span>
              {index === 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                  {t("gateway_recommended")}
                </span>
              )}
            </span>

            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {gateway.methods.map((method) => {
                const Icon = METHOD_ICONS[method];
                return (
                  <span
                    key={method}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    {Icon && <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
                    {t(`methods.${method}`)}
                  </span>
                );
              })}
            </span>

            <span className="text-[11px] leading-relaxed text-muted-foreground/80">
              {t(`gateways.${gateway.id}.note`)}
            </span>
          </span>

          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/**
 * The choice as a dialog of its own, for anywhere that is not already inside
 * one (the "pay now" button on an order's status page).
 */
export function GatewayModal({ open, onOpenChange, gateways, onPick, disabled = false }) {
  const t = useTranslations("checkout");

  if (!gateways || gateways.length < 2) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("gateway_title")}
      description={t("gateway_description")}
      className="max-w-[calc(100%-2rem)] sm:max-w-md"
    >
      <div className="pt-1">
        <GatewayOptions gateways={gateways} onPick={onPick} disabled={disabled} />
      </div>
    </Modal>
  );
}
