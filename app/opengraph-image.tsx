import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "CostaLaboral — la plataforma de empleo del Caribe colombiano";

// Imagen de vista previa por defecto (home y páginas sin OG propia).
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c7d76",
          padding: "64px",
          border: "18px solid #17140f",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#ffd75e",
              border: "4px solid #17140f",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              fontWeight: 800,
              color: "#17140f",
            }}
          >
            CL
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: "#ffffff" }}>CostaLaboral</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 78, fontWeight: 800, color: "#ffffff", lineHeight: 1.02 }}>
            El camello está aquí, en la Costa
          </div>
          <div style={{ fontSize: 34, fontWeight: 600, color: "#ffe79a", marginTop: 20 }}>
            Vacantes que encajan contigo, directo a tu WhatsApp.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 700, color: "#ffffff" }}>
          <div>Empresas publican gratis</div>
          <div style={{ color: "#ffe79a" }}>costalaboral.co</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
