import { AREAS, NIVELES_EDUCATIVOS } from "@/lib/constants";
import type { PerfilFuente } from "./tipos";

/* Etiquetas legibles del perfil para los prompts y la UI (puro). */

export const labelArea = (v: string | null | undefined) => AREAS.find((a) => a.value === v)?.label ?? v ?? "";
export const labelNivel = (v: string | null | undefined) => NIVELES_EDUCATIVOS.find((n) => n.value === v)?.label ?? v ?? "";

/** Contexto del perfil sin nombre ni datos de contacto. */
export function perfilFuenteDe(c: { ciudad: string; area_interes: string; nivel_educativo: string }): PerfilFuente {
  return { ciudad: c.ciudad, area: labelArea(c.area_interes), nivelEducativo: labelNivel(c.nivel_educativo) };
}
