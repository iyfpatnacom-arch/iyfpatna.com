"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The receipt download, offered as a button and taken automatically once.
 *
 * The route answers with `Content-Disposition: attachment`, so a plain anchor
 * click saves the file and leaves the page where it is — no blob URL, no fetch.
 *
 * "Once" means once per browser session, not once per render: someone who
 * bookmarks their order page and opens it next week should not have a file
 * pushed at them, and React strict mode mounts effects twice in development —
 * the same guard covers both.
 */
export function ReceiptDownload({ url, filename, auto = false, label, autoNote }) {
  const hidden = useRef(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!auto) return;

    const key = `iyf:receipt:${filename}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* Private browsing denies sessionStorage. Offering the download again is
         better than never offering it. */
    }

    /* A beat after paint, so the browser attributes the download to a settled
       page — firing in the same frame as the arrival from the gateway is what
       gets a download silently discarded. */
    const timer = setTimeout(() => {
      hidden.current?.click();
      setDownloaded(true);
    }, 900);

    return () => clearTimeout(timer);
  }, [auto, filename]);

  return (
    <div>
      <a ref={hidden} href={url} download={filename} className="hidden" aria-hidden="true" tabIndex={-1}>
        {label}
      </a>

      <Button
        render={<a href={url} download={filename} />}
        variant="outline"
        className="h-11 w-full rounded-full"
      >
        <Download className="size-4" aria-hidden="true" />
        {label}
      </Button>

      {auto && downloaded ? (
        <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">{autoNote}</p>
      ) : null}
    </div>
  );
}
