"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Theme is deliberately mounted *outside* ClerkProvider in the root layout so
 * switching light/dark never depends on auth being configured or signed in.
 */
export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="iyf-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
