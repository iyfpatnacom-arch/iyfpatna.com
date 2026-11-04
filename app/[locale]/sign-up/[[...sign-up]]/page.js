import { setRequestLocale } from "next-intl/server";
import { SignUp } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth-config";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { Panel } from "@/components/site/Panel";

/**
 * Signing up, optionally on the way back to somewhere.
 *
 * The Gita Marathon's volunteer page sends people here with
 * `?redirect_url=…/activity/gita-marathon`, so they finish on the page that
 * asked for an account and go straight into the application form. See
 * `safeRedirectPath` for why that parameter is never trusted as it arrives.
 *
 * The extra information a volunteer has to give — phone, area, college — is
 * deliberately *not* grafted onto this screen. Clerk establishes who somebody
 * is; what they are volunteering for is the temple's own question, lives in
 * `MarathonVolunteer`, has to be queryable by the coordinator, and changes
 * when the marathon changes. Pushing it into Clerk's metadata would put the
 * coordinator's list behind an API call to Clerk and make it unsearchable.
 * Google sign-in needs nothing here either: it is enabled per instance in the
 * Clerk dashboard and this component renders whatever is switched on.
 */
export default async function SignUpPage({ params, searchParams }) {
  const { locale } = await params;
  const { redirect_url: requested } = await searchParams;
  setRequestLocale(locale);

  const back = safeRedirectPath(requested);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-14">
      {clerkConfigured ? (
        <SignUp
          {...(back
            ? { fallbackRedirectUrl: back, signInFallbackRedirectUrl: back }
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
