/* ============================================================
   Constantes de dominio de CostaLaboral (Fase 1)
   Fuente: Documento Técnico MVP.
   ============================================================ */

export const CIUDADES = [
  "Barranquilla",
  "Cartagena",
  "Santa Marta",
  "Montería",
  "Sincelejo",
  "Valledupar",
  "Riohacha",
  "Soledad",
] as const;
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

export const MODALIDADES = [
  { value: "presencial", label: "Presencial" },
  { value: "remoto", label: "Remoto" },
  { value: "hibrido", label: "Híbrido" },
  { value: "medio_tiempo", label: "Medio tiempo" },
  { value: "por_dias", label: "Por días" },
] as const;
export type Modalidad = (typeof MODALIDADES)[number]["value"];

export const DISPONIBILIDAD = [
  { value: "inmediata", label: "Inmediata" },
  { value: "en_2_semanas", label: "En 2 semanas" },
  { value: "en_1_mes", label: "En 1 mes" },
] as const;
export type Disponibilidad = (typeof DISPONIBILIDAD)[number]["value"];

export const ESTADOS_POSTULACION = [
  { value: "enviada", label: "Enviada", color: "bg-brand-50 text-brand-700" },
  { value: "vista_empresa", label: "Vista por empresa", color: "bg-amber-50 text-amber-700" },
  { value: "en_proceso", label: "En proceso", color: "bg-indigo-50 text-indigo-700" },
  { value: "seleccionado", label: "Seleccionado", color: "bg-success-50 text-success-600" },
  { value: "rechazado", label: "No seleccionado", color: "bg-slate-100 text-slate-600" },
] as const;
export type EstadoPostulacion = (typeof ESTADOS_POSTULACION)[number]["value"];

/** Estados de seguimiento del candidato en el panel de empresa (5.5.1). */
export const ESTADOS_SEGUIMIENTO = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "en_entrevista", label: "En entrevista" },
  { value: "contratado", label: "Contratado" },
  { value: "descartado", label: "Descartado" },
] as const;

/* ---------------- Planes (modelo de negocio) ---------------- */
export type PlanId = "gratis" | "camelleitor" | "berraco_pro";

export const PLANES: Record<
  PlanId,
  {
    id: PlanId;
    nombre: string;
    precio: number; // COP por 90 días
    postulaciones: number | null; // null = ilimitado
    destacado?: boolean;
    tagline: string;
    beneficios: string[];
  }
> = {
  gratis: {
    id: "gratis",
    nombre: "Gratis",
    precio: 0,
    postulaciones: 3,
    tagline: "Empieza a buscar camello sin pagar nada.",
    beneficios: [
      "3 postulaciones cada 90 días",
      "Vacantes que encajan con tu perfil",
      "Notificaciones por WhatsApp",
      "Ve cargo, ciudad y salario",
    ],
  },
  camelleitor: {
    id: "camelleitor",
    nombre: "Camelleitor",
    precio: 29900,
    postulaciones: 15,
    destacado: true,
    tagline: "Para el que va en serio con la búsqueda.",
    beneficios: [
      "15 postulaciones cada 90 días",
      "Ves la empresa y todos los requisitos",
      "Asistente de hoja de vida con IA",
      "Prioridad sobre el plan gratis",
    ],
  },
  berraco_pro: {
    id: "berraco_pro",
    nombre: "Berraco Pro",
    precio: 49900,
    postulaciones: null,
    tagline: "Sin límites. El combo completo.",
    beneficios: [
      "Postulaciones ilimitadas",
      "Hoja de vida + LinkedIn con IA (ilimitado)",
      "% de match con inteligencia artificial",
      "Etiqueta de Prioridad 2h y quién vio tu perfil",
    ],
  },
};

export const PLAN_DURACION_DIAS = 90;

/* Ponderaciones del score de match — Fase 1 (sección 5.5.2) */
export const PESO_MATCH = {
  ciudad: 40,
  area: 30,
  nivel: 20,
  disponibilidad: 10,
} as const;

export const VACANTE_EXPIRA_DIAS = 60;
