/* ============================================================
   Reglas de beneficios por plan (entitlements) — secciones 9–11.
   Separadas del catálogo de precios (lib/billing/catalogo.ts).

   REGLA DE ORO: ningún beneficio controla el acceso esencial.
   Ver vacantes, salario, requisitos, empresa, postular y ver el
   match es SIEMPRE gratis y no pasa por este archivo.
   Los límites son hipótesis de piloto: ajústalos aquí.
   ============================================================ */
import type { PlanEmpresaId, PlanId } from "./constants";

export type BeneficiosCandidato = {
  /** "preview": ve una muestra sin aprobar/descargar/copiar. */
  cvIa: "preview" | "completo";
  generacionesCvMes: number;
  /** Hoja de vida dinámica (sección 3): A = reordenar según vacante. */
  cvDinamico: "no" | "reordenar" | "reordenar_versiones";
  maxVersionesCv: number;
  linkedin: "no" | "basico" | "avanzado";
  generacionesLinkedinMes: number;
  visibilidad: "base" | "mayor" | "prioritaria";
  /** Desempate en el ranking de la empresa a igual score (0 = sin prioridad). */
  prioridadRanking: 0 | 1 | 2;
  empleabilidad: "base" | "intermedio" | "premium";
};

export const BENEFICIOS_CANDIDATO: Record<PlanId, BeneficiosCandidato> = {
  gratis: {
    cvIa: "preview",
    generacionesCvMes: 1,
    cvDinamico: "no",
    maxVersionesCv: 1,
    linkedin: "no",
    generacionesLinkedinMes: 0,
    visibilidad: "base",
    prioridadRanking: 0,
    empleabilidad: "base",
  },
  camelleitor: {
    cvIa: "completo",
    generacionesCvMes: 5,
    cvDinamico: "reordenar",
    maxVersionesCv: 3,
    linkedin: "basico",
    generacionesLinkedinMes: 3,
    visibilidad: "mayor",
    prioridadRanking: 1,
    empleabilidad: "intermedio",
  },
  berraco_pro: {
    cvIa: "completo",
    generacionesCvMes: 20,
    cvDinamico: "reordenar_versiones",
    maxVersionesCv: 20,
    linkedin: "avanzado",
    generacionesLinkedinMes: 10,
    visibilidad: "prioritaria",
    prioridadRanking: 2,
    empleabilidad: "premium",
  },
};

export type BeneficiosEmpresa = {
  /** "basica": vistas y postulados. "avanzada": embudo, fuentes, distribución de score. */
  analitica: "basica" | "avanzada";
  filtrosPipeline: boolean;
  exportarCsv: boolean;
  /** Candidatos que encajan y aceptaron ser visibles (anonimizados hasta que se postulen). */
  accesoAmpliado: boolean;
  /** Publicación automática en redes: módulo V2. */
  redesSociales: boolean;
  destacadasIncluidasMes: number;
};

export const BENEFICIOS_EMPRESA: Record<PlanEmpresaId, BeneficiosEmpresa> = {
  gratis: {
    analitica: "basica",
    filtrosPipeline: false,
    exportarCsv: false,
    accesoAmpliado: false,
    redesSociales: false,
    destacadasIncluidasMes: 0,
  },
  pro: {
    analitica: "avanzada",
    filtrosPipeline: true,
    exportarCsv: true,
    accesoAmpliado: true,
    redesSociales: false,
    destacadasIncluidasMes: 2,
  },
};

/* ---------------- Plan efectivo a partir de la suscripción ---------------- */

export const DIAS_GRACIA_PAST_DUE = 3;
const DIA_MS = 86_400_000;

export type SuscripcionMin = {
  plan: string;
  estado: "active" | "past_due" | "canceled" | "expired";
  periodo_fin: string;
};

/**
 * ¿Da beneficios hoy? active hasta periodo_fin; past_due tiene
 * DIAS_GRACIA_PAST_DUE días de gracia; canceled/expired no.
 */
export function suscripcionDaBeneficios(s: SuscripcionMin | null | undefined, ahora = Date.now()): boolean {
  if (!s) return false;
  const fin = new Date(s.periodo_fin).getTime();
  if (s.estado === "active") return fin > ahora;
  if (s.estado === "past_due") return fin + DIAS_GRACIA_PAST_DUE * DIA_MS > ahora;
  return false;
}

export function planCandidatoEfectivo(s: SuscripcionMin | null | undefined, ahora = Date.now()): PlanId {
  if (!suscripcionDaBeneficios(s, ahora)) return "gratis";
  return s!.plan === "camelleitor" || s!.plan === "berraco_pro" ? s!.plan : "gratis";
}

export function planEmpresaEfectivo(s: SuscripcionMin | null | undefined, ahora = Date.now()): PlanEmpresaId {
  if (!suscripcionDaBeneficios(s, ahora)) return "gratis";
  return s!.plan === "pro" ? "pro" : "gratis";
}
