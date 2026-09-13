/* Reglas puras sobre vacantes (sin acceso a datos). */
import type { Vacante } from "./types";

type VacanteVisibilidad = Pick<Vacante, "es_publica" | "expira_en">;

/** Visible en el portal: publicada, aprobada por moderación y sin expirar. */
export function esVisibleEnPortal(v: VacanteVisibilidad, ahora = Date.now()): boolean {
  return v.es_publica && new Date(v.expira_en).getTime() > ahora;
}

export function estaDestacada(v: Pick<Vacante, "destacada_hasta">, ahora = Date.now()): boolean {
  return v.destacada_hasta != null && new Date(v.destacada_hasta).getTime() > ahora;
}

/** Publicada hace menos de `dias` días. */
export function esReciente(fecha: string, dias = 3, ahora = Date.now()): boolean {
  return ahora - new Date(fecha).getTime() < dias * 86_400_000;
}

/** Orden del portal: destacadas vigentes primero, luego más recientes. */
export function compararPortal(a: Vacante, b: Vacante, ahora = Date.now()): number {
  const da = estaDestacada(a, ahora) ? 1 : 0;
  const db = estaDestacada(b, ahora) ? 1 : 0;
  if (da !== db) return db - da;
  return new Date(b.publicada_en ?? b.creado_en).getTime() - new Date(a.publicada_en ?? a.creado_en).getTime();
}
