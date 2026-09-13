/* ============================================================
   Validaciones puras del candidato (registro, perfil, postulación).
   Sin acceso a datos: se usan en server actions y en tests.
   ============================================================ */
import { z } from "zod";
import { AREAS, CIUDADES, DISPONIBILIDAD, NIVELES_EDUCATIVOS } from "./constants";

/** Máximo de caracteres del mensaje opcional al postularse. */
export const MAX_MENSAJE_POSTULACION = 500;
export const MIN_PASSWORD = 8;

/**
 * Normaliza un celular colombiano a E.164 (+57 + 10 dígitos que empiezan por 3).
 * Acepta espacios, guiones, puntos y paréntesis; prefijos +57, 57 o 0057.
 * Devuelve null si no es un celular colombiano válido.
 */
export function normalizarWhatsapp(entrada: string | null | undefined): string | null {
  const limpio = String(entrada ?? "").replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(limpio)) return null;
  const conMas = limpio.startsWith("+");
  let d = limpio.replace(/^\+/, "");
  if (conMas) {
    if (!d.startsWith("57")) return null;
    d = d.slice(2);
  } else if (d.startsWith("0057")) {
    d = d.slice(4);
  } else if (d.length === 12 && d.startsWith("57")) {
    d = d.slice(2);
  }
  return /^3\d{9}$/.test(d) ? `+57${d}` : null;
}

const incluye = (lista: readonly { value: string }[]) => (v: string) => lista.some((x) => x.value === v);

const texto = (max: number, requerido: string) => z.string().trim().min(1, requerido).max(max, `Máximo ${max} caracteres.`);
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

const whatsapp = z
  .string()
  .transform((v, ctx) => {
    const n = normalizarWhatsapp(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Escribe un celular colombiano válido, ej: 300 123 4567." });
      return z.NEVER;
    }
    return n;
  });

/** Campos del perfil editables por el candidato. */
export const esquemaPerfil = z.object({
  nombre: texto(100, "Escribe tu nombre.").refine((v) => v.length >= 2, "Escribe tu nombre completo."),
  whatsapp,
  ciudad: z.enum(CIUDADES, { error: "Elige tu ciudad." }),
  barrio: opcional(80),
  area_interes: z.string().refine(incluye(AREAS), "Elige un área de interés."),
  nivel_educativo: z.string().refine(incluye(NIVELES_EDUCATIVOS), "Elige tu nivel educativo."),
  disponibilidad: z.string().refine(incluye(DISPONIBILIDAD), "Elige tu disponibilidad."),
  experiencia: opcional(2000),
});
export type DatosPerfil = z.infer<typeof esquemaPerfil>;

export const esquemaRegistro = esquemaPerfil.extend({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: "Escribe un correo válido." })),
  password: z.string().min(MIN_PASSWORD, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`).max(72),
  acepta_terminos: z.literal(true, { error: "Debes aceptar los Términos y la Política de tratamiento de datos." }),
  mayor_de_edad: z.literal(true, { error: "Debes declarar que eres mayor de 18 años." }),
  wsp_opt_in: z.boolean(),
});
export type DatosRegistro = z.infer<typeof esquemaRegistro>;

const CAMPOS_TEXTO = ["nombre", "whatsapp", "ciudad", "barrio", "area_interes", "nivel_educativo", "disponibilidad", "experiencia"] as const;

/** Convierte el FormData del registro en un objeto para el esquema (casillas → boolean). */
export function leerFormRegistro(fd: FormData) {
  const g = (k: string) => String(fd.get(k) ?? "");
  return {
    ...Object.fromEntries(CAMPOS_TEXTO.map((k) => [k, g(k)])),
    email: g("email"),
    password: g("password"),
    acepta_terminos: fd.get("acepta_terminos") === "on",
    mayor_de_edad: fd.get("mayor_de_edad") === "on",
    wsp_opt_in: fd.get("wsp_opt_in") === "on",
  };
}

export function leerFormPerfil(fd: FormData) {
  return Object.fromEntries(CAMPOS_TEXTO.map((k) => [k, String(fd.get(k) ?? "")]));
}

/** Primer mensaje por campo, para mostrar junto a cada input. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "_");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

/** Campos cuyos valores no se copian en claro al audit_log. */
export const CAMPOS_SENSIBLES = ["whatsapp", "email"] as const;

/**
 * Quita del diff los valores de campos sensibles y deja solo sus nombres,
 * para registrar QUÉ cambió sin copiar el dato personal.
 */
export function redactarDiff(diff: { antes: Record<string, unknown>; despues: Record<string, unknown> }): {
  antes: Record<string, unknown>;
  despues: Record<string, unknown>;
  sensiblesCambiados: string[];
} {
  const antes = { ...diff.antes };
  const despues = { ...diff.despues };
  const sensiblesCambiados: string[] = [];
  for (const k of CAMPOS_SENSIBLES) {
    if (k in antes || k in despues) {
      sensiblesCambiados.push(k);
      delete antes[k];
      delete despues[k];
    }
  }
  return { antes, despues, sensiblesCambiados };
}

/** Recorta el mensaje de postulación a su máximo; vacío → null. */
export function limpiarMensaje(mensaje: string | null | undefined): string | null {
  const m = String(mensaje ?? "").trim();
  return m ? m.slice(0, MAX_MENSAJE_POSTULACION) : null;
}
