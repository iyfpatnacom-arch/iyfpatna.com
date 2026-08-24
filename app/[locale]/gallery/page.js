import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";
import { dbConnect } from "@/lib/db/connect";
import GalleryItem from "@/models/GalleryItem";
import { toPlain } from "@/lib/serialize";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

export default async function GalleryPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("gallery");

  await dbConnect();
  const items = await GalleryItem.find({}).sort({ order: 1 }).lean();

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 md:px-10 md:py-20">
      <span className="text-xs font-bold uppercase tracking-widest text-gold-ink">
        {t("eyebrow")}
      </span>
      <h1 className="mt-3 text-3xl font-extrabold text-foreground md:text-5xl">
        {t("title")}
      </h1>

      {items.length === 0 ? (
        <p className="mt-10 text-center text-foreground/50">{t("empty")}</p>
      ) : (
        <GalleryGrid items={toPlain(items)} />
      )}
    </div>
  );
}
