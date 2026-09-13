"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";
import { registrarAuditoria, type ActorAuditoria } from "@/lib/audit";
import { registrarEvento } from "@/lib/eventos";
import { registrarConsentimientos } from "@/lib/legal/consentimientos";
import { getSuscripcionVigente } from "@/lib/billing/suscripciones";
import { cancelarSuscripcionAdmin } from "@/lib/billing/servicio";
import { log } from "@/lib/log";

export type PreferenciaCandidato = "whatsapp" | "perfil_visible_empresas";

/**
 * Activa o revoca una autorización del candidato desde /cuenta.
 * - Revocar tiene efecto inmediato: primero se apaga la columna, luego se deja la evidencia.
 * - Otorgar exige evidencia: primero se registra el consentimiento y luego se activa.
 */
export async function actualizarPreferencia(
  preferencia: PreferenciaCandidato,
  otorgado: boolean,
): Promise<{ ok: true } | { error: string }> {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/cuenta");
  if (sesion.tipo !== "candidato") return { error: "Solo disponible para candidatos." };
  if (preferencia !== "whatsapp" && preferencia !== "perfil_visible_empresas")
    return { error: "Preferencia no válida." };
  const valor = otorgado === true;
  const userId = sesion.user.id;
  const titular = { id: userId, tipo: "candidato" as const };
  const admin = createAdminClient();

  const { data: antes } = await admin
    .from("candidatos")
    .select("wsp_opt_in, perfil_visible_empresas")
    .eq("id", userId)
    .maybeSingle();
  if (!antes) return { error: "No encontramos tu perfil." };

  const ahora = new Date().toISOString();
  const cambios =
    preferencia === "whatsapp"
      ? valor
        ? { wsp_opt_in: true, wsp_opt_in_en: ahora }
        : { wsp_opt_in: false, wsp_opt_out_en: ahora }
      : { perfil_visible_empresas: valor };

  const actualizar = () =>
    admin
      .from("candidatos")
      .update({ ...cambios, actualizado_en: ahora })
      .eq("id", userId);

  if (valor) {
    const ok = await registrarConsentimientos(titular, [{ finalidad: preferencia, otorgado: true }], "cuenta");
    if (!ok) return { error: "No pudimos guardar tu autorización. Intenta de nuevo." };
    const { error } = await actualizar();
    if (error) return { error: "No se pudo guardar. Intenta de nuevo." };
  } else {
    const { error } = await actualizar();
    if (error) return { error: "No se pudo guardar. Intenta de nuevo." };
    const ok = await registrarConsentimientos(titular, [{ finalidad: preferencia, otorgado: false }], "cuenta");
    if (!ok) log.error("revocatoria_sin_evidencia", { userId, preferencia });
  }

  const columna = preferencia === "whatsapp" ? "wsp_opt_in" : "perfil_visible_empresas";
  await registrarAuditoria({
    actor: { id: userId, tipo: "candidato" },
    accion: "candidato.preferencias_actualizadas",
    entidad: "candidatos",
    entidadId: userId,
    antes: { [columna]: antes[columna] },
    despues: { [columna]: valor },
    metadata: { finalidad: preferencia, canal: "cuenta" },
  });

  revalidatePath("/cuenta");
  return { ok: true };
}

/**
 * Elimina la cuenta del usuario logueado y sus datos personales (derecho de
 * supresión, Ley 1581 de 2012). Acción permanente.
 *
 * - Deja la auditoría ANTES de borrar.
 * - Cancela de inmediato la suscripción vigente, si la hay.
 * - Borra el perfil (la cascada limpia postulaciones, notificaciones, hojas de
 *   vida; en empresas, vacantes) y el usuario de auth.
 * - Consentimientos, pagos/suscripciones y audit_log NO se borran (no tienen
 *   FK): se conservan por obligación legal (prueba de autorización y soportes
 *   contables).
 */
export async function eliminarCuenta(): Promise<void> {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/cuenta");

  const { user, tipo } = sesion;
  const userId = user.id;
  const actor: ActorAuditoria = { id: userId, tipo, email: tipo === "admin" ? user.email : null };
  const admin = createAdminClient();

  await registrarAuditoria({
    actor,
    accion: "cuenta.eliminada",
    entidad: tipo === "empresa" ? "empresas" : "candidatos",
    entidadId: userId,
    metadata: { base_legal: "Ley 1581 de 2012", motivo: "solicitud del titular" },
  });

  const suscripcion = await getSuscripcionVigente(userId);
  if (suscripcion) {
    const r = await cancelarSuscripcionAdmin(suscripcion.id, actor, true);
    if ("error" in r) log.error("eliminar_cuenta_cancelar_suscripcion_fallo", { userId, error: r.error });
  }

  const { error: perfilErr } =
    tipo === "empresa"
      ? await admin.from("empresas").delete().eq("id", userId)
      : await admin.from("candidatos").delete().eq("id", userId);
  if (perfilErr) log.error("eliminar_cuenta_perfil_fallo", { userId, err: perfilErr });

  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) log.error("eliminar_cuenta_auth_fallo", { userId, err: authErr });

  await registrarEvento({
    tipo: "cuenta_eliminada",
    actor_id: userId,
    actor_tipo: tipo,
    entidad: tipo === "empresa" ? "empresas" : "candidatos",
    entidad_id: userId,
  });

  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/?cuenta=eliminada");
}
