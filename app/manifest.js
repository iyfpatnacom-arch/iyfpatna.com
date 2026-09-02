export default function manifest() {
  return {
    name: "ISKCON Youth Forum Patna",
    short_name: "IYF Patna",
    description:
      "A community of students in Patna practising bhakti-yoga — kirtan, Gita study, seva and festivals.",
    start_url: "/hi",
    display: "standalone",
    background_color: "#100a06",
    theme_color: "#100a06",
    // The ISKCON lotus, knocked out of the logo's own red. Files live in
    // `public/` rather than behind the `app/icon` convention so the manifest
    // can point at stable, unhashed URLs.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
