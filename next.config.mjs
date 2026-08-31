import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./i18n/request.js");

// PWA is off. @serwist/next only hooks webpack, and Next 16 builds with
// Turbopack, so the service worker was never generated and /sw.js 404'd in
// production. To re-enable: restore app/sw.js (see git history), drop the
// SerwistProvider back into app/[locale]/layout.js, flip `disable` back to
// `process.env.NODE_ENV === "development"`, and build with a Turbopack-aware
// setup (@serwist/turbopack) or `next build --webpack`.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.js",
  swDest: "public/sw.js",
  disable: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ships a self-contained server bundle so the VPS never has to run
  // `npm ci` or `next build` — the host is CPU-starved and both time out.
  output: "standalone",
  // mongodb-memory-server is a local-dev-only dependency that shells out to a
  // downloaded mongod binary; keep it out of the server bundle entirely.
  serverExternalPackages: ["mongodb-memory-server"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default withSerwist(withNextIntl(nextConfig));
