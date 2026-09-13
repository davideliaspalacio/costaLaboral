/* ============================================================
   Motor de match — sección 4 de la Especificación MVP v2.
   Determinístico y explicable:
     Score = Σ(peso × compatibilidad), compatibilidad ∈ {0, 0.5, 1}
     Ciudad 40 · Área 30 · Educación 20 · Disponibilidad 10
   El detalle por factor se guarda con la postulación para poder
   reproducir y explicar el score. NO es probabilidad de contratación.
   ============================================================ */
import {
  AREAS,
  MATCH_VERSION,
  NIVELES_EDUCATIVOS,
  PESO_MATCH,
  UMBRAL_RECOMENDACION,
  rankDisponibilidad,
  rankNivel,
} from "./constants";

export type PerfilCandidato = {
  ciudad: string;
  area_interes: string;
  nivel_educativo: string;
  disponibilidad: string;
};

export type PerfilVacante = {
  ciudad: string;
  area: string;
  nivel_educativo_min: string;
  modalidad: string;
  /** Por defecto "en_1_mes": no restringe a nadie. */
  disponibilidad_requerida?: string | null;
};

export type Compatibilidad = 0 | 0.5 | 1;
export type FactorId = "ciudad" | "area" | "educacion" | "disponibilidad";

export type FactorMatch = {
  factor: FactorId;
  peso: number;
  compatibilidad: Compatibilidad;
  puntos: number;
  explicacion: string;
};

export type DetalleMatch = {
  version: string;
  score: number;
  factores: FactorMatch[];
};

const labelNivel = (v: string) => NIVELES_EDUCATIVOS.find((n) => n.value === v)?.label ?? v;
const labelArea = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;

function factor(id: FactorId, compatibilidad: Compatibilidad, explicacion: string): FactorMatch {
  const peso = PESO_MATCH[id];
  return { factor: id, peso, compatibilidad, puntos: peso * compatibilidad, explicacion };
}

function factorCiudad(c: PerfilCandidato, v: PerfilVacante): FactorMatch {
  if (v.modalidad === "remoto") return factor("ciudad", 1, "Trabajo remoto: aplica desde cualquier ciudad");
  if (c.ciudad === v.ciudad) return factor("ciudad", 1, `Vives en ${v.ciudad}`);
  return factor("ciudad", 0, `La vacante es en ${v.ciudad} y tu ciudad es ${c.ciudad}`);
}

function factorArea(c: PerfilCandidato, v: PerfilVacante): FactorMatch {
  if (c.area_interes === v.area) return factor("area", 1, `Coincide con tu área de interés (${labelArea(v.area)})`);
  return factor("area", 0, `La vacante es de ${labelArea(v.area)} y tu área es ${labelArea(c.area_interes)}`);
}

/** 1 si cumple el mínimo, 0.5 si está a un nivel, 0 si está más lejos. */
function factorEducacion(c: PerfilCandidato, v: PerfilVacante): FactorMatch {
  const diff = rankNivel(c.nivel_educativo) - rankNivel(v.nivel_educativo_min);
  const minimo = labelNivel(v.nivel_educativo_min);
  if (diff >= 0) return factor("educacion", 1, `Cumples el nivel mínimo (${minimo})`);
  if (diff === -1 && rankNivel(c.nivel_educativo) > 0)
    return factor("educacion", 0.5, `Estás a un nivel del mínimo pedido (${minimo})`);
  return factor("educacion", 0, `Piden como mínimo ${minimo}`);
}

/** 1 si puede empezar a tiempo, 0.5 si tarda un escalón más, 0 si tarda más. */
function factorDisponibilidad(c: PerfilCandidato, v: PerfilVacante): FactorMatch {
  const requerida = v.disponibilidad_requerida || "en_1_mes";
  const diff = rankDisponibilidad(c.disponibilidad) - rankDisponibilidad(requerida);
  if (rankDisponibilidad(c.disponibilidad) === 0) return factor("disponibilidad", 0, "Sin disponibilidad registrada");
  if (diff <= 0) return factor("disponibilidad", 1, "Puedes empezar cuando lo necesitan");
  if (diff === 1) return factor("disponibilidad", 0.5, "Tu disponibilidad es un poco más tarde de lo que buscan");
  return factor("disponibilidad", 0, "Tu disponibilidad no coincide con la fecha de inicio");
}

/** Evalúa el match completo con el detalle de cada factor. */
export function evaluarMatch(c: PerfilCandidato, v: PerfilVacante): DetalleMatch {
  const factores = [factorCiudad(c, v), factorArea(c, v), factorEducacion(c, v), factorDisponibilidad(c, v)];
  const score = factores.reduce((s, f) => s + f.puntos, 0);
  return { version: MATCH_VERSION, score, factores };
}

/** Score 0–100. */
export function calcularScore(c: PerfilCandidato, v: PerfilVacante): number {
  return evaluarMatch(c, v).score;
}

/** ¿Vale la pena recomendarla? (feed y notificaciones). Nunca oculta vacantes del portal. */
export function esRecomendable(detalle: Pick<DetalleMatch, "score">, umbral = UMBRAL_RECOMENDACION): boolean {
  return detalle.score >= umbral;
}

/** Resumen de una línea con los factores que suman. */
export function resumenMatch(detalle: DetalleMatch): string {
  const suman = detalle.factores.filter((f) => f.compatibilidad > 0).map((f) => f.explicacion.toLowerCase());
  return suman.length ? suman.join(" · ") : "Pocas coincidencias con tu perfil";
}

/** Extrae el perfil de match de una fila de candidato. */
export function perfilDe(c: PerfilCandidato): PerfilCandidato {
  return {
    ciudad: c.ciudad,
    area_interes: c.area_interes,
    nivel_educativo: c.nivel_educativo,
    disponibilidad: c.disponibilidad,
  };
}

export function colorScore(score: number): string {
  if (score >= 85) return "bg-success-50 text-success-600 border-success-500/20";
  if (score >= UMBRAL_RECOMENDACION) return "bg-brand-50 text-brand-700 border-brand-500/20";
  return "bg-sol-100 text-ink border-sol-500/30";
}
