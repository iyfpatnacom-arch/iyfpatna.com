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
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
