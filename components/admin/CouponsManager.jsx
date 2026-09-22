"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/site/Panel";
import {
  createCoupon,
  deleteCoupon,
  setCouponActive,
} from "@/app/[locale]/admin/coupons/actions";

const EMPTY = { code: "", percentOff: "100", maxUses: "", note: "" };

/**
 * Make a code, then switch it off when the offer ends.
 *
 * The percentage starts at 100 because a free seat is what codes are mostly
 * for. A code cannot be edited after it is made — a seat already confirmed
 * with it recorded the percentage it got, and a code whose meaning changes
 * under people is confusing. Switch it off and make another.
 */
export function CouponsManager({ coupons }) {
  const t = useTranslations("admin");
  const [items, setItems] = useState(coupons);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const set = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  function handleCreate(event) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createCoupon(form);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setItems((prev) => [result.coupon, ...prev]);
        setForm(EMPTY);
        toast.success(t("coupon_created", { code: result.coupon.code }));
      } catch {
        toast.error(t("save_failed"));
      }
    });
  }

  function handleToggle(id, active) {
    setItems((prev) => prev.map((c) => (c._id === id ? { ...c, active } : c)));
    startTransition(async () => {
      try {
        await setCouponActive(id, active);
      } catch {
        toast.error(t("save_failed"));
        setItems((prev) => prev.map((c) => (c._id === id ? { ...c, active: !active } : c)));
      }
    });
  }

  function handleDelete(coupon) {
    if (!window.confirm(t("coupon_delete_confirm", { code: coupon.code }))) return;
    startTransition(async () => {
      try {
        const result = await deleteCoupon(coupon._id);
        if (!result.ok) {
          toast.error(t(result.error));
          return;
        }
        setItems((prev) => prev.filter((c) => c._id !== coupon._id));
      } catch {
        toast.error(t("save_failed"));
      }
    });
  }

  async function copy(code) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("coupon_copied"));
    } catch {
      /* Clipboard blocked — the code is on screen to copy by hand. */
    }
  }

  return (
    <>
      <Panel className="mt-8 p-6 md:p-8">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <p className="font-semibold text-foreground">{t("coupon_new")}</p>

          <div className="grid gap-4 sm:grid-cols-[1.4fr_0.7fr_0.7fr]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-code" className="text-muted-foreground">{t("coupon_code")}</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                autoComplete="off"
                spellCheck={false}
                placeholder="DYSFREE"
                className="h-11 font-mono uppercase"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-percent" className="text-muted-foreground">{t("coupon_percent")}</Label>
              <Input
                id="coupon-percent"
                type="number"
                min={1}
                max={100}
                inputMode="numeric"
                value={form.percentOff}
                onChange={set("percentOff")}
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-max" className="text-muted-foreground">{t("coupon_max")}</Label>
              <Input
                id="coupon-max"
                type="number"
                min={1}
                inputMode="numeric"
                value={form.maxUses}
                onChange={set("maxUses")}
                placeholder={t("coupon_unlimited")}
                className="h-11"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-note" className="text-muted-foreground">{t("coupon_note")}</Label>
            <Input
              id="coupon-note"
              value={form.note}
              onChange={set("note")}
              maxLength={120}
              placeholder={t("coupon_note_placeholder")}
              className="h-11"
            />
          </div>

          {error ? (
            <p className="text-sm font-medium text-destructive">{t(error)}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("coupon_hint")}</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isPending || !form.code.trim()}
            className="self-start rounded-full"
          >
            {t("coupon_create")}
          </Button>
        </form>
      </Panel>

      <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("coupon_empty")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-muted-foreground">
                <th className="px-4 py-3 text-start font-medium">{t("coupon_code")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("coupon_discount")}</th>
                <th className="px-4 py-3 text-end font-medium">{t("coupon_used")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("coupon_note")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("coupon_active")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((coupon) => {
                const usedUp = coupon.maxUses && coupon.uses >= coupon.maxUses;
                return (
                  <tr key={coupon._id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => copy(coupon.code)}
                        className="inline-flex items-center gap-1.5 font-mono font-semibold text-foreground hover:text-primary"
                        title={t("coupon_copy")}
                      >
                        {coupon.code}
                        <Copy className="size-3.5 opacity-50" aria-hidden="true" />
                      </button>
                      {usedUp && (
                        <Badge variant="secondary" className="ms-2 text-[10px]">
                          {t("coupon_used_up")}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end font-semibold tabular-nums">
                      {coupon.percentOff === 100 ? t("coupon_free") : `${coupon.percentOff}%`}
                    </td>
                    <td className="px-4 py-3 text-end tabular-nums text-muted-foreground">
                      {coupon.uses}
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                    </td>
                    <td className="max-w-[16rem] truncate px-4 py-3 text-muted-foreground">{coupon.note || "—"}</td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={coupon.active}
                        disabled={isPending}
                        onCheckedChange={(v) => handleToggle(coupon._id, v)}
                        aria-label={t("coupon_active")}
                      />
                    </td>
                    <td className="px-4 py-3 text-end">
                      {coupon.uses === 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isPending}
                          onClick={() => handleDelete(coupon)}
                          aria-label={t("coupon_delete")}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
