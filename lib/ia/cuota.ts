import type { EstadoIA } from "./tipos";

/* ============================================================
   Reglas puras de cuota mensual de IA. El mes es calendario en
   hora de Bogotá (UTC−5, sin horario de verano).
   ============================================================ */

const OFFSET_BOGOTA_MS = 5 * 60 * 60 * 1000;

/** Instante (UTC) en que empezó el mes calendario actual en Bogotá. */
export function inicioMesBogota(ahora: Date = new Date()): Date {
  const local = new Date(ahora.getTime() - OFFSET_BOGOTA_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + OFFSET_BOGOTA_MS);
}

/** Estados que NO consumen cuota: fallas nuestras o de la API y el modo sin credenciales. */
export const ESTADOS_SIN_CUOTA: EstadoIA[] = ["error", "sin_credenciales"];

export function consumeCuota(estado: EstadoIA): boolean {
  return !ESTADOS_SIN_CUOTA.includes(estado);
}

export function resumenCuota(usadas: number, limite: number): { usadas: number; limite: number; restantes: number; agotada: boolean } {
  const restantes = Math.max(0, limite - usadas);
  return { usadas, limite, restantes, agotada: restantes <= 0 };
}
