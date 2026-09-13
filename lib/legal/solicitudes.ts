import { z } from "zod";
import { claseSolicitud, PLAZOS_HABEAS_DATA } from "@/lib/legal/dias-habiles";

/* ============================================================
   Solicitudes de titulares (Habeas Data, arts. 14 y 15 Ley 1581/2012).
   Lógica pura: catálogos, validación y formato. La escritura vive en
   lib/actions/solicitudes.ts.
   ============================================================ */

export const TIPOS_SOLICITUD = [
  { value: "consulta", label: "Consulta: conocer qué datos tienen de mí" },
  { value: "actualizacion", label: "Actualización de mis datos" },
  { value: "rectificacion", label: "Rectificación de datos incorrectos" },
  { value: "supresion", label: "Supresión (eliminación) de mis datos" },
  { value: "revocatoria", label: "Revocatoria de la autorización" },
  { value: "prueba_autorizacion", label: "Prueba de la autorización otorgada" },
] as const;

export type TipoSolicitud = (typeof TIPOS_SOLICITUD)[number]["value"];

export const TIPOS_DOCUMENTO = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PPT", label: "Permiso por Protección Temporal" },
  { value: "PA", label: "Pasaporte" },
  { value: "TI", label: "Tarjeta de identidad" },
  { value: "NIT", label: "NIT" },
] as const;

const valores = <T extends readonly { value: string }[]>(xs: T) =>
  xs.map((x) => x.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

export const esquemaSolicitud = z.object({
  tipo: z.enum(valores(TIPOS_SOLICITUD), { message: "Elige el tipo de solicitud." }),
  nombre: z.string().trim().min(3, "Escribe tu nombre completo.").max(120, "El nombre es muy largo."),
  tipo_documento: z.enum(valores(TIPOS_DOCUMENTO), { message: "Elige el tipo de documento." }),
  numero_documento: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{4,20}$/, "Número de documento inválido (solo letras, números o guion)."),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido.").max(160),
  telefono: z
    .string()
    .trim()
    .max(20)
    .refine((v) => v === "" || /^\+?[\d\s-]{7,20}$/.test(v), "Teléfono inválido.")
    .transform((v) => (v === "" ? null : v)),
  descripcion: z
    .string()
    .trim()
    .min(20, "Cuéntanos tu solicitud con al menos 20 caracteres.")
    .max(4000, "La descripción no puede superar 4.000 caracteres."),
  declaracion: z.literal("on", { message: "Debes declarar que eres el titular o su representante." }),
});

export type SolicitudValida = z.infer<typeof esquemaSolicitud>;

export type ErroresSolicitud = Partial<Record<keyof SolicitudValida | "general", string>>;

/** Valida el FormData/objeto plano. Devuelve datos limpios o errores por campo. */
export function validarSolicitud(
  entrada: Record<string, unknown>,
): { ok: true; datos: SolicitudValida } | { ok: false; errores: ErroresSolicitud } {
  const r = esquemaSolicitud.safeParse({
    tipo: entrada.tipo ?? "",
    nombre: entrada.nombre ?? "",
    tipo_documento: entrada.tipo_documento ?? "",
    numero_documento: entrada.numero_documento ?? "",
    email: entrada.email ?? "",
    telefono: entrada.telefono ?? "",
    descripcion: entrada.descripcion ?? "",
    declaracion: entrada.declaracion ?? "",
  });
  if (r.success) return { ok: true, datos: r.data };
  const errores: ErroresSolicitud = {};
  for (const issue of r.error.issues) {
    const campo = (issue.path[0] as keyof ErroresSolicitud) ?? "general";
    errores[campo] ??= issue.message;
  }
  return { ok: false, errores };
}

export function etiquetaTipoSolicitud(tipo: string): string {
  return TIPOS_SOLICITUD.find((t) => t.value === tipo)?.label ?? tipo;
}

export function plazoDe(tipo: string) {
  const clase = claseSolicitud(tipo);
  return { clase, ...PLAZOS_HABEAS_DATA[clase] };
}

/** "martes, 29 de septiembre de 2026, 11:59 p. m." en hora de Bogotá. */
export function formatearFechaBogota(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}
