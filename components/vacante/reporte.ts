/* Validación pura de reportes de vacantes (compartida por el formulario y la acción). */
import { MOTIVOS_REPORTE, type MotivoReporte } from "@/lib/constants";

export const DETALLE_REPORTE_MAX = 1000;

export function esMotivoReporte(v: unknown): v is MotivoReporte {
  return typeof v === "string" && MOTIVOS_REPORTE.some((m) => m.value === v);
}

export type ReporteValidado = { ok: true; motivo: MotivoReporte; detalle: string | null } | { error: string };

export function validarReporte(motivo: unknown, detalle?: unknown): ReporteValidado {
  if (!esMotivoReporte(motivo)) return { error: "Elige un motivo válido." };
  if (detalle != null && typeof detalle !== "string") return { error: "El detalle no es válido." };
  const limpio = (detalle ?? "").trim();
  if (limpio.length > DETALLE_REPORTE_MAX)
    return { error: `El detalle puede tener máximo ${DETALLE_REPORTE_MAX} caracteres.` };
  if (motivo === "otro" && !limpio) return { error: "Cuéntanos brevemente el motivo." };
  return { ok: true, motivo, detalle: limpio || null };
}
