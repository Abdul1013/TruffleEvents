import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EventTruffle — Secure Ticketing",
    short_name: "EventTruffle",
    description: "AES-256-GCM encrypted event tickets with dynamic QR codes",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FDFBD4",
    theme_color: "#713600",
    categories: ["entertainment", "utilities"],
    icons: [],
    screenshots: [],
  };
}
