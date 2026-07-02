import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Metricas = {
  candidatos: number;
  empresas: number;
  vacantesActivas: number;
  vacantesTotal: number;
  postulaciones: number;
  notifEnviadas: number;
  notifLeidas: number;
  ctr: number; // %
  vistasPromedio: number;
  ratioCandidatosVacante: number;
  ultimosCandidatos: { nombre: string; ciudad: string; area_interes: string; creado_en: string }[];
  ultimasVacantes: { id: string; titulo: string; ciudad: string; vistas: number; creado_en: string }[];
};

async function contar(tabla: string, filtro?: (q: any) => any): Promise<number> {
  const admin = createAdminClient();
  let q = admin.from(tabla).select("*", { count: "exact", head: true });
  if (filtro) q = filtro(q);
  const { count } = await q;
  return count ?? 0;
}

export async function getMetricas(): Promise<Metricas> {
  const admin = createAdminClient();

  const [candidatos, empresas, vacantesTotal, vacantesActivas, postulaciones, notifEnviadas, notifLeidas] =
    await Promise.all([
      contar("candidatos"),
      contar("empresas"),
      contar("vacantes"),
      contar("vacantes", (q) => q.eq("activa", true)),
      contar("postulaciones"),
      contar("notificaciones_wsp"),
      contar("notificaciones_wsp", (q) => q.eq("leido", true)),
    ]);

  const { data: vistasRows } = await admin.from("vacantes").select("vistas");
  const totalVistas = (vistasRows ?? []).reduce((s, r) => s + (r.vistas ?? 0), 0);
  const vistasPromedio = vacantesTotal ? Math.round(totalVistas / vacantesTotal) : 0;

  const { data: ultimosCandidatos } = await admin
    .from("candidatos")
    .select("nombre, ciudad, area_interes, creado_en")
    .order("creado_en", { ascending: false })
    .limit(8);

  const { data: ultimasVacantes } = await admin
    .from("vacantes")
    .select("id, titulo, ciudad, vistas, creado_en")
    .order("creado_en", { ascending: false })
    .limit(8);

  return {
    candidatos,
    empresas,
    vacantesActivas,
    vacantesTotal,
    postulaciones,
    notifEnviadas,
    notifLeidas,
    ctr: notifEnviadas ? Math.round((notifLeidas / notifEnviadas) * 100) : 0,
    vistasPromedio,
    ratioCandidatosVacante: vacantesActivas ? +(candidatos / vacantesActivas).toFixed(1) : 0,
    ultimosCandidatos: (ultimosCandidatos ?? []) as Metricas["ultimosCandidatos"],
    ultimasVacantes: (ultimasVacantes ?? []) as Metricas["ultimasVacantes"],
  };
}

/** Notificaciones WhatsApp recientes con datos del candidato (envío manual Fase 1). */
export async function getNotificacionesRecientes(limite = 25) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notificaciones_wsp")
    .select("*, candidato:candidatos(nombre, whatsapp)")
    .order("enviado_en", { ascending: false })
    .limit(limite);
  return (data ?? []) as any[];
}
