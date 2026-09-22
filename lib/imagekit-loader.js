/**
 * ImageKit resizes on its own CDN, so photos hosted there skip the Next
 * optimizer entirely — on the VPS that optimizer is CPU-bound and was what
 * made the gallery grid crawl in. Anything else still goes through next/image.
 *
 * A loader is a function, and functions can't cross from a server component
 * to next/image, so server components use it through `IkImage`.
 */
export function imagekitLoader({ src, width, quality }) {
  const url = new URL(src);
  url.searchParams.set("tr", `w-${width},q-${quality || 75}`);
  return url.toString();
}

export const loaderFor = (src) =>
  typeof src === "string" && src.startsWith("https://ik.imagekit.io/")
    ? imagekitLoader
    : undefined;
