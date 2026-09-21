#!/usr/bin/env node
/**
 * Smoke test for a running build — the gate the deploy workflow puts in front
 * of, and behind, every release.
 *
 *   node scripts/smoke-test.mjs http://localhost:3000   # the build, in CI
 *   node scripts/smoke-test.mjs https://iyfpatna.in     # production, after
 *
 * For every page below it checks that:
 *   - the page answers 200 with HTML;
 *   - the page links at least one stylesheet;
 *   - every /_next/static file the HTML references answers 200 (and a .css
 *     file answers as text/css). A page left over from a previous build
 *     points at chunk hashes the current build no longer has, so this is what
 *     catches an unstyled or half-broken page served from a stale cache;
 *   - the home pages carry the contact phone, email and hero image from
 *     lib/site-config.js *in this checkout*. A green HTTP status alone said
 *     nothing about whether the new release was what was being served.
 *
 * Exits non-zero, listing every failure, if anything is wrong.
 */
import { readFile } from "node:fs/promises";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");

// Pages that must render without a database: CI builds and boots the server
// with no MONGODB_URI, and production must survive Mongo being unreachable.
const PAGES = [
  "/en",
  "/hi",
  "/en/about",
  "/hi/about",
  "/en/gallery",
  "/hi/gallery",
  "/en/schedule",
  "/en/donate",
  "/en/privacy",
  "/en/terms",
];
const HOME_PAGES = new Set(["/en", "/hi"]);

// site-config has no imports, only `export const`s, so it can be loaded as a
// module straight from source — the expected values are always this commit's.
const configSource = await readFile(new URL("../lib/site-config.js", import.meta.url), "utf8");
const { ORG, HERO_IMAGE } = await import(
  `data:text/javascript;charset=utf-8,${encodeURIComponent(configSource)}`
);

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  FAIL ${msg}`);
};

/** fetch with retries: the link to the VPS drops often, a blip is not a bug. */
async function get(path, attempts = 4) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(base + path, {
        headers: { "user-agent": "iyfpatna-smoke-test", "accept-language": "en" },
        signal: AbortSignal.timeout(45_000),
      });
      // A 5xx right after a restart can be the server still warming up.
      if (res.status >= 500 && i < attempts) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastError = err;
      if (i < attempts) await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
  throw lastError;
}

function includesAny(html, value) {
  // next/image puts remote URLs through /_next/image?url=<encoded>, so the
  // hero shows up encoded rather than verbatim.
  return html.includes(value) || html.includes(encodeURIComponent(value));
}

const assets = new Set();

for (const path of PAGES) {
  console.log(`page ${path}`);
  let res;
  try {
    res = await get(path);
  } catch (err) {
    fail(`${path}: request failed (${err.message})`);
    continue;
  }
  const type = res.headers.get("content-type") || "";
  if (res.status !== 200) fail(`${path}: HTTP ${res.status}`);
  if (!type.includes("text/html")) fail(`${path}: content-type ${type}`);
  const html = await res.text();

  const refs = [...html.matchAll(/\/_next\/static\/[^"'\s\\)]+/g)].map((m) => m[0]);
  if (!refs.some((r) => r.endsWith(".css"))) fail(`${path}: no stylesheet linked`);
  refs.forEach((r) => assets.add(r));

  if (HOME_PAGES.has(path)) {
    if (!html.includes(ORG.phone)) fail(`${path}: contact phone "${ORG.phone}" missing`);
    if (!html.includes(ORG.email)) fail(`${path}: contact email "${ORG.email}" missing`);
    if (!includesAny(html, HERO_IMAGE)) fail(`${path}: hero image ${HERO_IMAGE} missing`);
  }
}

console.log(`checking ${assets.size} static assets`);
for (const asset of assets) {
  try {
    const res = await get(asset);
    if (res.status !== 200) {
      fail(`${asset}: HTTP ${res.status}`);
    } else if (asset.endsWith(".css") && !(res.headers.get("content-type") || "").includes("text/css")) {
      fail(`${asset}: served as ${res.headers.get("content-type")}`);
    }
    await res.arrayBuffer();
  } catch (err) {
    fail(`${asset}: request failed (${err.message})`);
  }
}

if (failures.length) {
  console.error(`\nsmoke test FAILED against ${base} — ${failures.length} problem(s):`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log(`\nsmoke test passed against ${base}`);
