import { setRequestLocale, getTranslations } from "next-intl/server";
import { clerkConfigured } from "@/lib/auth-config";
import { ProgramsList } from "@/components/programs/ProgramsList";
import { routing } from "@/i18n/routing";
import { FALLBACK_COURSES } from "@/lib/site-config";

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "courses" });
  return { title: t("title"), description: t("subtitle") };
}

/** Same contract as the programs loader — see the note there. */
async function loadCourses() {
  try {
    const { dbConnect } = await import("@/lib/db/connect");
    const { default: Course } = await import("@/models/Course");
    const { toPlain } = await import("@/lib/serialize");
    const { getFlag } = await import("@/lib/flags");

    await dbConnect();
    const [courses, registrationsOpen] = await Promise.all([
      Course.find({ isActive: true }).sort({ order: 1 }).lean(),
      getFlag("registrations.programsOpen", true),
    ]);

    const items = toPlain(courses);
    return {
      items: items.length ? items : FALLBACK_COURSES,
      registrationsOpen,
    };
  } catch (error) {
    console.warn("[courses] database unavailable, using fallback:", error.message);
    return { items: FALLBACK_COURSES, registrationsOpen: true };
  }
}

export default async function CoursesPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("courses");
  const { items, registrationsOpen } = await loadCourses();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        {t("subtitle")}
      </p>

      <ProgramsList
        items={items}
        itemType="course"
        clerkConfigured={clerkConfigured}
        registrationsOpen={registrationsOpen}
      />
    </div>
  );
}
