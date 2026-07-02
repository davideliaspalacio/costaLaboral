/* ============================================================
   Motor de matching — Fase 1 (reglas simples, sin IA).
   Score = Ciudad 40 + Área 30 + Nivel cumplido 20 + Disponibilidad 10.
   Sección 1.3 y 5.5.2 del documento técnico.
   ============================================================ */
import { PESO_MATCH, rankNivel } from "./constants";

type PerfilCandidato = {
  ciudad: string;
  area_interes: string;
  nivel_educativo: string;
  disponibilidad: string;
};

type PerfilVacante = {
  ciudad: string;
  area: string;
  nivel_educativo_min: string;
  modalidad: string;
};

/** ¿La vacante es elegible para aparecer/notificar a este candidato? (filtro duro) */
export function esElegible(c: PerfilCandidato, v: PerfilVacante): boolean {
  const ciudadOk = v.modalidad === "remoto" || c.ciudad === v.ciudad;
  const areaOk = c.area_interes === v.area;
  const nivelOk = rankNivel(c.nivel_educativo) >= rankNivel(v.nivel_educativo_min);
  return ciudadOk && areaOk && nivelOk;
}

/**
 * Score de compatibilidad 0–100 con ponderaciones binarias.
 * Se usa tanto para ordenar el feed del candidato como en el panel de empresa.
 */
export function calcularScore(c: PerfilCandidato, v: PerfilVacante): number {
  let score = 0;
  if (v.modalidad === "remoto" || c.ciudad === v.ciudad) score += PESO_MATCH.ciudad;
  if (c.area_interes === v.area) score += PESO_MATCH.area;
  if (rankNivel(c.nivel_educativo) >= rankNivel(v.nivel_educativo_min)) score += PESO_MATCH.nivel;
  if (c.disponibilidad === "inmediata") score += PESO_MATCH.disponibilidad;
  return score;
}

/** Texto corto para acompañar el score (placeholder de la explicación IA de Fase 2). */
export function razonMatch(c: PerfilCandidato, v: PerfilVacante): string {
  const partes: string[] = [];
  if (v.modalidad === "remoto" || c.ciudad === v.ciudad) partes.push("misma ciudad");
  if (c.area_interes === v.area) partes.push("misma área");
  if (rankNivel(c.nivel_educativo) >= rankNivel(v.nivel_educativo_min)) partes.push("nivel educativo cumplido");
  if (c.disponibilidad === "inmediata") partes.push("disponibilidad inmediata");
  return partes.length ? partes.join(", ") : "coincidencia parcial";
}

export function colorScore(score: number): string {
  if (score >= 85) return "bg-success-50 text-success-600 border-success-500/20";
  if (score >= 60) return "bg-brand-50 text-brand-700 border-brand-500/20";
  return "bg-amber-50 text-amber-700 border-amber-500/20";
}
