import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Flag, Link2 } from "lucide-react";
import { clerkConfigured, getAdminUser } from "@/lib/auth-config";
import { GlassCard } from "@/components/glass/GlassCard";

/**
 * /admin — the way in.
 *
 * The admin screens are deliberately unlinked from the site's navigation:
 * the header row is already at its width budget, and a nav item only a
 * handful of accounts can use is noise for everyone else. But unlinked from
 * everywhere is how a tool gets forgotten, so this index is the one address
 * worth remembering, and it lists the rest.
 */
export const dynamic = "force-dynamic";

const SECTIONS = [
  { key: "settings", href: "/admin/settings", Icon: Link2 },
  { key: "flags", href: "/admin/flags", Icon: Flag },
];

export default async function AdminHomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  const user = clerkConfigured ? await getAdminUser() : null;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <GlassCard className="p-10 text-foreground/60">
          {clerkConfigured
            ? "Admins only."
            : "Add Clerk keys and set your user's publicMetadata.role to \"admin\"."}
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-foreground/60">{t("subtitle")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ key, href, Icon }) => (
          <Link key={key} href={href} className="group">
            <GlassCard className="h-full p-6 transition-colors group-hover:border-glass/25">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <p className="mt-4 flex items-center gap-1.5 font-bold text-foreground">
                {t(`nav_${key}`)}
                <ArrowRight
                  className="size-4 opacity-0 transition-opacity group-hover:opacity-60"
                  aria-hidden="true"
                />
              </p>
              <p className="mt-1 text-sm text-foreground/55">
                {t(`nav_${key}_hint`)}
              </p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
