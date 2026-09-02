import Image from "next/image";
import { useTranslations } from "next-intl";
import { GraduationCap, Music2, PartyPopper, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsappIcon } from "@/components/site/WhatsappIcon";
import { WHATSAPP_GROUP_QR, WHATSAPP_GROUP_URL } from "@/lib/site-config";

/**
 * "Join our WhatsApp group", sitting directly under what we do.
 *
 * The group is where the community actually runs day to day, so this is the
 * one section that has to work for both a visitor at a desk and one holding
 * the phone that will scan the code. Hence two paths to the same invite: the
 * QR for someone reading on a laptop, the button for someone already on the
 * device WhatsApp is installed on.
 *
 * Layout follows from that. On a phone the code comes first — it is the thing
 * a visitor is looking for when a friend says "scan this" — and the copy
 * explains it underneath. From `md` up the two sit side by side.
 *
 * The four lines are the group's actual traffic, named plainly, so nobody
 * joins expecting one thing and mutes it a day later over another.
 *
 * `id="whatsapp"` makes the section shareable on its own — /hi#whatsapp, or
 * just iyfpatna.in/#whatsapp, since the locale redirect carries the fragment
 * through. `scroll-mt-24` is what makes that land correctly: the header is
 * sticky, and without the offset the browser aligns the section with the
 * viewport top, which is the space the header is already occupying.
 */
const BENEFITS = [
  { key: "seminar", Icon: GraduationCap },
  { key: "darshan", Icon: Sunrise },
  { key: "festivals", Icon: PartyPopper },
  { key: "kirtan", Icon: Music2 },
];

export function WhatsappJoin() {
  const t = useTranslations("home");

  return (
    <section id="whatsapp" className="scroll-mt-24 border-b border-border/70">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[auto_1fr] md:items-center md:gap-12">
        {/* The code, first in the DOM so a phone meets it before the copy.
            Held on a permanent white card rather than on `bg-card`: a QR is
            read by a camera, not by a person, and inverting it in dark mode
            would leave a code that no scanner can lock onto. */}
        <div className="justify-self-center md:justify-self-start">
          <div className="rounded-2xl border border-border bg-white p-3 shadow-sm">
            <Image
              src={WHATSAPP_GROUP_QR}
              alt={t("whatsapp_qr_alt")}
              width={200}
              height={200}
              className="size-44 sm:size-48"
              unoptimized
            />
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground ">
            {t("whatsapp_scan_hint")}
          </p>
        </div>

        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <WhatsappIcon className="size-3.5 text-[#25D366]" />
            {t("whatsapp_eyebrow")}
          </span>

          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {t("whatsapp_title")}
          </h2>
          <p className="mt-2 text-muted-foreground">{t("whatsapp_subtitle")}</p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {BENEFITS.map(({ key, Icon }) => (
              <li
                key={key}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="text-sm font-medium">
                  {t(`whatsapp_item_${key}`)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
