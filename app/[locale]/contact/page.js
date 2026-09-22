import { setRequestLocale, getTranslations } from "next-intl/server";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { PolicyPage } from "@/components/legal/PolicyPage";
import { routing } from "@/i18n/routing";
import { ORG } from "@/lib/site-config";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.contact" });
  return {
    title: t("title"),
    description: t("intro"),
  };
}

function ContactCard({ icon: Icon, heading, children }) {
  return (
    <section className="rounded-xl border border-border p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        {heading}
      </h2>
      <div className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

const linkClass =
  "font-medium text-foreground underline-offset-4 hover:underline";

/**
 * Contact page.
 *
 * Same frame as the policy documents, but cards instead of numbered clauses —
 * and every address and number is read from `ORG`, so the page, the footer
 * and the policy pages that point here can never disagree.
 */
export default async function ContactPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.contact" });

  return (
    <PolicyPage doc="contact">
      <div className="grid gap-4 sm:grid-cols-2">
        <ContactCard icon={Mail} heading={t("email_heading")}>
          <a href={`mailto:${ORG.email}`} className={linkClass}>
            {ORG.email}
          </a>
          <p className="mt-3">{t("email_note")}</p>
        </ContactCard>

        <ContactCard icon={Phone} heading={t("phone_heading")}>
          <a href={`tel:${ORG.phone.replace(/\s+/g, "")}`} className={linkClass}>
            {ORG.phone}
          </a>
          <p className="mt-3">{t("phone_note")}</p>
        </ContactCard>

        <ContactCard icon={MapPin} heading={t("address_heading")}>
          <address className="not-italic">
            <span className="block font-medium text-foreground">
              {ORG.name}
            </span>
            {ORG.address}
          </address>
          <p className="mt-3 text-xs">{ORG.parentLegalName}</p>
        </ContactCard>

        <ContactCard icon={Clock} heading={t("hours_heading")}>
          <p>{t("hours")}</p>
          <p className="mt-3">{t("payments_note")}</p>
        </ContactCard>
      </div>
    </PolicyPage>
  );
}
