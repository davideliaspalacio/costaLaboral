import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type EventoTipo =
  | "registro_candidato"
  | "registro_empresa"
  | "vacante_publicada"
  | "postulacion"
  | "notif_enviada"
  | "plan_activado"
  | "hv_generada"
  | "empresa_verificada"
  | "vacante_moderada"
  | "login";

type Evento = {
  tipo: EventoTipo;
  actor_id?: string | null;
  actor_tipo?: "candidato" | "empresa" | "admin" | "sistema";
  entidad?: string;
  entidad_id?: string | null;
  meta?: Record<string, unknown>;
};

/** Registra un evento de uso. Nunca rompe el flujo principal si falla. */
export async function registrarEvento(e: Evento): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("eventos").insert({
      tipo: e.tipo,
      actor_id: e.actor_id ?? null,
      actor_tipo: e.actor_tipo ?? "sistema",
      entidad: e.entidad ?? null,
      entidad_id: e.entidad_id ?? null,
      meta: e.meta ?? {},
    });
  } catch {
    // tracking best-effort
  }
}
