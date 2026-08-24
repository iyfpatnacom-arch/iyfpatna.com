import { setRequestLocale, getTranslations } from "next-intl/server";
import { dbConnect } from "@/lib/db/connect";
import KirtanTrack from "@/models/KirtanTrack";
import { toPlain } from "@/lib/serialize";
import { KirtanPlayer } from "@/components/playground/KirtanPlayer";

export const dynamic = "force-dynamic";

export default async function KirtanLibraryPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("playground.kirtan");

  await dbConnect();
  const tracks = await KirtanTrack.find({}).sort({ order: 1 }).lean();

  return (
    <div className="mx-auto max-w-2xl px-5 py-14 md:px-10 md:py-20">
      <h1 className="text-3xl font-extrabold text-foreground md:text-4xl">{t("title")}</h1>
      <p className="mt-2 text-foreground/60">{t("subtitle")}</p>

      {tracks.length === 0 ? (
        <p className="mt-10 text-center text-foreground/50">{t("empty")}</p>
      ) : (
        <KirtanPlayer tracks={toPlain(tracks)} />
      )}
    </div>
  );
}
