import {
  AREAS,
  ESTADOS_VACANTE,
  MOTIVOS_REPORTE,
  NIVELES_EDUCATIVOS,
  PLAN_EMPRESA_NOMBRE,
  PLAN_NOMBRE,
  SECTORES,
  type PlanEmpresaId,
  type PlanId,
} from "@/lib/constants";
import { sumarDiasHabiles } from "@/lib/legal/dias-habiles";
import type { BadgeProps } from "@/components/ui/badge";

export type Tone = NonNullable<BadgeProps["tone"]>;

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

/** Etiqueta + tono de un plan (candidato o empresa). */
export function planInfo(value: string | null | undefined): { label: string; tone: Tone } {
  const v = value ?? "gratis";
  const label = PLAN_NOMBRE[v as PlanId] ?? PLAN_EMPRESA_NOMBRE[v as PlanEmpresaId] ?? v;
  const tone: Tone = v === "berraco_pro" || v === "pro" ? "accent" : v === "camelleitor" ? "brand" : "neutral";
  return { label, tone };
}

export function labelEstadoVacante(value: string): string {
  return ESTADOS_VACANTE.find((e) => e.value === value)?.label ?? value;
}

export function labelMotivoReporte(value: string): string {
  return MOTIVOS_REPORTE.find((m) => m.value === value)?.label ?? value;
}

/* ---------------- Moderación y verificación ---------------- */

export const MODERACION_LABEL: Record<string, string> = {
  aprobada: "Aprobada",
  pendiente: "En revisión",
  rechazada: "Rechazada",
  reportada: "Reportada",
};

export const MODERACION_TONO: Record<string, Tone> = {
  aprobada: "success",
  pendiente: "warn",
  rechazada: "danger",
  reportada: "accent",
};

export const VERIFICACION_LABEL: Record<string, string> = {
  sin_verificar: "Sin verificar",
  en_revision: "En revisión",
  verificada: "Verificada",
  rechazada: "Rechazada",
};

export const VERIFICACION_TONO: Record<string, Tone> = {
  sin_verificar: "neutral",
  en_revision: "warn",
  verificada: "success",
  rechazada: "danger",
};

/* ---------------- Pagos ---------------- */

export const PAGO_ESTADO_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  fallido: "Fallido",
  reembolsado: "Reembolsado",
  anulado: "Anulado",
};

export const PAGO_ESTADO_TONO: Record<string, Tone> = {
  pendiente: "warn",
  aprobado: "success",
  fallido: "danger",
  reembolsado: "accent",
  anulado: "neutral",
};

export const PAGO_CONCEPTO_LABEL: Record<string, string> = {
  suscripcion: "Suscripción",
  renovacion: "Renovación",
  vacante_destacada: "Vacante destacada",
  addon: "Adicional",
};

export const SUSCRIPCION_ESTADO_LABEL: Record<string, string> = {
  active: "Activa",
  past_due: "Pago atrasado",
  canceled: "Cancelada",
  expired: "Vencida",
};

export const SUSCRIPCION_ESTADO_TONO: Record<string, Tone> = {
  active: "success",
  past_due: "warn",
  canceled: "neutral",
  expired: "outline",
};

/* ---------------- Solicitudes de titulares ---------------- */

export const SOLICITUD_TIPO_LABEL: Record<string, string> = {
  consulta: "Consulta",
  actualizacion: "Actualización",
  rectificacion: "Rectificación",
  supresion: "Supresión",
  revocatoria: "Revocatoria",
  prueba_autorizacion: "Prueba de autorización",
};

export const SOLICITUD_ESTADO_LABEL: Record<string, string> = {
  recibida: "Recibida",
  en_tramite: "En trámite",
  respondida: "Respondida",
  cerrada: "Cerrada",
};

export const SOLICITUD_ESTADO_TONO: Record<string, Tone> = {
  recibida: "brand",
  en_tramite: "sol",
  respondida: "success",
  cerrada: "neutral",
};

export type SemaforoSolicitud = "vencida" | "por_vencer" | "en_plazo" | "atendida";

/** Días hábiles de anticipación para marcar una solicitud "por vencer". */
export const DIAS_ALERTA_SOLICITUD = 3;

/** Semáforo del plazo legal: vencida, por vencer (≤ 3 días hábiles), en plazo o ya atendida. */
export function semaforoSolicitud(
  venceEn: string | Date,
  estado: string,
  ahora = new Date(),
): SemaforoSolicitud {
  if (estado === "respondida" || estado === "cerrada") return "atendida";
  const vence = typeof venceEn === "string" ? new Date(venceEn) : venceEn;
  if (vence.getTime() < ahora.getTime()) return "vencida";
  if (vence.getTime() <= sumarDiasHabiles(ahora, DIAS_ALERTA_SOLICITUD).getTime()) return "por_vencer";
  return "en_plazo";
}

export const SEMAFORO_SOLICITUD: Record<SemaforoSolicitud, { label: string; tone: Tone }> = {
  vencida: { label: "Vencida", tone: "danger" },
  por_vencer: { label: "Por vencer", tone: "warn" },
  en_plazo: { label: "En plazo", tone: "success" },
  atendida: { label: "Atendida", tone: "neutral" },
};

/* ---------------- Eventos (analítica) ---------------- */

export const EVENTO_LABEL: Record<string, string> = {
  registro_candidato: "Registro candidato",
  registro_empresa: "Registro empresa",
  login: "Inicio de sesión",
  vacante_publicada: "Vacante publicada",
  vacante_vista: "Vista de vacante",
  recomendaciones_mostradas: "Recomendaciones mostradas",
  recomendacion_click: "Clic en recomendación",
  postulacion: "Postulación",
  postulacion_retirada: "Postulación retirada",
  reporte_vacante: "Reporte de vacante",
  notif_enviada: "Notificación enviada",
  plan_activado: "Plan activado",
  pago_aprobado: "Pago aprobado",
  vacante_destacada: "Vacante destacada",
  hv_generada: "Hoja de vida generada",
  hv_aprobada: "Hoja de vida aprobada",
  hv_exportada: "Hoja de vida exportada",
  hv_adaptada: "Hoja de vida adaptada",
  linkedin_generado: "LinkedIn generado",
  linkedin_exportado: "LinkedIn exportado",
  invitacion_candidato: "Invitación a candidato",
  contacto_whatsapp: "Contacto por WhatsApp",
  checkout_iniciado: "Checkout iniciado",
  solicitud_titular: "Solicitud de titular",
  empresa_verificada: "Empresa verificada",
  vacante_moderada: "Vacante moderada",
  consentimiento: "Consentimiento",
  cuenta_eliminada: "Cuenta eliminada",
};

export function labelEvento(tipo: string): string {
  return EVENTO_LABEL[tipo] ?? tipo;
}

export const EVENTO_TONO: Record<string, Tone> = {
  registro_candidato: "brand",
  registro_empresa: "brand",
  login: "outline",
  vacante_publicada: "sol",
  vacante_vista: "outline",
  recomendaciones_mostradas: "outline",
  recomendacion_click: "brand",
  postulacion: "success",
  postulacion_retirada: "neutral",
  reporte_vacante: "danger",
  notif_enviada: "neutral",
  plan_activado: "accent",
  pago_aprobado: "success",
  vacante_destacada: "sol",
  hv_generada: "accent",
  hv_aprobada: "accent",
  hv_exportada: "accent",
  hv_adaptada: "accent",
  linkedin_generado: "accent",
  linkedin_exportado: "accent",
  invitacion_candidato: "brand",
  contacto_whatsapp: "success",
  checkout_iniciado: "warn",
  solicitud_titular: "warn",
  empresa_verificada: "success",
  vacante_moderada: "ink",
  consentimiento: "outline",
  cuenta_eliminada: "danger",
};

/** Resumen corto y legible del meta jsonb de un evento. */
export function resumenMeta(meta: Record<string, unknown> | null | undefined): string {
  if (!meta || typeof meta !== "object") return "—";
  const partes: string[] = [];
  const preferidos = ["titulo", "nombre", "nombre_negocio", "estado", "fuente", "motivo", "plan", "producto", "cantidad", "score"];
  for (const k of preferidos) {
    const v = (meta as Record<string, unknown>)[k];
    if (v != null && v !== "" && typeof v !== "object") partes.push(String(v));
    if (partes.length >= 2) break;
  }
  return partes.length ? partes.join(" · ") : "—";
}

/* ---------------- Auditoría ---------------- */

export const ENTIDAD_LABEL: Record<string, string> = {
  candidatos: "Candidato",
  empresas: "Empresa",
  vacantes: "Vacante",
  postulaciones: "Postulación",
  reportes_vacante: "Reporte",
  hojas_de_vida: "Hoja de vida",
  linkedin_perfiles: "LinkedIn",
  pagos: "Pago",
  suscripciones: "Suscripción",
  staff: "Staff",
  solicitudes_titular: "Solicitud de titular",
  cuentas: "Cuenta",
  sistema: "Sistema",
};

export const ACTOR_LABEL: Record<string, string> = {
  candidato: "Candidato",
  empresa: "Empresa",
  admin: "Staff",
  sistema: "Sistema",
  visitante: "Visitante",
};

/** Tono de una acción de auditoría según su verbo. */
export function tonoAccion(accion: string): Tone {
  if (/rechaz|revoc|reembols|anulad|fallido|eliminad|desactiv|vencida|reportada/.test(accion)) return "danger";
  if (/verificada$|aprobad|activad|publicada|creada|registro|resuelto/.test(accion)) return "success";
  if (/moderada|rol_cambiado|actualizada|cancelada|past_due/.test(accion)) return "warn";
  return "neutral";
}

/** Fecha (y hora) en zona de Bogotá. */
export function fechaCO(iso: string | null | undefined, conHora = false): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Valor de un campo del diff en texto corto. */
export function valorLegible(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "string") return v;
  if (typeof v === "number") return v.toLocaleString("es-CO");
  return JSON.stringify(v);
}
