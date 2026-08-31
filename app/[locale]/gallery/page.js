import { setRequestLocale, getTranslations } from "next-intl/server";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { routing } from "@/i18n/routing";
import { GALLERY_IMAGES } from "@/lib/site-config";

export const revalidate = 300;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "gallery" });
  return { title: t("title"), description: t("subtitle") };
}

/**
 * Photographs come from the config list first, then anything the database
 * adds.
 *
 * The config list is the set the temple has actually supplied, so it is the
 * floor: the page is never empty and never depends on Mongo being reachable.
 * Uploads recorded as GalleryItem rows are appended after them.
 */
async function loadGallery() {
  try {
    const { dbConnect } = await import("@/lib/db/connect");
    const { default: GalleryItem } = await import("@/models/GalleryItem");
    const { toPlain } = await import("@/lib/serialize");

    await dbConnect();
    const rows = toPlain(await GalleryItem.find({}).sort({ order: 1 }).lean());
    return [...GALLERY_IMAGES, ...rows];
  } catch (error) {
    console.warn("[gallery] database unavailable, using supplied photos only:", error.message);
    return GALLERY_IMAGES;
  }
}

export default async function GalleryPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("gallery");
  const items = await loadGallery();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold tracking-wider text-primary uppercase">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        {t("subtitle")}
      </p>

      {items.length === 0 ? (
        <p className="mt-12 text-center text-muted-foreground">{t("empty")}</p>
      ) : (
        <GalleryGrid items={items} />
      )}
    </div>
  );
}
