import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { dbConnect } from "@/lib/db/connect";
import KirtanTrack from "@/models/KirtanTrack";
import { toPlain } from "@/lib/serialize";
import { ToolShell } from "@/components/playground/ToolShell";
import { KirtanPlayer } from "@/components/playground/KirtanPlayer";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "playground.tools.kirtan" });
  return { title: t("name"), description: t("tagline") };
}

/**
 * Recordings are worth showing when they exist, so this page does read the
 * database — but it may never fail because of it. The built-in lyric sheets in
 * `lib/kirtan/library.js` are the page's actual content; a row from Mongo only
 * ever adds a recording on top. So the query is wrapped, an unreachable
 * database yields an empty list, and the page renders exactly as it does today.
 *
 * Revalidated rather than `force-dynamic` for the same reason: nothing here
 * changes per request, and a page that is prerendered cannot be taken down by
 * a database at request time.
 */
export const revalidate = 3600;

async function loadTracks() {
  try {
    await dbConnect();
    const tracks = await KirtanTrack.find({}).sort({ order: 1 }).lean();
    return toPlain(tracks);
  } catch (error) {
    console.error("[kirtan] track read failed, showing the built-in sheets", error);
    return [];
  }
}

export default async function KirtanLibraryPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tracks = await loadTracks();

  return (
    <ToolShell toolKey="kirtan">
      <KirtanPlayer tracks={tracks} />
    </ToolShell>
  );
}
