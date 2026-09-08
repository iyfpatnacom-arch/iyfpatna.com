import { setRequestLocale, getTranslations } from "next-intl/server";
import { Hero } from "@/components/home/Hero";
import { Pillars } from "@/components/home/Pillars";
import { WhatsappJoin } from "@/components/home/WhatsappJoin";
import { YatraCallout } from "@/components/home/YatraCallout";
import { ParentOrg } from "@/components/home/ParentOrg";
import { JoinCta } from "@/components/home/JoinCta";
import { routing } from "@/i18n/routing";
import { ORG } from "@/lib/site-config";
import { getWhatsappGroupUrl } from "@/lib/settings";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  return {
    title: `${ORG.name} — ${t("badge")}`,
    description: t("subtitle"),
    openGraph: {
      title: ORG.name,
      description: t("subtitle"),
      type: "website",
    },
  };
}

/**
 * Home page.
 *
 * Entirely static. The previous version read Programs and Festivals from
 * MongoDB and was `force-dynamic`, which meant the front page went down with
 * the database and could never be prerendered. This page's job is to say who
 * IYF Patna is, who it belongs to and where to find it — none of which
 * changes per request — so the live event data stays on the Programs and
 * Festivals pages, which are actually about it.
 */
export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const whatsappUrl = await getWhatsappGroupUrl();

  return (
    <>
      <Hero />
      <Pillars />
      <WhatsappJoin href={whatsappUrl} />
      <YatraCallout />
      <ParentOrg />
      <JoinCta />
    </>
  );
}
