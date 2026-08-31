import { setRequestLocale, getTranslations } from "next-intl/server";
import { clerkConfigured } from "@/lib/auth-config";
import { ProgramsList } from "@/components/programs/ProgramsList";
import { routing } from "@/i18n/routing";
import { FALLBACK_PROGRAMS } from "@/lib/site-config";

/* Registrations can be closed from the admin flags table at any moment, so
   this cannot be baked in at build time. Short revalidation keeps the page
   fast while still picking the switch up within minutes. */
export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "programs" });
  return { title: t("title"), description: t("subtitle") };
}

/**
 * Loads programs, tolerating a missing database.
 *
 * The page used to call `dbConnect()` at module scope under `force-dynamic`,
 * so an unreachable database returned a 500 for a page whose entire job is to
 * tell people when to turn up. It now falls back to the standing weekly
 * programs and, on failure, assumes registrations are open — the join form
 * itself re-checks before writing anything.
 */
async function loadPrograms() {
  try {
    const { dbConnect } = await import("@/lib/db/connect");
    const { default: Program } = await import("@/models/Program");
    const { toPlain } = await import("@/lib/serialize");
    const { getFlag } = await import("@/lib/flags");

    await dbConnect();
    const [programs, registrationsOpen] = await Promise.all([
      Program.find({ isActive: true }).sort({ order: 1 }).lean(),
      getFlag("registrations.programsOpen", true),
    ]);

    const items = toPlain(programs);
    return {
      items: items.length ? items : FALLBACK_PROGRAMS,
      registrationsOpen,
    };
  } catch (error) {
    console.warn("[programs] database unavailable, using fallback:", error.message);
    return { items: FALLBACK_PROGRAMS, registrationsOpen: true };
  }
}

export default async function ProgramsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("programs");
  const { items, registrationsOpen } = await loadPrograms();

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
        itemType="program"
        clerkConfigured={clerkConfigured}
        registrationsOpen={registrationsOpen}
      />
    </div>
  );
}
