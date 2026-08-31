import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IyfLogo } from "@/components/site/IyfLogo";
import { ORG } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * The IYF Patna lockup used in the header and the footer.
 *
 * Carries the youth forum's own badge, not ISKCON's: the parent band directly
 * above the header already shows the ISKCON mark, and repeating it here would
 * say nothing new.
 *
 * The second line ("The youth wing of ISKCON Patna") is not decoration: the
 * relationship to the parent temple has to be legible wherever the brand
 * appears, so it travels with the mark.
 */
export function BrandMark({ href = "/", compact = false, className = "" }) {
  const t = useTranslations("footer");

  return (
    <Link
      href={href}
      className={cn(
        "group flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <IyfLogo
        title=""
        className={cn("shrink-0 rounded-full", compact ? "size-8" : "size-9")}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={cn(
            "truncate font-semibold tracking-tight text-foreground",
            compact ? "text-[14px]" : "text-[15px]",
          )}
        >
          {ORG.shortName}
        </span>
        {!compact && (
          <span className="truncate text-[11px] text-muted-foreground">
            {t("youth_wing")}
          </span>
        )}
      </span>
    </Link>
  );
}
