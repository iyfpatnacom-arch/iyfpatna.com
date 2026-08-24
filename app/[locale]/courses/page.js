import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
import { dbConnect } from "@/lib/db/connect";
import Course from "@/models/Course";
import { toPlain } from "@/lib/serialize";
import { clerkConfigured } from "@/lib/auth-config";
import { getFlag } from "@/lib/flags";
import { ProgramsList } from "@/components/programs/ProgramsList";

export default async function CoursesPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("courses");

  await dbConnect();
  const [courses, registrationsOpen] = await Promise.all([
    Course.find({ isActive: true }).sort({ order: 1 }).lean(),
    getFlag("registrations.programsOpen", true),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-10 md:py-20">
      <span className="text-xs font-bold uppercase tracking-widest text-gold-ink">
        {t("eyebrow")}
      </span>
      <h1 className="mt-3 text-3xl font-extrabold text-foreground md:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-xl text-foreground/60">{t("subtitle")}</p>

      <ProgramsList
        items={toPlain(courses)}
        itemType="course"
        clerkConfigured={clerkConfigured}
        registrationsOpen={registrationsOpen}
      />
    </div>
  );
}
