import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Postulacion, PostulacionHistorial, Vacante } from "@/lib/types";

export type VacanteDePostulacion = Pick<
  Vacante,
  "id" | "titulo" | "ciudad" | "modalidad" | "tipo" | "salario_min" | "salario_max" | "estado" | "es_publica" | "expira_en"
> & { empresa: { nombre_negocio: string } | null };

/** Historial visible para el candidato (sin notas internas de la empresa). */
export type HistorialCandidato = Omit<PostulacionHistorial, "nota" | "actor_id" | "postulacion_id">;

export type PostulacionDeCandidato = Postulacion & {
  vacante: VacanteDePostulacion | null;
  historial: HistorialCandidato[];
};

/** Postulaciones del candidato con la vacante, la empresa y el historial (cronológico). */
export async function getPostulacionesDeCandidato(candidatoId: string): Promise<PostulacionDeCandidato[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select(
      `*,
       vacante:vacantes(id, titulo, ciudad, modalidad, tipo, salario_min, salario_max, estado, es_publica, expira_en,
         empresa:empresas(nombre_negocio)),
       historial:postulacion_historial(id, estado_anterior, estado_nuevo, actor_tipo, creado_en)`,
    )
    .eq("candidato_id", candidatoId)
    .order("creado_en", { ascending: false });

  return ((data ?? []) as unknown as PostulacionDeCandidato[]).map((p) => ({
    ...p,
    historial: [...(p.historial ?? [])].sort(
      (a, b) => new Date(a.creado_en).getTime() - new Date(b.creado_en).getTime() || a.id - b.id,
    ),
  }));
}

/** IDs de vacantes a las que el candidato ya se postuló (para marcar en el feed). */
export async function idsPostulados(candidatoId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin.from("postulaciones").select("vacante_id").eq("candidato_id", candidatoId);
  return new Set((data ?? []).map((p) => p.vacante_id as string));
}

export type EstadoPostulacionFicha = Pick<Postulacion, "id" | "estado" | "creado_en" | "score_match">;

/** Postulación del candidato a una vacante (para la ficha), o null. */
export async function getEstadoPostulacion(
  candidatoId: string,
  vacanteId: string,
): Promise<EstadoPostulacionFicha | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select("id, estado, creado_en, score_match")
    .eq("candidato_id", candidatoId)
    .eq("vacante_id", vacanteId)
    .maybeSingle();
  return (data as EstadoPostulacionFicha) ?? null;
}
