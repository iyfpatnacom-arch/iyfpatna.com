import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// The admin guard used to live here as `createRouteMatcher` + `auth.protect()`.
// Clerk deprecated that pattern — middleware path matching can drift from how
// Next.js actually routes, which leaves protected data reachable — so the check
// now sits next to the data it guards: every admin page calls `getAdminUser`
// and every admin action calls `requireAdmin`, both of which check the *role*,
// not merely that someone is signed in. `redirectSignedOut` in the same module
// keeps the one thing `auth.protect()` did that those don't: sending a visitor
// with no session to the sign-in screen.
//
// (`/dashboard` was never protected here either: it is a public "coming soon"
// placeholder, and guarding it would send everyone who taps Profile to sign-in
// instead of the page explaining why there is nothing there yet.)

// API routes have no locale prefix and must never be redirected by
// next-intl — they only need Clerk's auth context (when configured). This is a
// routing decision rather than an auth check, so a plain path test is both
// sufficient and free of the deprecated matcher.
function isApiPath(pathname) {
  return /^\/(api|trpc)(\/|$)/.test(pathname);
}

// Giving opens in Hindi.
//
// next-intl's detection reads the NEXT_LOCALE cookie first and the browser's
// Accept-Language header second, and neither is a good answer here: most
// phones sold here ship set to English, so a donate link shared on WhatsApp or
// printed as a QR code in the temple was opening the seva list in English for
// people who read Hindi — and a reader who once tapped EN on some other page
// carries that choice into the seva list too.
//
// So an unprefixed donation link resolves to Hindi, full stop: no cookie and
// no header gets a say. It is the one route where the language is the
// temple's decision rather than the browser's.
//
// Only *unprefixed* paths, though. `/en/donate` still renders English, which
// is what keeps the header's locale toggle working on this page — the toggle
// navigates to the prefixed path, and a redirect here would bounce it
// straight back. Arriving in Hindi and being able to switch are different
// questions; this answers the first. The links that point *into* the route
// answer it too (see lib/donate-href.js), because those are prefixed with the
// reader's current locale and never reach this function.
const HINDI_FIRST = /^\/(donate|donation)(\/|$)/;

function hindiFirstRedirect(req) {
  const { pathname } = req.nextUrl;
  if (!HINDI_FIRST.test(pathname)) return null;

  const url = req.nextUrl.clone();
  url.pathname = `/${routing.defaultLocale}${pathname}`;
  return NextResponse.redirect(url);
}

function localeFromPath(pathname) {
  const [, maybeLocale] = pathname.split("/");
  return routing.locales.includes(maybeLocale) ? maybeLocale : routing.defaultLocale;
}

// clerkMiddleware() only reads/validates keys once the returned handler is
// actually invoked per-request, so building this is safe even with no keys —
// we just never call it when Clerk isn't configured.
const withClerk = clerkMiddleware(
  async (_auth, req) => {
    if (isApiPath(req.nextUrl.pathname)) {
      return NextResponse.next();
    }
    return intlMiddleware(req);
  },
  (req) => {
    const locale = localeFromPath(req.nextUrl.pathname);
    return {
      signInUrl: `/${locale}/sign-in`,
      signUpUrl: `/${locale}/sign-up`,
    };
  }
);

const clerkConfigured = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

export default function proxy(req, event) {
  /* Ahead of Clerk because it is a routing decision and needs no session:
     the redirected request comes back through this same middleware with a
     locale prefix, and picks up its auth context then. */
  const hindiFirst = hindiFirstRedirect(req);
  if (hindiFirst) return hindiFirst;

  if (clerkConfigured) return withClerk(req, event);
  if (isApiPath(req.nextUrl.pathname)) return NextResponse.next();
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!api|trpc|_next|_vercel|icon|apple-icon|opengraph-image|twitter-image|.*\\..*).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
