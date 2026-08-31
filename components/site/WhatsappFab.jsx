"use client";

import { useTranslations } from "next-intl";
import { MessageCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WHATSAPP_GROUP_URL } from "@/lib/site-config";

/**
 * Floating "join the WhatsApp group" button, bottom-right.
 *
 * Sits above the mobile dock rather than on top of it: the dock is fixed to
 * the bottom edge and owns roughly 5.5rem plus the home-indicator inset, so
 * the button clears that on small screens and drops back to a normal corner
 * offset from `md` up, where there is no dock.
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
        className="fixed end-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-50 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-95 md:end-6 md:bottom-6"
      >
        <MessageCircle className="size-6" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}
