import { setRequestLocale } from "next-intl/server";
import { SignUp } from "@clerk/nextjs";
import { clerkConfigured } from "@/lib/auth-config";
import { GlassCard } from "@/components/glass/GlassCard";

export default async function SignUpPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5 py-14">
      {clerkConfigured ? (
        <SignUp />
      ) : (
        <GlassCard className="max-w-sm p-10 text-center text-foreground/60">
          Accounts aren&apos;t set up yet — add Clerk keys to .env.local.
        </GlassCard>
      )}
    </div>
  );
}
