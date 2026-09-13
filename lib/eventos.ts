import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/log";

/* ============================================================
   Eventos de producto (analítica y KPIs, sección 14).
   No es la auditoría: para trazabilidad usa lib/audit.ts.
   ============================================================ */

export type EventoTipo =
  | "registro_candidato"
  | "registro_empresa"
  | "login"
  | "vacante_publicada"
  | "vacante_vista"
  | "recomendaciones_mostradas"
  | "recomendacion_click"
  | "postulacion"
  | "postulacion_retirada"
  | "reporte_vacante"
  | "notif_enviada"
  | "plan_activado"
  | "pago_aprobado"
  | "vacante_destacada"
  | "hv_generada"
  | "hv_aprobada"
  | "hv_exportada"
  | "hv_adaptada"
  | "linkedin_generado"
  | "linkedin_exportado"
  | "invitacion_candidato"
  | "contacto_whatsapp"
  | "checkout_iniciado"
  | "solicitud_titular"
  | "empresa_verificada"
  | "vacante_moderada"
  | "consentimiento"
  | "cuenta_eliminada";

export type ActorEvento = "candidato" | "empresa" | "admin" | "sistema" | "visitante";

type Evento = {
  tipo: EventoTipo;
  actor_id?: string | null;
  actor_tipo?: ActorEvento;
  entidad?: string;
  entidad_id?: string | null;
  meta?: Record<string, unknown>;
};

/** Registra un evento de uso. Nunca rompe el flujo principal si falla. */
export async function registrarEvento(e: Evento): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("eventos").insert({
      tipo: e.tipo,
      actor_id: e.actor_id ?? null,
      actor_tipo: e.actor_tipo ?? "sistema",
      entidad: e.entidad ?? null,
      entidad_id: e.entidad_id ?? null,
      meta: e.meta ?? {},
    });
    if (error) throw error;
  } catch (err) {
    log.warn("evento_fallo", { tipo: e.tipo, err });
  }
}
