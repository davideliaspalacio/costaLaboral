import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/log";
import { ESTADOS_SIN_CUOTA, inicioMesBogota } from "./cuota";
import { totalesTokens, type UsoConIteraciones } from "./precios";
import type { EstadoIA, FeatureIA } from "./tipos";

/* ============================================================
   Tracking de uso de IA (tabla ia_uso). TODA llamada deja una fila:
   éxito, error, negativa, validación fallida, sin credenciales o
   respaldo local. Nunca guarda texto del candidato.
   ============================================================ */

export type FilaUsoIA = {
  actorId: string;
  actorTipo?: "candidato" | "empresa" | "admin" | "sistema";
  feature: FeatureIA;
  entidad?: string | null;
  entidadId?: string | null;
  proveedor?: string;
  modelo: string;
  modeloServido: string | null;
  promptVersion: string;
  plan: string;
  usage: UsoConIteraciones | null;
  costoUsd: number;
  latenciaMs: number | null;
  estado: EstadoIA;
  error: string | null;
  requestId: string | null;
};

const MAX_ERROR = 300;

/** Inserta la fila y devuelve su id (null si falló; nunca lanza). */
export async function registrarUsoIA(f: FilaUsoIA): Promise<string | null> {
  const t = totalesTokens(f.usage);
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ia_uso")
      .insert({
        actor_id: f.actorId,
        actor_tipo: f.actorTipo ?? "candidato",
        feature: f.feature,
        entidad: f.entidad ?? null,
        entidad_id: f.entidadId ?? null,
        proveedor: f.proveedor ?? "anthropic",
        modelo: f.modelo,
        modelo_servido: f.modeloServido,
        prompt_version: f.promptVersion,
        plan: f.plan,
        input_tokens: t.input,
        output_tokens: t.output,
        cache_creation_tokens: t.cacheCreation,
        cache_read_tokens: t.cacheRead,
        costo_usd: f.costoUsd,
        latencia_ms: f.latenciaMs === null ? null : Math.round(f.latenciaMs),
        estado: f.estado,
        error: f.error ? f.error.slice(0, MAX_ERROR) : null,
        request_id: f.requestId,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data?.id as string) ?? null;
  } catch (err) {
    log.error("ia_uso_fallo", { feature: f.feature, estado: f.estado, err });
    return null;
  }
}

/** Asocia la fila de uso con la entidad guardada (hoja de vida / perfil de LinkedIn). */
export async function vincularUsoIA(usoId: string | null, entidad: string, entidadId: string): Promise<void> {
  if (!usoId) return;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("ia_uso").update({ entidad, entidad_id: entidadId }).eq("id", usoId);
    if (error) throw error;
  } catch (err) {
    log.warn("ia_uso_vincular_fallo", { usoId, entidad, err });
  }
}

/**
 * Generaciones que consumen cuota en el mes calendario actual (hora Bogotá):
 * filas del actor y la feature con estado distinto de error/sin_credenciales.
 */
export async function cuotaUsadaMes(actorId: string, feature: FeatureIA, ahora: Date = new Date()): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("ia_uso")
    .select("id", { count: "exact", head: true })
    .eq("actor_id", actorId)
    .eq("feature", feature)
    .gte("creado_en", inicioMesBogota(ahora).toISOString())
    .not("estado", "in", `(${ESTADOS_SIN_CUOTA.join(",")})`);
  if (error) {
    log.error("ia_cuota_fallo", { feature, err: error });
    return 0;
  }
  return count ?? 0;
}
