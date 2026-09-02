import Image from "next/image";
import { useTranslations } from "next-intl";
import { GraduationCap, Music2, PartyPopper, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsappIcon } from "@/components/site/WhatsappIcon";
import { WHATSAPP_GROUP_IMAGE, WHATSAPP_GROUP_URL } from "@/lib/site-config";

/**
 * "Join our WhatsApp group", sitting directly under what we do.
 *
 * The group is where the community actually runs day to day, and the argument
 * for joining it is the photograph: forty people who already did. So the
 * photo leads and the invitation sits immediately under it, where someone
 * looking at the faces can act without hunting for a link.
 *
 * On a phone the photo comes first and the copy explains underneath. From
 * `md` up the two sit side by side, half the width each — a landscape group
 * shot needs the room, and squeezed into a narrow column nobody in it is
 * recognisable.
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
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:gap-12">
        {/* First in the DOM so a phone meets the photo before the copy.
            Explicit intrinsic dimensions rather than `fill`: they carry the
            16:9 shape, so the box is reserved before the bytes arrive and the
            section never jumps. */}
        <div>
          <Image
            src={WHATSAPP_GROUP_IMAGE.src}
            alt={t("whatsapp_image_alt")}
            width={WHATSAPP_GROUP_IMAGE.width}
            height={WHATSAPP_GROUP_IMAGE.height}
            sizes="(min-width: 768px) 45vw, 100vw"
            className="h-auto w-full rounded-2xl border border-border bg-muted"
          />

          <Button
            size="lg"
            className="mt-4 w-full rounded-full bg-[#25D366] px-5 text-white hover:bg-[#1da851] focus-visible:ring-[#25D366]/40 sm:w-auto"
            render={
              <a
                href={WHATSAPP_GROUP_URL}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <WhatsappIcon className="size-4" />
            {t("whatsapp_cta")}
          </Button>
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
