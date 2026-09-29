"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import {
  META_PIXEL_ID,
  metaPixelEnabled,
  trackMeta,
} from "@/lib/analytics/meta";

/**
 * The Meta Pixel, mounted once for the whole site.
 *
 * Two jobs, and the second is the one that is easy to forget. The first is the
 * base snippet Meta hands out, verbatim apart from the pixel ID: it installs
 * `fbq` as a queue, loads fbevents.js, and reports the page the visitor
 * landed on.
 *
 * The second is every page after that. Meta's snippet counts a PageView when
 * the script runs, which on an ordinary multi-page site is once per page — but
 * this is an App Router site, so a visitor who lands on the home page and taps
 * through to /donate never reloads the script, and that whole journey would be
 * reported as a single view of the home page. The effect below is what makes
 * the funnel real: a PageView on every client-side navigation, skipping the
 * first pass because the snippet has already counted that one.
 *
 * Only the path is watched, not the query string. A pixel that also read
 * `useSearchParams` would be correct in principle — an ad click arrives with
 * ?fbclid=… — and quietly worse in practice: reading search params in a
 * prerendered layout forces the surrounding Suspense boundary to fall back at
 * build time, so the snippet and the noscript beacon would be dropped from the
 * served HTML and the pixel would not exist until React had hydrated. Nothing
 * is lost by leaving it out; `fbq` reads the browser's real URL itself, and
 * the click ID is captured by the pixel's own `_fbc` cookie either way.
 *
 * Kept as a component rather than inlined into the layout so the layout stays
 * a server component — the route-change listener needs hooks.
 *
 * Renders nothing when tracking is off (see `metaPixelEnabled`), which is why
 * `next dev` ships no pixel and no ad-blocker console noise at all.
 */
export function MetaPixel() {
  if (!metaPixelEnabled) return null;
  return <Pixel />;
}

function Pixel() {
  const pathname = usePathname();

  /* The snippet's own `fbq('track', 'PageView')` covers the landing page, so
     the first pass of this effect must stay quiet or every visit would begin
     with two views of the same page. */
  const landed = useRef(false);

  useEffect(() => {
    if (!landed.current) {
      landed.current = true;
      return;
    }
    trackMeta("PageView");
  }, [pathname]);

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        /* Meta's snippet as published, with the ID substituted. Left in its
           original minified shape on purpose: it is a vendor snippet, and a
           tidied-up copy is one that has to be re-reviewed against theirs
           every time they change it. */
        dangerouslySetInnerHTML={{
          __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`,
        }}
      />
      {/* Meta's no-JavaScript fallback. It buys one thing the snippet cannot:
          a PageView from a browser with JavaScript switched off, which on the
          phones this donate page gets shared to is not as hypothetical as it
          sounds. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- a 1x1
            tracking beacon, not an image: next/image would route it through
            the optimizer, which fetches on the server and never from the
            visitor's browser, so it would count nothing. */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
