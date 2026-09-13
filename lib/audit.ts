import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { infoRequest } from "@/lib/request";
import { log } from "@/lib/log";

/* ============================================================
   Auditoría (sección 5 AuditLog + sección 14: trazabilidad completa).
   - audit_log es append-only (sin UPDATE/DELETE, ni para el servidor).
   - Toda mutación de negocio registra quién, qué, sobre qué, antes/después.
   - `eventos` (lib/eventos.ts) es otra cosa: analítica de producto/KPIs.
   ============================================================ */

export const ACCIONES = [
  "candidato.registro",
  "candidato.perfil_actualizado",
  "candidato.preferencias_actualizadas",
  "candidato.activado",
  "candidato.desactivado",
  "cuenta.eliminada",
  "empresa.registro",
  "empresa.perfil_actualizado",
  "empresa.verificacion_solicitada",
  "empresa.verificada",
  "empresa.verificacion_rechazada",
  "empresa.verificacion_revocada",
  "vacante.creada",
  "vacante.editada",
  "vacante.publicada",
  "vacante.pausada",
  "vacante.reanudada",
  "vacante.cerrada",
  "vacante.reabierta",
  "vacante.expirada",
  "vacante.moderada",
  "vacante.destacada",
  "vacante.reportada",
  "reporte.resuelto",
  "postulacion.creada",
  "postulacion.estado_cambiado",
  "postulacion.retirada",
  "hv.generada",
  "hv.editada",
  "hv.aprobada",
  "hv.version_creada",
  "hv.eliminada",
  "linkedin.generado",
  "linkedin.editado",
  "linkedin.aprobado",
  "pago.creado",
  "pago.aprobado",
  "pago.fallido",
  "pago.reembolsado",
  "pago.anulado",
  "suscripcion.activada",
  "suscripcion.renovada",
  "suscripcion.cancelada",
  "suscripcion.vencida",
  "suscripcion.past_due",
  "staff.rol_cambiado",
  "solicitud_titular.creada",
  "solicitud_titular.actualizada",
  "sistema.tarea_programada",
] as const;
export type AccionAuditoria = (typeof ACCIONES)[number];

export type ActorTipo = "candidato" | "empresa" | "admin" | "sistema";

export type ActorAuditoria = {
  id: string | null;
  tipo: ActorTipo;
  /** Solo para staff: los correos de usuarios finales no se copian al log. */
  email?: string | null;
};

export const ACTOR_SISTEMA: ActorAuditoria = { id: null, tipo: "sistema" };

export type EntradaAuditoria = {
  actor: ActorAuditoria;
  accion: AccionAuditoria;
  entidad: string;
  entidadId?: string | null;
  antes?: Record<string, unknown> | null;
  despues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

/** Deja solo los campos que cambiaron (evita copiar filas completas con datos personales). */
export function diffCampos(
  antes: Record<string, unknown> | null | undefined,
  despues: Record<string, unknown> | null | undefined,
): { antes: Record<string, unknown>; despues: Record<string, unknown> } {
  const a: Record<string, unknown> = {};
  const d: Record<string, unknown> = {};
  const claves = new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})]);
  for (const k of claves) {
    const va = antes?.[k];
    const vd = despues?.[k];
    if (JSON.stringify(va) !== JSON.stringify(vd)) {
      a[k] = va ?? null;
      d[k] = vd ?? null;
    }
  }
  return { antes: a, despues: d };
}

/** Registra una entrada de auditoría. Nunca lanza: si falla, deja un log de error para alertar. */
export async function registrarAuditoria(e: EntradaAuditoria): Promise<void> {
  try {
    const req = await infoRequest();
    const admin = createAdminClient();
    const { error } = await admin.from("audit_log").insert({
      actor_id: e.actor.id,
      actor_tipo: e.actor.tipo,
      actor_email: e.actor.tipo === "admin" ? (e.actor.email ?? null) : null,
      accion: e.accion,
      entidad: e.entidad,
      entidad_id: e.entidadId ?? null,
      antes: e.antes ?? null,
      despues: e.despues ?? null,
      metadata: e.metadata ?? {},
      ip: req.ip,
      user_agent: req.userAgent,
      request_id: req.requestId,
    });
    if (error) throw error;
  } catch (err) {
    log.error("audit_log_fallo", { accion: e.accion, entidad: e.entidad, entidadId: e.entidadId, err });
  }
}
