import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { DONATE_NAV } from "@/lib/site-config";

/**
 * Where every "Donate" on the site points: the seva list in Hindi, whatever
 * language the reader happens to be browsing in.
 *
 * The proxy already sends an unprefixed `/donate` to Hindi, but nothing on the
 * site ever links there. `Link` from `@/i18n/navigation` prefixes with the
 * *current* locale, so the donate button in the header rendered `/en/donate`
 * for anyone reading in English and the redirect never ran. This is the href
 * that closes that gap — the same decision as the proxy's, made at the link
 * instead of at the request.
 *
 * Deliberately a plain path for `next/link` rather than next-intl's `locale`
 * prop, which would look equivalent and is not: that prop treats the click as
 * a language switch and writes `NEXT_LOCALE=hi` in the browser, so tapping
 * Donate once would quietly turn the *rest* of the site Hindi for a reader who
 * had chosen English. Hindi on the donate route is a decision about that
 * route, not about their preference — so their preference is left alone, and
 * the toggle in the header still switches this page like any other.
 */
export const DONATE_HREF = getPathname({
  href: DONATE_NAV.href,
  locale: routing.defaultLocale,
});
