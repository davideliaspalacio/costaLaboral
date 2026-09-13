"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";
import { limitar, mensajeLimite } from "@/lib/rate-limit";
import { registrarAuditoria, ACTOR_SISTEMA } from "@/lib/audit";
import { registrarEvento } from "@/lib/eventos";
import { log } from "@/lib/log";
import { REPORTES_PARA_OCULTAR, type MotivoReporte } from "@/lib/constants";
import { validarReporte } from "@/components/vacante/reporte";

/**
 * Un usuario (candidato o empresa, no la dueña) reporta una vacante.
 * Con ≥ REPORTES_PARA_OCULTAR reportes abiertos (uno por usuario) una
 * vacante aprobada pasa a "reportada" y se oculta hasta revisión.
 */
export async function reportarVacante(
  vacanteId: string,
  motivo: MotivoReporte,
  detalle?: string,
): Promise<{ ok: true } | { error: string }> {
  const sesion = await getUsuario();
  if (!sesion) return { error: "Inicia sesión para reportar la vacante." };
  if (sesion.tipo !== "candidato" && sesion.tipo !== "empresa") return { error: "Tu cuenta no puede reportar vacantes." };
  const userId = sesion.user.id;

  const limite = await limitar("reportar", userId);
  if (!limite.permitido) return { error: mensajeLimite(limite) };

  const validado = validarReporte(motivo, detalle);
  if ("error" in validado) return validado;
  if (typeof vacanteId !== "string" || !/^[0-9a-f-]{36}$/i.test(vacanteId)) return { error: "Vacante no encontrada." };

  const admin = createAdminClient();
  const { data: vacante } = await admin
    .from("vacantes")
    .select("id, empresa_id, estado_moderacion")
    .eq("id", vacanteId)
    .maybeSingle();
  if (!vacante) return { error: "Vacante no encontrada." };
  if (vacante.empresa_id === userId) return { error: "No puedes reportar tu propia vacante." };

  const { data: reporte, error } = await admin
    .from("reportes_vacante")
    .insert({ vacante_id: vacanteId, reportante_id: userId, motivo: validado.motivo, detalle: validado.detalle })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "Ya reportaste esta vacante." };
    log.error("reporte_vacante_fallo", { vacanteId, err: error });
    return { error: "No pudimos enviar el reporte. Intenta de nuevo." };
  }

  const actor = { id: userId, tipo: sesion.tipo };
  await Promise.all([
    registrarAuditoria({
      actor,
      accion: "vacante.reportada",
      entidad: "vacantes",
      entidadId: vacanteId,
      metadata: { reporte_id: reporte.id, motivo: validado.motivo },
    }),
    registrarEvento({
      tipo: "reporte_vacante",
      actor_id: userId,
      actor_tipo: sesion.tipo,
      entidad: "vacantes",
      entidad_id: vacanteId,
      meta: { motivo: validado.motivo },
    }),
  ]);

  // Umbral: ocultar hasta revisión (solo si sigue aprobada; la condición evita carreras).
  const { count } = await admin
    .from("reportes_vacante")
    .select("id", { count: "exact", head: true })
    .eq("vacante_id", vacanteId)
    .eq("estado", "abierto");
  const abiertos = count ?? 0;
  let ocultada = false;
  if (abiertos >= REPORTES_PARA_OCULTAR && vacante.estado_moderacion === "aprobada") {
    const { data: actualizada } = await admin
      .from("vacantes")
      .update({ estado_moderacion: "reportada", actualizada_en: new Date().toISOString() })
      .eq("id", vacanteId)
      .eq("estado_moderacion", "aprobada")
      .select("id");
    if (actualizada?.length) {
      ocultada = true;
      await Promise.all([
        registrarAuditoria({
          actor: ACTOR_SISTEMA,
          accion: "vacante.moderada",
          entidad: "vacantes",
          entidadId: vacanteId,
          antes: { estado_moderacion: "aprobada" },
          despues: { estado_moderacion: "reportada" },
          metadata: { motivo: "umbral_reportes", reportes_abiertos: abiertos },
        }),
        registrarEvento({
          tipo: "vacante_moderada",
          actor_tipo: "sistema",
          entidad: "vacantes",
          entidad_id: vacanteId,
          meta: { accion: "reportada", motivo: "umbral_reportes", reportes_abiertos: abiertos },
        }),
      ]);
    }
  }

  revalidatePath(`/v/${vacanteId}`);
  if (ocultada) {
    revalidatePath("/ofertas");
    revalidatePath("/");
  }
  return { ok: true };
}
