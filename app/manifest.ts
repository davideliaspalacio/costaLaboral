import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CostaLaboral",
    short_name: "CostaLaboral",
    description: "La plataforma de empleo del Caribe colombiano.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffbf2",
    theme_color: "#0c7d76",
    lang: "es-CO",
    categories: ["business", "productivity"],
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
