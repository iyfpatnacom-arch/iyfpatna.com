import { IskconLogo } from "@/components/site/IskconLogo";
import {
  ORG,
  PARENT_BAND,
  PARENT_SITE_URL,
  activeSocialLinks,
} from "@/lib/site-config";

/*
 * Brand glyphs are drawn inline rather than imported: lucide-react v1 dropped
 * every logo icon from the set, so Facebook/Instagram/YouTube/X no longer
 * exist as components. These are filled paths on a 24-unit box, sized by the
 * `size-*` class the caller passes.
 */
const GLYPH_PATHS = {
  facebook:
    "M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 3.926 23.094 9.101 24v-8.437H6.627v-3.49h2.474V9.9c0-2.475 1.462-3.842 3.696-3.842 1.07 0 2.19.192 2.19.192v2.42h-1.235c-1.216 0-1.595.762-1.595 1.543v1.85h2.715l-.434 3.49h-2.281V24C20.074 23.094 24 18.1 24 12.073z",
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  instagram:
    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.121 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.376-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  whatsapp:
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.896 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.305-1.654a11.98 11.98 0 005.73 1.459h.005c6.582 0 11.945-5.335 11.949-11.893a11.82 11.82 0 00-3.467-8.413",
};

function SocialGlyph({ name, className }) {
  const path = GLYPH_PATHS[name];
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

/**
 * The ISKCON Patna band that sits above the IYF navigation.
 *
 * IYF Patna is a wing of ISKCON Patna, so the parent identity is given the
 * top line of the page and the youth forum's own navigation sits underneath
 * it. The band is an attribution and reads as one: the only things in it a
 * reader can click are the lockup, which opens ISKCON Patna's own site, and
 * the social profiles.
 *
 * On phones it compresses to the temple line alone: the founder credit and
 * the society's full name are the first things worth losing when there are
 * only 400 pixels, and both still appear in the footer.
 */
export function IskconBand() {
  return (
    <div className="iskcon-band text-white">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-2.5 sm:px-6 sm:py-3">
        {/* Parent lockup. The whole box is the link out to the ISKCON Patna
            site — the emblem and the name are one target, which is both a
            bigger tap area and the behaviour a reader expects from a logo. */}
        <a
          href={PARENT_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${ORG.parent} — opens in a new tab`}
          className="flex shrink-0 items-center gap-2.5 rounded-md border border-white/25 px-2.5 py-1.5 transition-colors hover:border-white/50 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none sm:gap-3 sm:px-3"
        >
          {/* The official mark already contains the ISKCON wordmark, so only
              "PATNA" is set alongside it. */}
          <IskconLogo className="h-8 w-auto shrink-0 text-white sm:h-9" />
          <span className="mt-0.5 text-[10px] font-semibold tracking-[0.3em] text-[var(--band-accent)] sm:text-[11px]">
            PATNA
          </span>
        </a>

        {/* Society + temple. Hidden on the narrowest screens, where it would
            wrap to four lines and crowd out the navigation below. */}
        <div className="hidden min-w-0 border-l border-white/20 pl-4 sm:block">
          <p className="truncate text-[13px] leading-tight font-semibold sm:text-[15px] lg:text-base">
            {PARENT_BAND.society}
          </p>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-white/75 sm:text-[13px]">
            {PARENT_BAND.temple}
          </p>
        </div>

        {/* Founder credit + socials */}
        <div className="ml-auto flex shrink-0 flex-col items-end gap-1.5">
          <p className="hidden text-right text-[11px] leading-tight text-white/85 lg:block">
            {PARENT_BAND.founderTitle}
            <br />
            <span className="font-medium text-white">
              {PARENT_BAND.founderName}
            </span>
          </p>

          {activeSocialLinks.length > 0 && (
            <ul className="flex items-center gap-1.5">
              {activeSocialLinks.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    className="grid size-7 place-items-center rounded-full border border-white/30 text-white/90 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <SocialGlyph name={link.key} className="size-3.5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Temple-gold rule separating the parent band from the IYF navigation. */}
      <div
        className="h-[3px] w-full bg-[var(--band-accent)]"
        aria-hidden="true"
      />

      <span className="sr-only">
        {ORG.shortName} is the youth wing of {ORG.parent}.
      </span>
    </div>
  );
}
