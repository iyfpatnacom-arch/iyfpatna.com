/**
 * Hooks `alias-loader.mjs` into the module resolver for this process.
 *
 * Its own file because `node --import` needs a module that *calls* `register`,
 * rather than the loader itself. Used by `npm run verify:marathon`.
 */
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
