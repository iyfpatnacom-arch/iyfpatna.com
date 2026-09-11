import { PRABHUPADA } from "@/lib/sarathi/personas/srila-prabhupada";

/**
 * Persona dossiers by avatar slug. Server-only.
 *
 * An avatar listed as `live` in `lib/sarathi/avatars.js` with no entry here
 * gets a 404 from the API rather than a model improvising a teacher from
 * nothing — adding an acharya means writing his dossier first.
 */
const PERSONAS = {
  [PRABHUPADA.slug]: PRABHUPADA,
};

export function personaBySlug(slug) {
  return PERSONAS[slug] ?? null;
}
