"use client";

import { useEffect } from "react";
import { WHATSAPP_GROUP_URL } from "@/lib/site-config";

/**
 * Turns /en#whatsapp into the WhatsApp invite itself.
 *
 * The fragment is what gets pasted into posters, bios and forwarded
 * messages, and someone arriving on it has already decided — they do not
 * want to land next to the button and then press it. So arriving with
 * `#whatsapp` on the URL does what pressing "Join now" would have done, and
 * the section underneath is what they see if they come back.
 *
 * Renders nothing. It exists only for the effect, and lives inside
 * <WhatsappJoin> so it is mounted exactly where the section is — the home
 * page — and is handed the same admin-editable invite the button uses,
 * rather than resolving its own and risking the two disagreeing.
 *
 * Three details this depends on:
 *
 * - The hash is the state, not a flag of our own. It is cleared with
 *   `replaceState` before we leave, so the browser's back button returns to
 *   a URL that will not fire again — otherwise a visitor who backed out of
 *   WhatsApp would be thrown straight back into it, with no way off the
 *   page. It also makes React's double-invoked effects in development a
 *   no-op on the second pass.
 *
 * - `noopener` is deliberately not in the feature string. Chrome returns
 *   null from `window.open` whenever it is present, success or not, which
 *   would make every open look blocked and trigger the fallback on top of a
 *   tab that had in fact opened. The opener is severed afterwards instead.
 *
 * - A popup opened without a click is blocked by most desktop browsers, and
 *   nothing can be done about that from script. When it is, we navigate this
 *   tab instead. Leaving the site is the right answer here: the visitor
 *   followed a link whose entire purpose was to reach the group.
 */
export function WhatsappAutoJoin({ href = WHATSAPP_GROUP_URL }) {
  useEffect(() => {
    if (!href) return;

    function join() {
      if (window.location.hash !== "#whatsapp") return;

      /* Before the hash goes, so the section is where the visitor left off
         if the invite opened in a tab of its own and they come back. */
      document.getElementById("whatsapp")?.scrollIntoView();

      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

      const tab = window.open(href, "_blank");
      if (!tab) {
        window.location.href = href;
        return;
      }
      try {
        tab.opener = null;
      } catch {
        /* Cross-origin by the time it loads; nothing to sever. */
      }
    }

    join();

    /* Also covers arriving at the fragment without a page load — a link to
       /en#whatsapp followed from somewhere else on the site. */
    window.addEventListener("hashchange", join);
    return () => window.removeEventListener("hashchange", join);
  }, [href]);

  return null;
}
