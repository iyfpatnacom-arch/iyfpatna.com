import { setRequestLocale } from "next-intl/server";
import { SignIn } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth-config";
import { Panel } from "@/components/site/Panel";

export default async function SignInPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-14">
      {clerkConfigured ? (
        <SignIn />
      ) : (
        <Panel className="max-w-sm p-10 text-center text-muted-foreground">
          Accounts aren&apos;t set up yet — add Clerk keys to .env.local.
        </Panel>
      )}
    </div>
  );
}
