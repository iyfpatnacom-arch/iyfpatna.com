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
