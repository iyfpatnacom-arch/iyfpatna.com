"use client";

import { useTranslations } from "next-intl";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WhatsappIcon } from "@/components/site/WhatsappIcon";
import { WHATSAPP_GROUP_URL } from "@/lib/site-config";

/**
 * Floating "join the WhatsApp group" button, bottom-right.
 *
 * Sits above the mobile dock rather than on top of it: the dock is fixed to
 * the bottom edge and owns roughly 5.5rem plus the home-indicator inset, so
 * the button clears that on small screens and drops back to a normal corner
 * offset from `md` up, where there is no dock.
 *
 * WhatsApp green and the WhatsApp glyph, not the site's primary colour and a
 * generic chat bubble. This is the one control on the site that hands the
 * visitor to another app, and a person should be able to tell which app that
 * is before they tap. The green is hardcoded for the same reason a brand mark
 * is: it does not belong to the theme and must not follow it into dark mode.
 *
 * The tooltip is a hover affordance and never the only label — the accessible
 * name is on the anchor itself, so a screen reader and a touch user (who gets
 * no hover) both still know what the button does.
 */
export function WhatsappFab() {
  const t = useTranslations("common");
  const label = t("whatsapp_cta");

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <a
            href={WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
          />
        }
        className="fixed end-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-50 grid size-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-[#25D366]/50 focus-visible:outline-none active:scale-95 md:end-6 md:bottom-6"
      >
        <WhatsappIcon className="size-6" />
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}
