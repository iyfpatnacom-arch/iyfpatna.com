import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { avatarBySlug, liveAvatars } from "@/lib/sarathi/avatars";
import { AvatarPortrait } from "@/components/sarathi/AvatarPortrait";
import { AvatarChat } from "@/components/sarathi/AvatarChat";

/**
 * A conversation with one AI avatar.
 *
 * Static for every live avatar in every locale — the page is chrome and a
 * client component; the thinking happens in `/api/sarathi/avatar`.
 */

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    liveAvatars().map((avatar) => ({ locale, slug: avatar.slug }))
  );
}

export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const avatar = avatarBySlug(slug);
  if (!avatar || avatar.status !== "live") return {};
  return { title: `${avatar.name[locale]} · Sarathi AI`, description: avatar.blurb[locale] };
}

export default async function AvatarChatPage({ params }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const avatar = avatarBySlug(slug);
  if (!avatar || avatar.status !== "live") notFound();

  const t = await getTranslations("sarathi.chat");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/sarathi/avatars"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("back")}
      </Link>

      <header className="mt-6 flex items-center gap-4">
        <AvatarPortrait avatar={avatar} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {avatar.name[locale]}
          </h1>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {avatar.role[locale]} · {avatar.years}
          </p>
        </div>
      </header>

      <p className="mt-5 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        {t("disclaimer")}
      </p>

      <div className="mt-6">
        <AvatarChat avatar={avatar} />
      </div>
    </div>
  );
}
