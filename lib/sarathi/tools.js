import { verseById } from "@/lib/gita/verses";

/**
 * The tools an avatar can call mid-thought.
 *
 * These are what "use everything on the internet" means in practice. A model
 * asked to sound like Srila Prabhupada will happily produce a verse and a
 * purport in his voice that he never wrote; these fetch the real ones, at
 * answer time, so a quotation on screen is a quotation from the book.
 *
 *   getVerse         — his translation and the opening of his purport, from
 *                      vedabase.io (the BBT's own online library).
 *   searchWikipedia  — dates, places and people, for the historical questions
 *                      the dossier does not cover.
 *
 * Both fail soft: a tool that cannot reach its source returns `{ error }`, the
 * model is told so, and the prompt forbids it from citing what it could not
 * verify. Nothing here throws into the request.
 */

const TIMEOUT_MS = 8000;
const USER_AGENT = "IYFPatna-Sarathi/1.0 (https://iyfpatna.com)";
/** A week. The Bhagavad-gita does not change between requests. */
const VERSE_CACHE_SECONDS = 60 * 60 * 24 * 7;
const WIKI_CACHE_SECONDS = 60 * 60 * 24;

export const TOOL_DESCRIPTIONS = `
- "getVerse": getVerse(reference: string) — returns Srila Prabhupada's own translation and the start of
  his purport for a verse, from vedabase.io. Reference formats: "BG 2.13", "SB 1.2.6", "CC Adi 17.21"
  (CC lilas: Adi, Madhya, Antya).
- "searchWikipedia": searchWikipedia(query: string) — returns short English Wikipedia extracts, for
  historical facts about people, places, dates and events.
`;

const CC_LILAS = ["adi", "madhya", "antya"];
const NUMBER = /^\d{1,3}(-\d{1,3})?$/;

/**
 * "BG 2.13" → { book: "bg", path: ["2", "13"], label: "Bhagavad-gita 2.13" }.
 *
 * Every segment is checked against a whitelist before it goes near a URL, so
 * whatever the model writes into `input`, the only host this can request is
 * vedabase.io and the only paths are library verse pages.
 */
export function parseReference(input) {
  const cleaned = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[,:]/g, ".")
    .replace(/\s+/g, " ");

  const bg = cleaned.match(/^(?:bg|bhagavad[- ]?gita|gita)\.? ?(\d{1,2})\.(\d{1,3}(?:-\d{1,3})?)$/);
  if (bg) {
    return { book: "bg", path: [bg[1], bg[2]], label: `Bhagavad-gita ${bg[1]}.${bg[2]}` };
  }

  const sb = cleaned.match(/^(?:sb|srimad[- ]?bhagavatam|bhagavatam)\.? ?(\d{1,2})\.(\d{1,3})\.(\d{1,3}(?:-\d{1,3})?)$/);
  if (sb) {
    return {
      book: "sb",
      path: [sb[1], sb[2], sb[3]],
      label: `Srimad-Bhagavatam ${sb[1]}.${sb[2]}.${sb[3]}`,
    };
  }

  const cc = cleaned.match(/^(?:cc|caitanya[- ]?caritamrta|chaitanya[- ]?charitamrita)\.? ?([a-z]+)\.? ?(\d{1,2})\.(\d{1,3}(?:-\d{1,3})?)$/);
  if (cc && CC_LILAS.includes(cc[1])) {
    const lila = cc[1][0].toUpperCase() + cc[1].slice(1);
    return {
      book: "cc",
      path: [cc[1], cc[2], cc[3]],
      label: `Caitanya-caritamrta ${lila} ${cc[2]}.${cc[3]}`,
    };
  }

  return null;
}

function decodeEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function textOf(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The text of the `<div class="av-{name}">` section. It ends where the next
 * `av-` section, the previous/next-verse links or `<main>` does — whichever
 * comes first. A verse with no purport runs straight into those links, and
 * without the second marker "Text 20 Text 22" ends up in the translation.
 */
const SECTION_ENDS = [/<[^<>]*class="av-[a-z_]+"/, /<[^<>]*class="mt-10 flex justify-between"/, /<\/main>/];

function section(html, name) {
  const start = html.indexOf(`class="av-${name}"`);
  if (start === -1) return "";
  const rest = html.slice(start);
  const ends = SECTION_ENDS.map((marker) => rest.slice(1).search(marker) + 1).filter((index) => index > 0);
  const chunk = rest.slice(0, ends.length ? Math.min(...ends) : 20000);
  // Drop the section's own "Translation" / "Purport" heading.
  return textOf(chunk.replace(/^[^>]*>/, "").replace(/<h2[^>]*>.*?<\/h2>/s, ""));
}

async function getVerse(input) {
  const ref = parseReference(input);
  if (!ref) {
    return {
      forModel: {
        error: `Could not understand the reference "${input}". Use a format like "BG 2.13", "SB 1.2.6" or "CC Adi 17.21".`,
      },
      source: null,
    };
  }

  const url = `https://vedabase.io/en/library/${ref.book}/${ref.path.join("/")}/`;

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: VERSE_CACHE_SECONDS },
    });
    if (response.status === 404) {
      return { forModel: { error: `${ref.label} does not exist. Do not cite it.` }, source: null };
    }
    if (!response.ok) throw new Error(`vedabase ${response.status}`);

    const html = await response.text();
    const translation = section(html, "translation");
    if (!translation) throw new Error("no translation on page");
    const purport = section(html, "purport");

    return {
      forModel: {
        reference: ref.label,
        translation,
        purportExcerpt: purport ? `${purport.slice(0, 1400)}${purport.length > 1400 ? "…" : ""}` : null,
        note: "Translation and purport are Srila Prabhupada's own words from his books.",
      },
      source: { label: ref.label, url },
    };
  } catch (error) {
    console.error("[sarathi] getVerse failed", ref.label, error);

    // The site's own Gita corpus covers the verses the other tools use. Its
    // renderings are ours, not Prabhupada's, and the model is told as much so
    // it paraphrases instead of quoting them as his.
    const local = ref.book === "bg" ? verseById(ref.path.join(".")) : null;
    if (local) {
      return {
        forModel: {
          reference: ref.label,
          translation: local.translation.en,
          note: "vedabase.io was unreachable. This is a plain rendering, NOT Srila Prabhupada's wording — paraphrase it, do not quote it as his.",
        },
        source: { label: ref.label, url },
      };
    }
    return {
      forModel: { error: `Could not fetch ${ref.label} right now. Do not quote it; paraphrase from memory only if you are sure, or choose another point.` },
      source: null,
    };
  }
}

async function searchWikipedia(input) {
  const query = String(input ?? "").trim().slice(0, 200);
  if (!query) return { forModel: { error: "Empty query." }, source: null };

  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&generator=search" +
    `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=2` +
    "&prop=extracts|info&inprop=url&exintro=1&explaintext=1&exchars=1200";

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: WIKI_CACHE_SECONDS },
    });
    if (!response.ok) throw new Error(`wikipedia ${response.status}`);

    const data = await response.json();
    const pages = Object.values(data?.query?.pages ?? {})
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
      .map((page) => ({ title: page.title, extract: page.extract, url: page.fullurl }));

    if (pages.length === 0) {
      return { forModel: { error: `No Wikipedia results for "${query}".` }, source: null };
    }

    return {
      forModel: { results: pages.map(({ title, extract }) => ({ title, extract })) },
      source: { label: `Wikipedia: ${pages[0].title}`, url: pages[0].url },
    };
  } catch (error) {
    console.error("[sarathi] searchWikipedia failed", error);
    return { forModel: { error: "Wikipedia could not be reached. Do not state facts you are unsure of." }, source: null };
  }
}

const TOOLS = { getVerse, searchWikipedia };

/** Runs a tool by name. Unknown names come back as an error the model can read. */
export async function runTool(name, input) {
  const tool = TOOLS[name];
  if (!tool) {
    return { forModel: { error: `There is no tool named "${name}".` }, source: null };
  }
  return tool(input);
}
