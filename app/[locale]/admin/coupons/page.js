import { setRequestLocale, getTranslations } from "next-intl/server";
import { clerkConfigured, getAdminUser, redirectSignedOut } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { toPlain } from "@/lib/serialize";
import Coupon from "@/models/Coupon";
import { Panel } from "@/components/site/Panel";
import { CouponsManager } from "@/components/admin/CouponsManager";

/**
 * /admin/coupons — discount codes for the paid courses.
 *
 * The only place a code is ever shown. The checkout has a box to type one in
 * and nothing else; codes are shared by hand.
 */
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin");

  await redirectSignedOut(locale);
  const user = clerkConfigured ? await getAdminUser() : null;
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <Panel className="p-10 text-muted-foreground">Admins only.</Panel>
      </div>
    );
  }

  await dbConnect();
  const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();

  return (
    <div className="mx-auto max-w-4xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {t("coupons_title")}
      </h1>
      <p className="mt-2 text-muted-foreground">{t("coupons_subtitle")}</p>
      <CouponsManager coupons={toPlain(coupons)} />
    </div>
  );
}
