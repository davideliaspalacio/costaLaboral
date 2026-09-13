import { ImageResponse } from "next/og";
import { getVacanteSinContar } from "@/lib/data/vacantes";
import { formatSalario } from "@/lib/utils";
import { esVisibleEnPortal } from "@/lib/vacante";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vacante en CostaLaboral";

// Imagen de vista previa (Open Graph) al compartir la vacante en WhatsApp/redes.
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const encontrada = await getVacanteSinContar(id);
  // Vacantes no públicas no exponen su contenido en la vista previa.
  const v = encontrada && esVisibleEnPortal(encontrada) ? encontrada : null;
  const titulo = (v?.titulo ?? "Vacante en la Costa").slice(0, 60);
  const ciudad = v?.ciudad ?? "Caribe colombiano";
  const salario = v ? formatSalario(v.salario_min, v.salario_max) : "";
  const empresa = v?.empresa?.nombre_negocio ?? "";

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
          <div style={{ fontSize: 36, fontWeight: 800, color: "#17140f" }}>CostaLaboral</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#0c7d76", marginBottom: 14 }}>{empresa ? `${empresa} · ${ciudad}` : ciudad}</div>
          <div style={{ fontSize: 74, fontWeight: 800, color: "#17140f", lineHeight: 1.05 }}>{titulo}</div>
          {salario ? (
            <div style={{ fontSize: 46, fontWeight: 800, color: "#ff5c39", marginTop: 18 }}>{salario}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, fontWeight: 700, color: "#17140f" }}>
          <div>Postúlate gratis</div>
          <div style={{ color: "#756c5b" }}>costalaboral.co</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
