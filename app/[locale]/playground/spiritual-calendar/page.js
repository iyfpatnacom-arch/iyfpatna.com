import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * The old stub, kept only as a redirect.
 *
 * This page used to list two hardcoded Ekadashi dates under a notice
 * apologising that they were provisional. `/playground/vaishnava-calendar`
 * replaces it with dates computed from the Sun's and Moon's positions at
 * Patna's own sunrise, so there is nothing here worth rendering — but the URL
 * may be in someone's history or a WhatsApp message, and a dead link is a
 * worse answer than the right page.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function SpiritualCalendarPage({ params }) {
  const { locale } = await params;
  redirect({ href: "/playground/vaishnava-calendar", locale });
}
