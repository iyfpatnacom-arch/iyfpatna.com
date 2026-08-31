import { useLocale, useTranslations } from "next-intl";
import { ORG } from "@/lib/site-config";

/**
 * Renders one policy document from the `legal` message namespace.
 *
 * Every document has the same shape — title, intro, then a list of
 * `{ heading, body[] }` sections — so the three legal routes are one
 * component with a different `doc` rather than three near-identical pages.
 * Adding a section is a translation edit, not a code change.
 */
export function PolicyPage({ doc }) {
  const t = useTranslations(`legal.${doc}`);
  const tl = useTranslations("legal");
  const locale = useLocale();

  const sections = t.raw("sections");

  const updated = new Intl.DateTimeFormat(
    locale === "hi" ? "hi-IN" : "en-IN",
    { day: "numeric", month: "long", year: "numeric" }
  ).format(new Date(`${ORG.policyUpdated}T00:00:00`));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="border-b border-border pb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tl("updated_label")}: {updated}
        </p>
        <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>
      </header>

      <div className="mt-10 space-y-9">
        {sections.map((section, index) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold tracking-tight">
              <span
                className="mr-2 text-sm font-normal text-muted-foreground tabular-nums"
                aria-hidden="true"
              >
                {index + 1}.
              </span>
              {section.heading}
            </h2>
            <div className="mt-3 space-y-3">
              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-[15px] leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-12 rounded-xl border border-border bg-muted/30 p-5 text-sm">
        <p className="text-muted-foreground">
          {tl("contact_prompt")}{" "}
          <a
            href={`mailto:${ORG.email}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {ORG.email}
          </a>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {ORG.parentLegalName} · {ORG.address}
        </p>
      </footer>
    </div>
  );
}
