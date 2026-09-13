import type { NextRequest } from "next/server";
import { getUsuario } from "@/lib/auth";
import { getCandidatosDeVacante } from "@/lib/data/vacantes";
import { filtrarCandidatos, generarCsv, getVacantePropia, parseFiltrosPipeline } from "@/lib/data/empresa";
import { getBeneficiosEmpresa } from "@/lib/billing/suscripciones";
import { limitar } from "@/lib/rate-limit";
import { log } from "@/lib/log";
import { estadoPostulacionInfo } from "@/lib/constants";
import { labelArea, labelDisponibilidad, labelNivel, LABEL_FUENTE } from "@/app/empresa/_components/etiquetas";

export const dynamic = "force-dynamic";

const json = (error: string, status: number, headers?: Record<string, string>) =>
  Response.json({ error }, { status, headers: { "Cache-Control": "no-store", ...headers } });

/** Exporta los postulados de una vacante en CSV (Empresa Pro). Respeta los filtros del pipeline. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ vacanteId: string }> }) {
  const sesion = await getUsuario();
  if (!sesion || sesion.tipo !== "empresa") return json("No autorizado", 401);
  const empresaId = sesion.user.id;

  const { vacanteId } = await params;
  const vacante = await getVacantePropia(empresaId, vacanteId);
  if (!vacante) return json("Vacante no encontrada", 404);

  const { beneficios } = await getBeneficiosEmpresa(empresaId);
  if (!beneficios.exportarCsv) return json("La exportación es parte de Empresa Pro", 403);

  const limite = await limitar("exportar", empresaId);
  if (!limite.permitido) return json("Demasiadas exportaciones. Intenta más tarde.", 429, { "Retry-After": String(limite.reintentarEnSeg) });

  const filtros = parseFiltrosPipeline(Object.fromEntries(req.nextUrl.searchParams));
  const candidatos = filtrarCandidatos(await getCandidatosDeVacante(vacante), filtros);

  const csv = generarCsv(
    ["Posición", "Nombre", "Score", "Estado", "Ciudad", "Nivel educativo", "Área de interés", "Disponibilidad", "WhatsApp", "Fuente", "Fecha de postulación", "Experiencia", "Mensaje"],
    candidatos.map((c, i) => [
      i + 1,
      c.candidato.nombre,
      c.score,
      estadoPostulacionInfo(c.postulacion.estado).label,
      c.candidato.ciudad,
      labelNivel(c.candidato.nivel_educativo),
      labelArea(c.candidato.area_interes),
      labelDisponibilidad(c.candidato.disponibilidad),
      c.candidato.whatsapp,
      c.postulacion.fuente ? (LABEL_FUENTE[c.postulacion.fuente] ?? c.postulacion.fuente) : "",
      new Date(c.postulacion.creado_en).toLocaleString("es-CO", { timeZone: "America/Bogota" }),
      c.candidato.experiencia ?? "",
      c.postulacion.mensaje ?? "",
    ]),
  );

  // TODO(base): no existe acción de auditoría "vacante.exportada"; por ahora queda en el log estructurado.
  log.info("export_csv", { empresaId, vacanteId, filas: candidatos.length });

  const slug =
    vacante.titulo
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "vacante";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="postulados-${slug}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
