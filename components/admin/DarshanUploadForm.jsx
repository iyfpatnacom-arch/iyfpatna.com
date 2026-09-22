"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadDailyDarshan } from "@/app/[locale]/admin/darshan/actions";

/** Long edge after shrinking. The hero is never shown wider than ~1000 CSS px, so this covers 2x screens. */
const MAX_EDGE = 2000;
const QUALITY = 0.88;

/**
 * Shrinks a phone photo before upload.
 *
 * A camera JPEG is 3–8 MB; this makes it a few hundred KB, which is what makes
 * the upload bearable on mobile data at 5 am and keeps it inside the server
 * action's body limit. `createImageBitmap` with `imageOrientation` applies the
 * EXIF rotation, so a portrait photo doesn't arrive sideways.
 *
 * If the browser can't decode the file (an unusual format), the original goes
 * up unchanged and the server's type and size checks decide.
 */
async function shrink(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], "darshan.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Pick a photo, check the preview, publish.
 *
 * The preview is the point of the form: the photo goes straight onto the
 * front page, so the admin should see exactly what they picked before it
 * does — a wrong photo from the camera roll is the likeliest mistake.
 */
export function DarshanUploadForm({ hasToday }) {
  const t = useTranslations("admin");
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  // The blob: URL is made when the file is picked and released when it is
  // replaced — and, via the ref, when the page is left with one still showing.
  const previewRef = useRef(null);
  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  function select(next) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = next ? URL.createObjectURL(next) : null;
    setPreview(previewRef.current);
    setFile(next);
  }

  function reset() {
    select(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;
    setError(null);

    startTransition(async () => {
      try {
        const body = new FormData();
        body.append("file", await shrink(file));
        const result = await uploadDailyDarshan(body);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        toast.success(t(result.replaced ? "darshan_replaced" : "darshan_saved"));
        reset();
      } catch {
        toast.error(t("darshan_error_upload"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label
        htmlFor="darshan-file"
        className="flex cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:border-primary/50"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local blob: preview, nothing to optimise
          <img
            src={preview}
            alt={t("darshan_preview_alt")}
            className="max-h-96 w-auto rounded-xl object-contain"
          />
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
              <ImageUp className="size-6" aria-hidden="true" />
            </span>
            <span className="font-medium text-foreground">{t("darshan_pick")}</span>
            <span className="text-sm text-muted-foreground">{t("darshan_pick_hint")}</span>
          </>
        )}
      </label>
      <input
        ref={inputRef}
        id="darshan-file"
        name="file"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={isPending}
        onChange={(event) => {
          setError(null);
          select(event.target.files?.[0] ?? null);
        }}
      />

      {error ? (
        <p className="mt-3 text-sm font-medium text-destructive">{t(error)}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          disabled={isPending || !file}
          className="rounded-full"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {isPending
            ? t("darshan_uploading")
            : t(hasToday ? "darshan_submit_replace" : "darshan_submit")}
        </Button>
        {file && !isPending ? (
          <Button type="button" size="lg" variant="outline" className="rounded-full" onClick={reset}>
            {t("darshan_clear")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
