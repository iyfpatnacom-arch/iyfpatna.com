/**
 * Teaches plain `node` the two import conventions the bundler provides.
 *
 * The app's modules are written for Next.js, which resolves `@/foo` against
 * the project root (`jsconfig.json`) and fills in a missing `.js` extension.
 * Node ESM does neither, so an app module cannot be imported by a script run
 * with bare node. `lib/db/seedData.js` sidesteps that by using relative,
 * fully-extensioned imports throughout (see the note on `SETTING_KEYS`), which
 * works but only for files written with the seed in mind.
 *
 * `scripts/verify-marathon.mjs` needs the opposite: it has to import the very
 * modules the app runs — `lib/marathon/stats.js`, the receipt builders, the
 * models — because the point of it is to check *those*, not copies of them. So
 * the two conventions are resolved here, once, rather than a dozen app files
 * being rewritten to suit a script.
 *
 * Registered through `node --import ./scripts/alias-register.mjs`. Resolution
 * only — nothing is transformed, so what runs is exactly what Next.js runs.
 */
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/** The first of the bundler's candidates that is actually a file. */
function firstFile(href) {
  for (const candidate of [href, `${href}.js`, `${href}.mjs`, `${href}/index.js`]) {
    try {
      if (statSync(fileURLToPath(candidate)).isFile()) return candidate;
    } catch {
      /* Not there — try the next shape. */
    }
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let target = null;

  if (specifier.startsWith("@/")) {
    target = pathToFileURL(join(root, specifier.slice(2))).href;
  } else if (
    context.parentURL?.startsWith("file:") &&
    (specifier.startsWith("./") || specifier.startsWith("../"))
  ) {
    target = new URL(specifier, context.parentURL).href;
  }

  if (target) {
    const resolved = firstFile(target);
    if (resolved) return nextResolve(resolved, context);
  }

  /* Anything else — a bare package, a node: builtin, a path that already
     resolves — is none of this loader's business. */
  return nextResolve(specifier, context);
}
