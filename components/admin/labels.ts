import { AREAS, NIVELES_EDUCATIVOS, SECTORES, PLANES, type PlanId } from "@/lib/constants";
import type { BadgeProps } from "@/components/ui/badge";

type Tone = NonNullable<BadgeProps["tone"]>;

/** Etiqueta legible de un área a partir de su value. */
export function labelArea(value: string): string {
  return AREAS.find((a) => a.value === value)?.label ?? value;
}

/** Etiqueta legible de un nivel educativo. */
export function labelNivel(value: string): string {
  return NIVELES_EDUCATIVOS.find((n) => n.value === value)?.label ?? value;
}

/** Etiqueta legible de un sector. */
export function labelSector(value: string): string {
  return SECTORES.find((s) => s.value === value)?.label ?? value;
}

/** Etiqueta + tono del plan de un candidato. */
export function planInfo(value: string): { label: string; tone: Tone } {
  const plan = PLANES[value as PlanId];
  const tone: Tone = value === "berraco_pro" ? "accent" : value === "camelleitor" ? "brand" : "neutral";
  return { label: plan?.nombre ?? value, tone };
}

/* ---------------- Moderación ---------------- */

export const MODERACION_LABEL: Record<string, string> = {
  aprobada: "Aprobada",
  pendiente: "Pendiente",
  rechazada: "Rechazada",
  reportada: "Reportada",
};

export const MODERACION_TONO: Record<string, Tone> = {
  aprobada: "success",
  pendiente: "warn",
  rechazada: "danger",
  reportada: "accent",
};

/* ---------------- Eventos ---------------- */

export const EVENTO_LABEL: Record<string, string> = {
  registro_candidato: "Registro candidato",
  registro_empresa: "Registro empresa",
  vacante_publicada: "Vacante publicada",
  postulacion: "Postulación",
  notif_enviada: "Notificación enviada",
  plan_activado: "Plan activado",
  hv_generada: "Hoja de vida generada",
  empresa_verificada: "Empresa verificada",
  vacante_moderada: "Moderación / admin",
  login: "Inicio de sesión",
};

export function labelEvento(tipo: string): string {
  return EVENTO_LABEL[tipo] ?? tipo;
}

export const EVENTO_TONO: Record<string, Tone> = {
  registro_candidato: "brand",
  registro_empresa: "brand",
  vacante_publicada: "sol",
  postulacion: "success",
  notif_enviada: "neutral",
  plan_activado: "accent",
  hv_generada: "accent",
  empresa_verificada: "success",
  vacante_moderada: "ink",
  login: "outline",
};

/** Resumen corto y legible del meta jsonb de un evento. */
export function resumenMeta(meta: Record<string, unknown> | null | undefined): string {
  if (!meta || typeof meta !== "object") return "—";
  const partes: string[] = [];
  const preferidos = ["titulo", "nombre", "nombre_negocio", "estado", "accion", "rol", "plan", "ciudad", "motivo"];
  for (const k of preferidos) {
    const v = (meta as Record<string, unknown>)[k];
    if (v != null && v !== "") partes.push(String(v));
    if (partes.length >= 2) break;
  }
  return partes.length ? partes.join(" · ") : "—";
}
