"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { GlassModal } from "@/components/glass/GlassModal";
import { ClerkAutofillBridge } from "./ClerkAutofillBridge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
  note: z.string().trim().optional(),
});

export function JoinModal({ open, onOpenChange, item, itemType, clerkConfigured }) {
  const t = useTranslations("programs");
  const locale = useLocale();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const handleAutofill = useCallback(
    (data) => {
      if (data.name) setValue("name", data.name);
      if (data.email) setValue("email", data.email);
      if (data.phone) setValue("phone", data.phone);
    },
    [setValue]
  );

  async function onSubmit(values) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType,
          itemId: item._id,
          locale,
          ...values,
        }),
      });
      if (!res.ok) throw new Error("failed");
      toast.success(t("success_title"), { description: t("success_body") });
      reset();
      onOpenChange(false);
    } catch {
      toast.error(t("error_body"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <GlassModal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? t("modal_title", { title: item.title[locale] }) : ""}
    >
      {clerkConfigured && <ClerkAutofillBridge onAutofill={handleAutofill} />}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className="text-foreground/70">
            {t("form_name")}
          </Label>
          <Input id="name" {...register("name")} className="border-glass/15 bg-glass/5 text-foreground" />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-foreground/70">
            {t("form_email")}
          </Label>
          <Input id="email" type="email" {...register("email")} className="border-glass/15 bg-glass/5 text-foreground" />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone" className="text-foreground/70">
            {t("form_phone")}
          </Label>
          <Input id="phone" type="tel" {...register("phone")} className="border-glass/15 bg-glass/5 text-foreground" />
          {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="note" className="text-foreground/70">
            {t("form_note")}
          </Label>
          <Textarea id="note" {...register("note")} className="border-glass/15 bg-glass/5 text-foreground" rows={2} />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-2xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-6 py-3.5 text-sm font-bold text-brand-ink disabled:opacity-60"
        >
          {submitting ? t("form_submitting") : t("form_submit")}
        </button>
      </form>
    </GlassModal>
  );
}
