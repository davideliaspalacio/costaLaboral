import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluarMatch, esRecomendable, perfilDe, type DetalleMatch } from "@/lib/matching";
import { BENEFICIOS_CANDIDATO } from "@/lib/entitlements";
import { compararPortal, estaDestacada } from "@/lib/vacante";
import type { Candidato, Vacante, VacanteConEmpresa, CandidatoMatch, Postulacion } from "@/lib/types";
import type { PlanId } from "@/lib/constants";

export const SELECT_EMPRESA_PUBLICA = "id, nombre_negocio, sector, verificada, whatsapp";

/** Vacantes visibles más recientes (destacadas primero), para la landing. */
export async function getVacantesRecientes(limite = 6): Promise<VacanteConEmpresa[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select(`*, empresa:empresas(${SELECT_EMPRESA_PUBLICA})`)
    .eq("es_publica", true)
    .gt("expira_en", new Date().toISOString())
    .order("publicada_en", { ascending: false })
    .limit(limite * 3);
  return ((data ?? []) as unknown as VacanteConEmpresa[]).sort((a, b) => compararPortal(a, b)).slice(0, limite);
}

/** Vacante con empresa (cualquier estado), SIN incrementar vistas. La página decide si puede mostrarla. */
export async function getVacanteSinContar(id: string): Promise<VacanteConEmpresa | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select(`*, empresa:empresas(${SELECT_EMPRESA_PUBLICA})`)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as VacanteConEmpresa) ?? null;
}

/** Ficha pública. Incrementa el contador de vistas solo si la vacante es pública. */
export async function getVacantePublica(id: string): Promise<VacanteConEmpresa | null> {
  const data = await getVacanteSinContar(id);
  if (!data) return null;
  if (data.es_publica) {
    const admin = createAdminClient();
    await admin.rpc("increment_vistas", { v_id: id });
  }
  return data;
}

export type VacanteRecomendada = VacanteConEmpresa & { score: number; detalle: DetalleMatch };

/**
 * Recomendaciones del candidato: vacantes visibles con score ≥ umbral,
 * ordenadas por score, destacadas y recencia. Orienta; no oculta nada del portal.
 */
export async function getRecomendaciones(candidato: Candidato, limite = 30): Promise<VacanteRecomendada[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select(`*, empresa:empresas(${SELECT_EMPRESA_PUBLICA})`)
    .eq("es_publica", true)
    .gt("expira_en", new Date().toISOString())
    .order("publicada_en", { ascending: false })
    .limit(300);

  const perfil = perfilDe(candidato);
  return ((data ?? []) as unknown as VacanteConEmpresa[])
    .map((v) => {
      const detalle = evaluarMatch(perfil, v);
      return { ...v, score: detalle.score, detalle };
    })
    .filter((v) => esRecomendable(v.detalle))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(estaDestacada(b)) - Number(estaDestacada(a)) ||
        compararPortal(a, b),
    )
    .slice(0, limite);
}

/** Vacantes de una empresa (todas sus etapas), con conteo de postulaciones. */
export async function getVacantesDeEmpresa(
  empresaId: string,
): Promise<(Vacante & { total_postulaciones: number })[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select("*, postulaciones(count)")
    .eq("empresa_id", empresaId)
    .order("creado_en", { ascending: false });
  return ((data ?? []) as (Vacante & { postulaciones?: { count: number }[] })[]).map(({ postulaciones, ...v }) => ({
    ...v,
    total_postulaciones: postulaciones?.[0]?.count ?? 0,
  }));
}

/**
 * Pipeline de una vacante: postulados ordenados por score; a igual score
 * gana la visibilidad del plan del candidato (sección 10) y luego la antigüedad.
 */
export async function getCandidatosDeVacante(vacante: Vacante): Promise<CandidatoMatch[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select(
      "*, candidato:candidatos(id, nombre, ciudad, nivel_educativo, area_interes, experiencia, disponibilidad, whatsapp, plan)",
    )
    .eq("vacante_id", vacante.id)
    .neq("estado", "retirada");

  type Fila = Postulacion & { candidato: CandidatoMatch["candidato"] };
  return ((data ?? []) as unknown as Fila[])
    .filter((row) => row.candidato)
    .map(({ candidato, ...postulacion }) => {
      const detalle = postulacion.match_detalle ?? evaluarMatch(perfilDe(candidato), vacante);
      return { postulacion, candidato, score: Number(postulacion.score_match ?? detalle.score), detalle };
    })
    .sort((a, b) => {
      const prioridad = (p: PlanId) => BENEFICIOS_CANDIDATO[p]?.prioridadRanking ?? 0;
      return (
        b.score - a.score ||
        prioridad(b.candidato.plan) - prioridad(a.candidato.plan) ||
        new Date(a.postulacion.creado_en).getTime() - new Date(b.postulacion.creado_en).getTime()
      );
    });
}
