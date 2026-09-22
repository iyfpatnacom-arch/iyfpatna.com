#!/usr/bin/env node
/**
 * Merges secrets from a local env file into the VPS's .env.production and
 * restarts the app.
 *
 *   node scripts/sync-env.mjs --dry-run          # show which keys would change
 *   node scripts/sync-env.mjs                    # merge .env.local, restart
 *   node scripts/sync-env.mjs --only CLERK_SECRET_KEY,MONGODB_URI
 *   node scripts/sync-env.mjs --only RAZORPAY_KEY_ID,RAZORPAY_KEY_SECRET,RAZORPAY_WEBHOOK_SECRET
 *   node scripts/sync-env.mjs --unset CCAVENUE_MERCHANT_ID
 *   node scripts/sync-env.mjs --unset SOME_KEY
 *   node scripts/sync-env.mjs --list             # key names on the server
 *
 * It merges rather than overwrites: keys that exist only on the server
 * (ORDER_LINK_SECRET, RESEND_API_KEY, …) are kept. Empty local values and
 * localhost URLs are skipped so a dev file cannot blank out production.
 * Values are never printed — only key names.
 *
 * The server file is `source`d by bash (start.sh), so every written value is
 * single-quoted; an unquoted MongoDB URI's `&` would otherwise background it.
 *
 * NEXT_PUBLIC_* values are inlined at build time, so changing them here does
 * nothing for the browser — set them as GitHub repository variables instead
 * (see .github/workflows/deploy.yml) and redeploy.
 *
 * Connection: DEPLOY_HOST (72.61.246.174), DEPLOY_USER (root),
 * DEPLOY_KEY (~/.ssh/iyf_deploy), DEPLOY_DIR, PM2_APP (iyfpatna).
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const HOST = process.env.DEPLOY_HOST || "72.61.246.174";
const USER = process.env.DEPLOY_USER || "root";
const KEY = process.env.DEPLOY_KEY || join(homedir(), ".ssh", "iyf_deploy");
const DIR = process.env.DEPLOY_DIR || "/home/iyfpatna/htdocs/iyfpatna.in";
const APP = process.env.PM2_APP || "iyfpatna";
const REMOTE = `${DIR}/.env.production`;

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const values = (name) =>
  args.flatMap((a, i) => (a === name && args[i + 1] ? [args[i + 1]] : []));

const dryRun = flag("--dry-run");
const noRestart = flag("--no-restart");
const file = values("--file")[0] || ".env.local";
const only = new Set(values("--only").flatMap((v) => v.split(",")).filter(Boolean));
const unset = new Set(values("--unset").flatMap((v) => v.split(",")).filter(Boolean));

function parse(text) {
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/'\\''/g, "'");
    else if (/^".*"$/.test(v)) v = v.slice(1, -1);
    map.set(m[1], v);
  }
  return map;
}

const quote = (v) => `'${v.replace(/'/g, `'\\''`)}'`;

function ssh(command, input) {
  const res = spawnSync(
    "ssh",
    ["-i", KEY, "-o", "BatchMode=yes", "-o", "ConnectTimeout=30", `${USER}@${HOST}`, command],
    { input, encoding: "utf8" }
  );
  if (res.status !== 0) {
    console.error(res.stderr || res.error?.message || "ssh failed");
    process.exit(1);
  }
  return res.stdout;
}

const remoteText = ssh(`cat ${REMOTE} 2>/dev/null || true`);
const remote = parse(remoteText);

if (flag("--list")) {
  console.log([...remote.keys()].sort().join("\n") || "(empty)");
  process.exit(0);
}

const updates = new Map();
if (!flag("--no-file")) {
  for (const [k, v] of parse(readFileSync(file, "utf8"))) {
    if (only.size && !only.has(k)) continue;
    if (!v || /localhost|127\.0\.0\.1/.test(v)) continue;
    updates.set(k, v);
  }
}
for (const pair of values("--set")) {
  const i = pair.indexOf("=");
  if (i > 0) updates.set(pair.slice(0, i), pair.slice(i + 1));
}
// Production refuses to take payments without it (lib/payments/order-link.js).
if (!remote.get("ORDER_LINK_SECRET") && !updates.has("ORDER_LINK_SECRET") && !only.size) {
  updates.set("ORDER_LINK_SECRET", randomBytes(32).toString("hex"));
}
if (!remote.get("NEXT_PUBLIC_SITE_URL") && !updates.has("NEXT_PUBLIC_SITE_URL") && !only.size) {
  updates.set("NEXT_PUBLIC_SITE_URL", "https://iyfpatna.in");
}

const changed = [...updates].filter(([k, v]) => remote.get(k) !== v).map(([k]) => k);
const removed = [...unset].filter((k) => remote.has(k));

for (const k of changed) console.log(`${remote.has(k) ? "update" : "add   "} ${k}`);
for (const k of removed) console.log(`remove ${k}`);
// The key ID is public (it is sent to every browser at checkout), so naming
// its mode is safe; it is also the only thing that decides live vs test.
const razorpayKey = updates.get("RAZORPAY_KEY_ID") ?? remote.get("RAZORPAY_KEY_ID");
if (razorpayKey) {
  console.log(`\nRazorpay will run in ${razorpayKey.startsWith("rzp_live_") ? "LIVE" : "test"} mode.`);
}
if (!changed.length && !removed.length) {
  console.log("Nothing to change.");
  process.exit(0);
}
if (dryRun) {
  console.log("\n(dry run — nothing written)");
  process.exit(0);
}

// Rewrite in place so the server file keeps its order and comments.
const seen = new Set();
const lines = remoteText.split(/\r?\n/).flatMap((line) => {
  const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  if (!m) return [line];
  if (unset.has(m[1])) return [];
  if (!updates.has(m[1])) return [line];
  seen.add(m[1]);
  return [`${m[1]}=${quote(updates.get(m[1]))}`];
});
while (lines.length && lines.at(-1) === "") lines.pop();
for (const [k, v] of updates) if (!seen.has(k)) lines.push(`${k}=${quote(v)}`);

ssh(
  `set -e; cd ${DIR}; umask 077; ` +
    `[ -f .env.production ] && cp -p .env.production .env.production.bak-$(date +%Y%m%d%H%M%S); ` +
    `cat > .env.production.tmp; mv .env.production.tmp .env.production; chmod 600 .env.production; ` +
    `chown iyfpatna:iyfpatna .env.production 2>/dev/null || true`,
  lines.join("\n") + "\n"
);
console.log(`\nWrote ${REMOTE} (previous copy backed up).`);

if (!noRestart) {
  ssh(`pm2 restart ${APP} --update-env >/dev/null && pm2 save >/dev/null`);
  console.log(`Restarted pm2 app "${APP}".`);
}
