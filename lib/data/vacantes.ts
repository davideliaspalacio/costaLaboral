import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcularScore, esElegible, razonMatch } from "@/lib/matching";
import type { Candidato, Vacante, VacanteConEmpresa, CandidatoMatch, Postulacion } from "@/lib/types";

/** Vacantes activas más recientes (para la landing pública). */
export async function getVacantesRecientes(limite = 6): Promise<VacanteConEmpresa[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select("*, empresa:empresas(id, nombre_negocio, sector, verificada, whatsapp)")
    .eq("activa", true)
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false })
    .limit(limite);
  return (data ?? []) as unknown as VacanteConEmpresa[];
}

/** Ficha de vacante con empresa, SIN incrementar vistas (para metadata/OG/JSON-LD). */
export async function getVacanteSinContar(id: string): Promise<VacanteConEmpresa | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select("*, empresa:empresas(id, nombre_negocio, sector, verificada, whatsapp)")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as VacanteConEmpresa) ?? null;
}

/** Ficha pública de vacante con datos de empresa. Incrementa el contador de vistas. */
export async function getVacantePublica(id: string): Promise<VacanteConEmpresa | null> {
  const data = await getVacanteSinContar(id);
  if (!data) return null;
  const admin = createAdminClient();
  await admin.rpc("increment_vistas", { v_id: id });
  return data;
}

/**
 * Feed PERSONAL del candidato: vacantes activas que pasan el filtro de elegibilidad,
 * ordenadas por score descendente. NO es un buscador infinito (sección 1.3).
 */
export async function getMisMatches(candidato: Candidato): Promise<(Vacante & { score: number })[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select("*")
    .eq("activa", true)
    .eq("area", candidato.area_interes)
    .gt("expira_en", new Date().toISOString())
    .order("creado_en", { ascending: false })
    .limit(60);

  const perfil = {
    ciudad: candidato.ciudad,
    area_interes: candidato.area_interes,
    nivel_educativo: candidato.nivel_educativo,
    disponibilidad: candidato.disponibilidad,
  };

  return ((data ?? []) as Vacante[])
    .filter((v) => esElegible(perfil, v))
    .map((v) => ({ ...v, score: calcularScore(perfil, v) }))
    .sort((a, b) => b.score - a.score || +new Date(b.creado_en) - +new Date(a.creado_en));
}

/** Vacantes de una empresa (para el panel), con conteo de postulaciones. */
export async function getVacantesDeEmpresa(
  empresaId: string,
): Promise<(Vacante & { total_postulaciones: number })[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select("*, postulaciones(count)")
    .eq("empresa_id", empresaId)
    .order("creado_en", { ascending: false });
  return ((data ?? []) as any[]).map((v) => ({
    ...v,
    total_postulaciones: v.postulaciones?.[0]?.count ?? 0,
  }));
}

/** Candidatos postulados a una vacante, ordenados por % de match desc (sección 5.5.1). */
export async function getCandidatosDeVacante(
  vacante: Vacante,
): Promise<CandidatoMatch[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select(
      "*, candidato:candidatos(id, nombre, ciudad, nivel_educativo, area_interes, experiencia, disponibilidad, whatsapp)",
    )
    .eq("vacante_id", vacante.id)
    .order("score_match", { ascending: false });

  return ((data ?? []) as any[]).map((row) => {
    const c = row.candidato;
    const score =
      row.score_match ??
      calcularScore(
        {
          ciudad: c.ciudad,
          area_interes: c.area_interes,
          nivel_educativo: c.nivel_educativo,
          disponibilidad: c.disponibilidad,
        },
        vacante,
      );
    const { candidato: _omit, ...postulacion } = row;
    return { postulacion: postulacion as Postulacion, candidato: c, score: Number(score) };
  });
}
