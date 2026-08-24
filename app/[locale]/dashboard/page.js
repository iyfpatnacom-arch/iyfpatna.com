import { setRequestLocale, getTranslations } from "next-intl/server";
import { clerkConfigured, getOptionalAuth } from "@/lib/auth-config";
import { getFlag } from "@/lib/flags";
import { dbConnect } from "@/lib/db/connect";
import QuizScore from "@/models/QuizScore";
import Registration from "@/models/Registration";
import JapaLog from "@/models/JapaLog";
import { toPlain } from "@/lib/serialize";
import { GlassCard } from "@/components/glass/GlassCard";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");

  if (!clerkConfigured) {
    return <SetupNotice locale={locale} />;
  }

  const enabled = await getFlag("dashboard.enabled", false);
  if (!enabled) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <GlassCard className="p-10 text-foreground/60">
          The dashboard is coming soon.
        </GlassCard>
      </div>
    );
  }

  const { userId } = await getOptionalAuth();

  await dbConnect();
  const [quizScores, registrations, japaLogs] = await Promise.all([
    QuizScore.find({ clerkId: userId }).sort({ createdAt: -1 }).lean(),
    Registration.find({ clerkId: userId }).sort({ createdAt: -1 }).lean(),
    JapaLog.find({ clerkId: userId }).sort({ date: -1 }).limit(30).lean(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">{t("title")}</h1>
      <DashboardTabs
        quizScores={toPlain(quizScores)}
        registrations={toPlain(registrations)}
        japaLogs={toPlain(japaLogs)}
      />
    </div>
  );
}

function SetupNotice({ locale }) {
  return (
    <div className="mx-auto max-w-lg px-5 py-24 text-center">
      <GlassCard className="p-10">
        <p className="font-bold text-foreground">Accounts aren't set up yet</p>
        <p className="mt-2 text-sm text-foreground/55">
          Add Clerk publishable and secret keys to .env.local to enable
          sign-in and the dashboard.
        </p>
      </GlassCard>
    </div>
  );
}
