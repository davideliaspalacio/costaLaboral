/* Reglas puras de la ficha /v/[id] (sin acceso a datos). */
import { esVisibleEnPortal } from "@/lib/vacante";
import type { Vacante } from "@/lib/types";

export type AccesoFicha = "publica" | "duena" | "postulado" | "oculta";

type VacanteAcceso = Pick<Vacante, "es_publica" | "expira_en">;

/**
 * Quién puede ver la ficha:
 * - pública (visible en portal) → cualquiera;
 * - si no, la empresa dueña o un candidato que ya se postuló;
 * - el resto → 404.
 */
export function accesoFicha(
  v: VacanteAcceso,
  quien: { esDuena: boolean; yaPostulado: boolean },
  ahora = Date.now(),
): AccesoFicha {
  if (esVisibleEnPortal(v, ahora)) return "publica";
  if (quien.esDuena) return "duena";
  if (quien.yaPostulado) return "postulado";
  return "oculta";
}

export type BannerEstado = {
  tono: "sol" | "danger" | "neutral" | "warn";
  titulo: string;
  detalle: string;
};

type VacanteEstado = Pick<
  Vacante,
  "estado" | "estado_moderacion" | "motivo_moderacion" | "motivo_cierre" | "es_publica" | "expira_en"
>;

/** Por qué una vacante no está en el portal (banner para la empresa dueña). null si es visible. */
export function estadoNoPublico(v: VacanteEstado, ahora = Date.now()): BannerEstado | null {
  if (esVisibleEnPortal(v, ahora)) return null;
  if (v.estado === "borrador")
    return { tono: "neutral", titulo: "Borrador", detalle: "Aún no la publicas. Solo tú puedes verla." };
  if (v.estado_moderacion === "rechazada")
    return {
      tono: "danger",
      titulo: "Rechazada por moderación",
      detalle: v.motivo_moderacion ? `Motivo: ${v.motivo_moderacion}` : "Revisa el contenido y vuelve a enviarla.",
    };
  if (v.estado_moderacion === "reportada")
    return {
      tono: "danger",
      titulo: "Oculta por reportes",
      detalle: "Varios usuarios la reportaron. Está oculta mientras el equipo la revisa.",
    };
  if (v.estado_moderacion === "pendiente")
    return {
      tono: "sol",
      titulo: "En revisión",
      detalle: "Nuestro equipo la está revisando. Se publicará al aprobarse.",
    };
  if (v.estado === "cerrada")
    return v.motivo_cierre === "expirada"
      ? { tono: "warn", titulo: "Expirada", detalle: "Superó su fecha de vigencia y ya no recibe postulaciones." }
      : { tono: "neutral", titulo: "Cerrada", detalle: "Ya no recibe postulaciones." };
  if (v.estado === "pausada")
    return { tono: "warn", titulo: "Pausada", detalle: "No aparece en el portal hasta que la reanudes." };
  return { tono: "warn", titulo: "Expirada", detalle: "Superó su fecha de vigencia y ya no recibe postulaciones." };
}
