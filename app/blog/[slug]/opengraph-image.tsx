import { ImageResponse } from "next/og";
import { getPostBlog } from "@/lib/blog/posts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Artículo del blog de CostaLaboral";

// Imagen de vista previa (Open Graph) al compartir el artículo en WhatsApp/redes.
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBlog(slug);
  const titulo = (post?.titulo ?? "Blog de empleo en la Costa").slice(0, 90);
  const categoria = post?.categoria ?? "Empleo en la Costa";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fffbf2",
          padding: "60px",
          border: "18px solid #17140f",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 14,
              background: "#ffd75e",
              border: "4px solid #17140f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
              color: "#17140f",
            }}
          >
            CL
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#17140f" }}>
            CostaLaboral · Blog
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: "#0c7d76",
              marginBottom: 14,
            }}
          >
            {categoria}
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#17140f",
              lineHeight: 1.05,
            }}
          >
            {titulo}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            fontWeight: 700,
            color: "#17140f",
          }}
        >
          <div>Consejos de empleo para la Costa</div>
          <div style={{ color: "#756c5b" }}>costalaboral.co</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
