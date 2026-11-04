import { setRequestLocale } from "next-intl/server";
import { SignIn } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth-config";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { Panel } from "@/components/site/Panel";

/**
 * `?redirect_url=` is honoured so a page that needs an account can send
 * somebody here and get them back — /activity/gita-marathon is the one that
 * does. Validated first (see `safeRedirectPath`): a redirect target taken
 * straight out of a URL on a sign-in page is an open redirect, and this is
 * exactly the page where one would be worth the most to somebody.
 *
 * `fallbackRedirectUrl` rather than `forceRedirectUrl`, so a session Clerk
 * already has an opinion about — one that was mid-flow somewhere else — is not
 * overridden by a stale link.
 */
export default async function SignInPage({ params, searchParams }) {
  const { locale } = await params;
  const { redirect_url: requested } = await searchParams;
  setRequestLocale(locale);

  const back = safeRedirectPath(requested);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-14">
      {clerkConfigured ? (
        <SignIn
          {...(back
            ? { fallbackRedirectUrl: back, signUpFallbackRedirectUrl: back }
            : {})}
        />
      ) : (
        <Panel className="max-w-sm p-10 text-center text-muted-foreground">
          Accounts aren&apos;t set up yet — add Clerk keys to .env.local.
        </Panel>
      )}
    </div>
  );
}
