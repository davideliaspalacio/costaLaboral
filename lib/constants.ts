/* ============================================================
   Constantes de dominio de CostaLaboral — Especificación MVP v2.
   Precios y productos viven en lib/billing/catalogo.ts; los
   beneficios por plan en lib/entitlements.ts (catálogo separado
   de reglas de beneficios, sección 9 de la spec).
   ============================================================ */

/** Ciudades del piloto (sección 18: Barranquilla, Cartagena y Santa Marta). */
export const CIUDADES = ["Barranquilla", "Cartagena", "Santa Marta"] as const;
export type Ciudad = (typeof CIUDADES)[number];

export const AREAS = [
  { value: "ventas", label: "Ventas" },
  { value: "logistica", label: "Logística" },
  { value: "salud", label: "Salud" },
  { value: "admin", label: "Administrativo" },
  { value: "tecnologia", label: "Tecnología" },
  { value: "alimentos", label: "Alimentos y cocina" },
  { value: "servicios", label: "Servicio al cliente" },
  { value: "construccion", label: "Construcción" },
  { value: "transporte", label: "Transporte" },
  { value: "belleza", label: "Belleza y estética" },
  { value: "educacion", label: "Educación" },
  { value: "otro", label: "Otro" },
] as const;
export type AreaValue = (typeof AREAS)[number]["value"];

export const SECTORES = [
  { value: "comercio", label: "Comercio" },
  { value: "alimentos", label: "Alimentos / restaurante" },
  { value: "servicios", label: "Servicios" },
  { value: "construccion", label: "Construcción" },
  { value: "salud", label: "Salud" },
  { value: "transporte", label: "Transporte" },
  { value: "otro", label: "Otro" },
] as const;

/** Nivel educativo ordenado de menor a mayor para comparar mínimos. */
export const NIVELES_EDUCATIVOS = [
  { value: "bachiller", label: "Bachiller", rank: 1 },
  { value: "tecnico", label: "Técnico SENA", rank: 2 },
  { value: "tecnologo", label: "Tecnólogo", rank: 3 },
  { value: "universitario", label: "Universitario", rank: 4 },
  { value: "profesional", label: "Profesional", rank: 5 },
] as const;
export type NivelEducativo = (typeof NIVELES_EDUCATIVOS)[number]["value"];

export function rankNivel(nivel: string): number {
  return NIVELES_EDUCATIVOS.find((n) => n.value === nivel)?.rank ?? 0;
}

/** Dónde se trabaja. */
export const MODALIDADES = [
  { value: "presencial", label: "Presencial" },
  { value: "remoto", label: "Remoto" },
  { value: "hibrido", label: "Híbrido" },
] as const;
export type Modalidad = (typeof MODALIDADES)[number]["value"];

/** Tipo de empleo / jornada (filtro "tipo" del portal). */
export const TIPOS_EMPLEO = [
  { value: "tiempo_completo", label: "Tiempo completo" },
  { value: "medio_tiempo", label: "Medio tiempo" },
  { value: "por_dias", label: "Por días" },
  { value: "temporal", label: "Temporal" },
  { value: "practicas", label: "Prácticas" },
] as const;
export type TipoEmpleo = (typeof TIPOS_EMPLEO)[number]["value"];

/**
 * Disponibilidad. En el candidato: cuándo puede empezar.
 * En la vacante (disponibilidad_requerida): a más tardar cuándo debe empezar.
 */
export const DISPONIBILIDAD = [
  { value: "inmediata", label: "Inmediata", rank: 1 },
  { value: "en_2_semanas", label: "En 2 semanas", rank: 2 },
  { value: "en_1_mes", label: "En 1 mes", rank: 3 },
] as const;
export type Disponibilidad = (typeof DISPONIBILIDAD)[number]["value"];

export function rankDisponibilidad(d: string): number {
  return DISPONIBILIDAD.find((x) => x.value === d)?.rank ?? 0;
}

/* ---------------- Vacantes ---------------- */

export const ESTADOS_VACANTE = [
  { value: "borrador", label: "Borrador" },
  { value: "publicada", label: "Publicada" },
  { value: "pausada", label: "Pausada" },
  { value: "cerrada", label: "Cerrada" },
] as const;
export type EstadoVacante = (typeof ESTADOS_VACANTE)[number]["value"];

export const ESTADOS_MODERACION = ["pendiente", "aprobada", "rechazada", "reportada"] as const;
export type EstadoModeracion = (typeof ESTADOS_MODERACION)[number];

export const MOTIVOS_CIERRE = [
  { value: "contratado", label: "Ya contraté" },
  { value: "cerrada", label: "Cerrada" },
  { value: "expirada", label: "Expirada" },
] as const;
export type MotivoCierre = (typeof MOTIVOS_CIERRE)[number]["value"];

export const MOTIVOS_REPORTE = [
  { value: "fraude", label: "Parece un fraude o estafa" },
  { value: "cobro_al_candidato", label: "Piden dinero al candidato" },
  { value: "discriminatoria", label: "Contenido discriminatorio" },
  { value: "datos_falsos", label: "Datos falsos o engañosos" },
  { value: "ya_no_existe", label: "La vacante ya no existe" },
  { value: "otro", label: "Otro motivo" },
] as const;
export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number]["value"];

/** Reportes abiertos de usuarios distintos que ocultan la vacante hasta revisión. */
export const REPORTES_PARA_OCULTAR = 3;

export const VACANTE_EXPIRA_DIAS = 60;

/* ---------------- Postulaciones (un solo estado) ---------------- */

export type TonoEstado = "brand" | "accent" | "sol" | "success" | "warn" | "danger" | "neutral" | "outline" | "ink";

export const ESTADOS_POSTULACION = [
  { value: "enviada", label: "Nueva", labelCandidato: "Enviada", tono: "brand" },
  { value: "vista", label: "Vista", labelCandidato: "Vista por la empresa", tono: "sol" },
  { value: "contactado", label: "Contactado", labelCandidato: "Te contactaron", tono: "accent" },
  { value: "en_entrevista", label: "En entrevista", labelCandidato: "En entrevista", tono: "accent" },
  { value: "contratado", label: "Contratado", labelCandidato: "Contratado", tono: "success" },
  { value: "descartado", label: "Descartado", labelCandidato: "No seleccionado", tono: "neutral" },
  { value: "retirada", label: "Retirada", labelCandidato: "Retiraste la postulación", tono: "outline" },
] as const satisfies readonly { value: string; label: string; labelCandidato: string; tono: TonoEstado }[];
export type EstadoPostulacion = (typeof ESTADOS_POSTULACION)[number]["value"];

/** Estados que la empresa puede asignar desde el pipeline. */
export const ESTADOS_PIPELINE_EMPRESA: EstadoPostulacion[] = [
  "enviada",
  "vista",
  "contactado",
  "en_entrevista",
  "contratado",
  "descartado",
];

export function estadoPostulacionInfo(value: string) {
  return ESTADOS_POSTULACION.find((e) => e.value === value) ?? ESTADOS_POSTULACION[0];
}

/** De dónde llegó el candidato a la vacante (KPIs de CTR y conversión). */
export const FUENTES = ["recomendacion", "busqueda", "whatsapp", "directo", "compartido"] as const;
export type Fuente = (typeof FUENTES)[number];

export function normalizarFuente(v: string | null | undefined): Fuente {
  return (FUENTES as readonly string[]).includes(v ?? "") ? (v as Fuente) : "directo";
}

/* ---------------- Planes ---------------- */

export type PlanId = "gratis" | "camelleitor" | "berraco_pro";
export type PlanEmpresaId = "gratis" | "pro";

export const PLAN_NOMBRE: Record<PlanId, string> = {
  gratis: "Gratis",
  camelleitor: "Camelleitor",
  berraco_pro: "Berraco Pro",
};

export const PLAN_EMPRESA_NOMBRE: Record<PlanEmpresaId, string> = {
  gratis: "Gratis",
  pro: "Empresa Pro",
};

/* ---------------- Match (sección 4) ---------------- */

export const PESO_MATCH = {
  ciudad: 40,
  area: 30,
  educacion: 20,
  disponibilidad: 10,
} as const;

/** Versión de las reglas del score; se guarda con cada detalle para reproducibilidad. */
export const MATCH_VERSION = "v2-2026-09";

/** Score mínimo para recomendar una vacante (feed y notificaciones). */
export const UMBRAL_RECOMENDACION = 60;
