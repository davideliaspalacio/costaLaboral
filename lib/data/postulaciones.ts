import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { estadoPlan, type EstadoPlan } from "@/lib/plan";
import type { Candidato } from "@/lib/types";

/** Nº de postulaciones del candidato dentro de la ventana de 90 días vigente. */
export async function contarPostulacionesEnVentana(candidato: Candidato): Promise<number> {
  const admin = createAdminClient();
  const { ventanaInicio } = estadoPlan(candidato, 0);
  const { count } = await admin
    .from("postulaciones")
    .select("*", { count: "exact", head: true })
    .eq("candidato_id", candidato.id)
    .gte("creado_en", ventanaInicio.toISOString());
  return count ?? 0;
}

/** Estado del plan (límites, restantes, puedeAplicar) del candidato. */
export async function estadoPlanDeCandidato(candidato: Candidato): Promise<EstadoPlan> {
  const usadas = await contarPostulacionesEnVentana(candidato);
  return estadoPlan(candidato, usadas);
}

/** Historial de postulaciones del candidato con datos básicos de la vacante. */
export async function getPostulacionesDeCandidato(candidatoId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select(
      "*, vacante:vacantes(id, titulo, ciudad, modalidad, area, salario_min, salario_max, tiene_contrato, activa, creado_en)",
    )
    .eq("candidato_id", candidatoId)
    .order("creado_en", { ascending: false });
  return (data ?? []) as any[];
}

/** IDs de vacantes a las que el candidato ya se postuló (para marcar en el feed). */
export async function idsPostulados(candidatoId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select("vacante_id")
    .eq("candidato_id", candidatoId);
  return new Set((data ?? []).map((p) => p.vacante_id as string));
}
