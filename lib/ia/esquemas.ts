import { z } from "zod";
import type { EntradaHV } from "./tipos";

/* ============================================================
   Esquemas zod compartidos (cliente y servidor).
   - Entrada del cuestionario: validación de formulario.
   - Contenido editado: validación antes de persistir.
   - Salida del modelo: formato estructurado (sin límites numéricos,
     que no todos se traducen a JSON Schema); los límites se aplican
     después con los esquemas de contenido.
   ============================================================ */

const txt = (max: number, msg?: string) => z.string().trim().max(max, msg ?? `Máximo ${max} caracteres`);

export const ExperienciaEntradaSchema = z
  .object({
    cargo: txt(80),
    empresa: txt(80),
    periodo: txt(40),
    descripcion: txt(1200),
  })
  .refine((e) => e.cargo.length > 0, { message: "Escribe el cargo de este trabajo", path: ["cargo"] });

export const EntradaHVSchema = z.object({
  cargoObjetivo: z.string().trim().min(2, "Escribe el cargo al que le apuntas").max(80, "Máximo 80 caracteres"),
  aniosExperiencia: z
    .number({ error: "Escribe un número" })
    .int("Usa un número entero")
    .min(0, "No puede ser negativo")
    .max(50, "Máximo 50 años"),
  experiencia: z.array(ExperienciaEntradaSchema).max(8, "Máximo 8 trabajos"),
  habilidades: z.array(z.string().trim().min(1).max(60, "Máximo 60 caracteres")).max(20, "Máximo 20 habilidades"),
  educacion: z.array(z.string().trim().min(1).max(160, "Máximo 160 caracteres")).max(8, "Máximo 8 estudios"),
});

/** Quita filas y textos vacíos antes de validar (el cuestionario deja filas en blanco). */
export function limpiarEntrada(e: EntradaHV): EntradaHV {
  const t = (s: string | undefined | null) => (s ?? "").replace(/\s+/g, " ").trim();
  return {
    cargoObjetivo: t(e.cargoObjetivo),
    aniosExperiencia: Number.isFinite(e.aniosExperiencia) ? Math.floor(e.aniosExperiencia) : 0,
    experiencia: (e.experiencia ?? [])
      .map((x) => ({
        cargo: t(x.cargo),
        empresa: t(x.empresa),
        periodo: t(x.periodo),
        descripcion: (x.descripcion ?? "").trim(),
      }))
      .filter((x) => x.cargo || x.empresa || x.periodo || x.descripcion),
    habilidades: (e.habilidades ?? []).map(t).filter(Boolean),
    educacion: (e.educacion ?? []).map(t).filter(Boolean),
  };
}

/** Primer mensaje de error legible de un resultado de zod. */
export function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos";
}

/* ---------------- Contenido persistido ---------------- */

export const ContenidoHVSchema = z.object({
  resumen: z.string().trim().max(1500, "El perfil profesional es muy largo"),
  habilidades: z.array(z.string().trim().min(1).max(80)).max(30, "Máximo 30 habilidades"),
  experiencia: z
    .array(
      z.object({
        cargo: z.string().trim().max(120),
        empresa: z.string().trim().max(120),
        periodo: z.string().trim().max(60),
        logros: z.array(z.string().trim().min(1).max(400)).max(10, "Máximo 10 logros por experiencia"),
      }),
    )
    .max(10, "Máximo 10 experiencias"),
  educacion: z.array(z.string().trim().min(1).max(200)).max(10),
  logros: z.array(z.string().trim().min(1).max(300)).max(10),
});

export const TituloHVSchema = z.string().trim().min(2, "El título es muy corto").max(120, "Máximo 120 caracteres");

export const ContenidoLinkedInSchema = z.object({
  titular: z.string().trim().max(220, "El titular de LinkedIn admite hasta 220 caracteres"),
  acerca: z.string().trim().max(2600, "El “Acerca de” admite hasta 2.600 caracteres"),
  titulares_alternativos: z.array(z.string().trim().min(1).max(220)).max(3).optional(),
  habilidades: z.array(z.string().trim().min(1).max(80)).max(10).optional(),
  experiencias: z
    .array(
      z.object({
        cargo: z.string().trim().max(120),
        empresa: z.string().trim().max(120),
        descripcion: z.string().trim().max(2000),
      }),
    )
    .max(10)
    .optional(),
  palabras_clave: z.array(z.string().trim().min(1).max(60)).max(15).optional(),
});

/* ---------------- Salida del modelo ---------------- */

export const SalidaHVModeloSchema = z.object({
  resumen: z.string(),
  habilidades: z.array(z.string()),
  experiencia: z.array(
    z.object({
      cargo: z.string(),
      empresa: z.string(),
      periodo: z.string(),
      logros: z.array(z.string()),
    }),
  ),
  educacion: z.array(z.string()),
  logros: z.array(z.string()),
});

export const SalidaLinkedInBasicoSchema = z.object({
  titular: z.string(),
  acerca: z.string(),
});

export const SalidaLinkedInAvanzadoSchema = z.object({
  titular: z.string(),
  acerca: z.string(),
  titulares_alternativos: z.array(z.string()),
  habilidades: z.array(z.string()),
  experiencias: z.array(
    z.object({
      cargo: z.string(),
      empresa: z.string(),
      descripcion: z.string(),
    }),
  ),
  palabras_clave: z.array(z.string()),
});
