"use client";

import Image from "next/image";
import { loaderFor } from "@/lib/imagekit-loader";

/** next/image with the ImageKit loader picked for ImageKit URLs — usable from server components. */
export function IkImage({ src, alt, ...props }) {
  return <Image src={src} alt={alt} loader={loaderFor(src)} {...props} />;
}
