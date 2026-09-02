import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// `/dashboard` is deliberately absent: it is a public "coming soon" placeholder
// now, and protecting it would send every visitor who taps Profile to a sign-in
// screen instead of the page that explains why there is nothing there yet. Put
// it back the moment the real dashboard returns.
const isProtectedRoute = createRouteMatcher(["/(hi|en)/admin(.*)"]);

// API routes have no locale prefix and must never be redirected by
// next-intl — they only need Clerk's auth context (when configured).
const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

function localeFromPath(pathname) {
  const [, maybeLocale] = pathname.split("/");
  return routing.locales.includes(maybeLocale) ? maybeLocale : routing.defaultLocale;
}

// clerkMiddleware() only reads/validates keys once the returned handler is
// actually invoked per-request, so building this is safe even with no keys —
// we just never call it when Clerk isn't configured.
const withClerk = clerkMiddleware(
  async (auth, req) => {
    if (isProtectedRoute(req)) {
      await auth.protect();
    }
    if (isApiRoute(req)) {
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
  if (isApiRoute(req)) return NextResponse.next();
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!api|trpc|_next|_vercel|icon|apple-icon|opengraph-image|twitter-image|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
