import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BENEFICIOS_CANDIDATO,
  BENEFICIOS_EMPRESA,
  planCandidatoEfectivo,
  planEmpresaEfectivo,
  type BeneficiosCandidato,
  type BeneficiosEmpresa,
  type SuscripcionMin,
} from "@/lib/entitlements";
import type { PlanEmpresaId, PlanId } from "@/lib/constants";

/* ============================================================
   Lectura del plan vigente. La tabla `suscripciones` es la fuente
   de verdad; `candidatos.plan` / `empresas.plan` son caché que el
   servicio de pagos mantiene sincronizada (sincronizarPlanCache).
   ============================================================ */

export type Suscripcion = SuscripcionMin & {
  id: string;
  propietario_id: string;
  propietario_tipo: "candidato" | "empresa";
  proveedor: string;
  customer_externo: string | null;
  suscripcion_externa: string | null;
  periodo_inicio: string;
  cancelar_al_final: boolean;
  cancelada_en: string | null;
  creado_en: string;
  actualizado_en: string;
};

/** Suscripción active/past_due del propietario (hay como máximo una, índice único). */
export async function getSuscripcionVigente(propietarioId: string): Promise<Suscripcion | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("suscripciones")
    .select("*")
    .eq("propietario_id", propietarioId)
    .in("estado", ["active", "past_due"])
    .maybeSingle();
  return (data as Suscripcion) ?? null;
}

export async function getBeneficiosCandidato(
  candidatoId: string,
): Promise<{ plan: PlanId; beneficios: BeneficiosCandidato; suscripcion: Suscripcion | null }> {
  const suscripcion = await getSuscripcionVigente(candidatoId);
  const plan = planCandidatoEfectivo(suscripcion);
  return { plan, beneficios: BENEFICIOS_CANDIDATO[plan], suscripcion };
}

export async function getBeneficiosEmpresa(
  empresaId: string,
): Promise<{ plan: PlanEmpresaId; beneficios: BeneficiosEmpresa; suscripcion: Suscripcion | null }> {
  const suscripcion = await getSuscripcionVigente(empresaId);
  const plan = planEmpresaEfectivo(suscripcion);
  return { plan, beneficios: BENEFICIOS_EMPRESA[plan], suscripcion };
}

/** Recalcula y guarda la caché de plan del propietario. Llamar tras cualquier cambio de suscripción. */
export async function sincronizarPlanCache(propietarioId: string, tipo: "candidato" | "empresa"): Promise<void> {
  const suscripcion = await getSuscripcionVigente(propietarioId);
  const admin = createAdminClient();
  if (tipo === "candidato") {
    await admin.from("candidatos").update({ plan: planCandidatoEfectivo(suscripcion) }).eq("id", propietarioId);
  } else {
    await admin.from("empresas").update({ plan: planEmpresaEfectivo(suscripcion) }).eq("id", propietarioId);
  }
}
