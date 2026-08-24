"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GlassCard } from "@/components/glass/GlassCard";
import { JoinModal } from "./JoinModal";

export function ProgramsList({ items, itemType, clerkConfigured, registrationsOpen }) {
  const t = useTranslations(itemType === "course" ? "courses" : "programs");
  const locale = useLocale();
  const [joinItem, setJoinItem] = useState(null);

  if (items.length === 0) {
    return <p className="mt-10 text-center text-foreground/50">{t("empty")}</p>;
  }

  return (
    <>
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <GlassCard key={item._id} className="flex flex-col overflow-hidden p-0">
            {item.image && (
              <img
                src={item.image}
                alt={item.title[locale]}
                className="h-44 w-full object-cover"
              />
            )}
            <div className="flex flex-1 flex-col gap-2 p-5">
              <h3 className="text-lg font-bold text-foreground">{item.title[locale]}</h3>
              <p className="flex-1 text-sm text-foreground/55">{item.description[locale]}</p>
              <p className="text-xs font-semibold text-gold-ink">
                {itemType === "course" ? item.duration[locale] : item.schedule[locale]}
              </p>
              {itemType === "program" && item.location?.[locale] && (
                <p className="text-xs text-foreground/45">{item.location[locale]}</p>
              )}
              <button
                onClick={() => setJoinItem(item)}
                disabled={!registrationsOpen}
                className="mt-2 rounded-xl bg-gradient-to-br from-brand-gold-light to-brand-gold px-4 py-2.5 text-sm font-bold text-brand-ink disabled:opacity-40"
              >
                {registrationsOpen ? t("join_button") : t("closed_button")}
              </button>
            </div>
          </GlassCard>
        ))}
      </div>

      <JoinModal
        open={!!joinItem}
        onOpenChange={(v) => !v && setJoinItem(null)}
        item={joinItem}
        itemType={itemType}
        clerkConfigured={clerkConfigured}
      />
    </>
  );
}
