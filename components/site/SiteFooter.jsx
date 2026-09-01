import { useTranslations } from "next-intl";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/site/BrandMark";
import {
  DONATE_NAV,
  LEGAL_NAV,
  MAIN_NAV,
  MANAGEMENT_COUNCIL,
  ORG,
} from "@/lib/site-config";

/**
 * Explore, as the footer lists it: the main nav minus Home, plus Donate.
 *
 * Donate is appended here rather than added to `MAIN_NAV` because the header
 * gives it a button of its own — but a donate page that only exists behind a
 * button in the top bar is one a visitor cannot find again from the bottom of
 * a long page, which is exactly where they finish reading.
 */
const EXPLORE_NAV = [
  ...MAIN_NAV.filter((item) => item.key !== "home"),
  DONATE_NAV,
];

function FooterHeading({ children }) {
  return (
    <h2 className="text-[11px] font-semibold tracking-wider text-foreground/70 uppercase">
      {children}
    </h2>
  );
}

function FooterLink({ href, external = false, children }) {
  const className =
    "inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
        <ArrowUpRight className="size-3 opacity-60" aria-hidden="true" />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * Site footer.
 *
 * Two things here are load-bearing rather than decorative. The Temple
 * Management Council is published on every page because IYF Patna acts under
 * that council's authority and visitors should be able to see who that is;
 * and the legal documents are linked from every page because a policy that
 * can only be found from the home page is not really published.
 *
 * The bottom line restates the parent-organisation relationship in plain
 * words — the one claim about IYF Patna that must never be ambiguous.
 */
export function SiteFooter() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");

  return (
    <footer className="mt-auto border-t border-border/70 bg-muted/25">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Identity */}
          <div className="md:col-span-4">
            <BrandMark />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t("about_line")}
            </p>
            <p className="mt-4 max-w-xs text-xs leading-relaxed text-muted-foreground/80">
              {t("founder")}
            </p>
          </div>

          {/* Explore */}
          <nav className="md:col-span-2" aria-label={t("explore")}>
            <FooterHeading>{t("explore")}</FooterHeading>
            <ul className="mt-3 space-y-2">
              {EXPLORE_NAV.map((item) => (
                <li key={item.key}>
                  <FooterLink href={item.href} external={item.external}>
                    {tn(item.key)}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal */}
          <nav className="md:col-span-2" aria-label={t("legal_heading")}>
            <FooterHeading>{t("legal_heading")}</FooterHeading>
            <ul className="mt-3 space-y-2">
              {LEGAL_NAV.map((item) => (
                <li key={item.key}>
                  <FooterLink href={item.href}>{tn(item.key)}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact */}
          <div className="md:col-span-4">
            <FooterHeading>{t("contact_heading")}</FooterHeading>
            <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <MapPin
                  className="mt-0.5 size-3.5 shrink-0 opacity-70"
                  aria-hidden="true"
                />
                <span className="leading-relaxed">{ORG.address}</span>
              </li>
              <li>
                <a
                  href={`mailto:${ORG.email}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <Mail className="size-3.5 opacity-70" aria-hidden="true" />
                  {ORG.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${ORG.phone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
                >
                  <Phone className="size-3.5 opacity-70" aria-hidden="true" />
                  {ORG.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Temple Management Council */}
        <section
          aria-labelledby="management-council"
          className="mt-10 border-t border-border/70 pt-8"
        >
          <h2
            id="management-council"
            className="text-[11px] font-semibold tracking-wider text-foreground/70 uppercase"
          >
            {t("council_heading")}
          </h2>
          <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {MANAGEMENT_COUNCIL.map((member) => (
              <li key={member.name}>
                <p className="text-sm font-medium text-foreground">
                  {member.name}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {t(`roles.${member.roleKey}`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 flex flex-col gap-2 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("operated_by")}</p>
          <p className="shrink-0">
            © {new Date().getFullYear()} {ORG.parent} · {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
