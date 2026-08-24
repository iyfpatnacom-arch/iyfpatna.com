"use client";

import { useLocale, useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GlassCard } from "@/components/glass/GlassCard";

export function DashboardTabs({ quizScores, registrations, japaLogs }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const totalRounds = japaLogs.reduce((sum, log) => sum + (log.rounds ?? 0), 0);

  return (
    <Tabs defaultValue="registrations" className="mt-8">
      <TabsList className="bg-glass/5">
        <TabsTrigger value="registrations">{t("tabs_registrations")}</TabsTrigger>
        <TabsTrigger value="quiz">{t("tabs_quiz")}</TabsTrigger>
        <TabsTrigger value="japa">{t("tabs_japa")}</TabsTrigger>
      </TabsList>

      <TabsContent value="registrations" className="mt-6 flex flex-col gap-3">
        {registrations.length === 0 ? (
          <p className="text-foreground/50">{t("empty_registrations")}</p>
        ) : (
          registrations.map((reg) => (
            <GlassCard key={reg._id} className="flex items-center justify-between p-4">
              <span className="font-medium text-foreground">
                {reg.itemTitle?.[locale] ?? reg.itemTitle?.en}
              </span>
              <Badge
                className={
                  reg.status === "attended"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : reg.status === "missed"
                      ? "bg-red-500/15 text-red-300"
                      : "bg-brand-gold/15 text-gold-ink"
                }
              >
                {t(`status_${reg.status}`)}
              </Badge>
            </GlassCard>
          ))
        )}
      </TabsContent>

      <TabsContent value="quiz" className="mt-6 flex flex-col gap-3">
        {quizScores.length === 0 ? (
          <p className="text-foreground/50">{t("empty_quiz")}</p>
        ) : (
          quizScores.map((score) => (
            <GlassCard key={score._id} className="flex items-center justify-between p-4">
              <span className="text-foreground">Chapter {score.chapter}</span>
              <span className="font-bold text-gold-ink">
                {score.score}/{score.total}
              </span>
            </GlassCard>
          ))
        )}
      </TabsContent>

      <TabsContent value="japa" className="mt-6">
        <GlassCard className="flex items-center justify-between p-6">
          <span className="text-foreground/70">Rounds (last 30 days)</span>
          <span className="text-2xl font-extrabold text-foreground">{totalRounds}</span>
        </GlassCard>
      </TabsContent>
    </Tabs>
  );
}
