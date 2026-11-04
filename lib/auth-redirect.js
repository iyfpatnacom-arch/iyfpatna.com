import { routing } from "@/i18n/routing";

/**
 * Where to send somebody after they sign in, when the link that sent them to
 * the sign-in screen said where it wanted them back.
 *
 * It exists for one flow: /activity/gita-marathon has nothing to show a
 * stranger until they have an account, so its buttons carry
 * `?redirect_url=/hi/activity/gita-marathon` and the volunteer lands back on
 * the page they were reading rather than on the home page, wondering what
 * happened to the thing they were signing up for.
 *
 * Every candidate is checked here rather than handed to Clerk as it arrives,
 * because a redirect target read out of a URL is the textbook open-redirect:
 * `?redirect_url=https://evil.example` on a real, trusted sign-in page is a
 * convincing way to collect credentials. So:
 *
 *   - it must be a path on this site, which means one leading slash and not
 *     two (`//evil.example` is a protocol-relative URL that browsers happily
 *     treat as another origin);
 *   - no scheme, no backslashes — a backslash is normalised to a slash by
 *     some browsers and is a known way past exactly this check;
 *   - and it must begin with one of our locales, which is both a tighter
 *     filter and the thing Clerk needs anyway, since it redirects verbatim
 *     and an unprefixed path would bounce through locale detection.
 *
 * Returns null when there is nothing safe to use, and every caller then falls
 * back to its own default.
 */
export function safeRedirectPath(value) {
  const path = String(value ?? "").trim();

  if (!path.startsWith("/")) return null;
  if (path.startsWith("//")) return null;
  if (path.includes("\\")) return null;
  if (/^\/+\s*https?:/i.test(path)) return null;

  const [, first] = path.split("/");
  if (!routing.locales.includes(first)) return null;

  return path;
}
