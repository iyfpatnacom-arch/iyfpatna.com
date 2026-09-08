"use client";

import { useLocale, useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/site/Panel";

export function DashboardTabs({ quizScores, registrations, japaLogs }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  const totalRounds = japaLogs.reduce((sum, log) => sum + (log.rounds ?? 0), 0);

  return (
    <Tabs defaultValue="registrations" className="mt-8">
      <TabsList>
        <TabsTrigger value="registrations">{t("tabs_registrations")}</TabsTrigger>
        <TabsTrigger value="quiz">{t("tabs_quiz")}</TabsTrigger>
        <TabsTrigger value="japa">{t("tabs_japa")}</TabsTrigger>
      </TabsList>

      <TabsContent value="registrations" className="mt-6 flex flex-col gap-3">
        {registrations.length === 0 ? (
          <p className="text-muted-foreground">{t("empty_registrations")}</p>
        ) : (
          registrations.map((reg) => (
            <Panel key={reg._id} className="flex items-center justify-between p-4">
              <span className="font-medium text-foreground">
                {reg.itemTitle?.[locale] ?? reg.itemTitle?.en}
              </span>
              <Badge
                className={
                  reg.status === "attended"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : reg.status === "missed"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary"
                }
              >
                {t(`status_${reg.status}`)}
              </Badge>
            </Panel>
          ))
        )}
      </TabsContent>

      <TabsContent value="quiz" className="mt-6 flex flex-col gap-3">
        {quizScores.length === 0 ? (
          <p className="text-muted-foreground">{t("empty_quiz")}</p>
        ) : (
          quizScores.map((score) => (
            <Panel key={score._id} className="flex items-center justify-between p-4">
              <span className="text-foreground">Chapter {score.chapter}</span>
              <span className="font-semibold tabular-nums text-primary">
                {score.score}/{score.total}
              </span>
            </Panel>
          ))
        )}
      </TabsContent>

      <TabsContent value="japa" className="mt-6">
        <Panel className="flex items-center justify-between p-6">
          <span className="text-muted-foreground">Rounds (last 30 days)</span>
          <span className="text-2xl font-semibold tabular-nums text-foreground">{totalRounds}</span>
        </Panel>
      </TabsContent>
    </Tabs>
  );
}
