"use client";

import NextError from "next/error";
import { useEffect } from "react";
import posthog from "posthog-js";

export default function GlobalError({ error }) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
