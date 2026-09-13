"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";
import { evaluarMatch, perfilDe } from "@/lib/matching";
import { esVisibleEnPortal } from "@/lib/vacante";
import { registrarEvento } from "@/lib/eventos";
import { registrarAuditoria } from "@/lib/audit";
import { limitar } from "@/lib/rate-limit";
import { transicionPermitida } from "@/lib/postulaciones-reglas";
import { normalizarFuente, type EstadoPostulacion, type Fuente } from "@/lib/constants";
import { limpiarMensaje } from "@/lib/candidato-validacion";
import { log } from "@/lib/log";
import type { Candidato, Vacante } from "@/lib/types";

export type PostulacionResult =
  | { ok: true; score: number }
  | { error: "ya_postulado" | "cerrada" | "limite_tasa" | "generico" };

/**
 * El candidato se postula a una vacante. Sin límites de plan: postular es gratis.
 * Guarda score + detalle del match, fuente, historial, auditoría y evento.
 */
export async function postularse(
  vacanteId: string,
  opts?: { mensaje?: string; fuente?: Fuente },
): Promise<PostulacionResult> {
  const sesion = await getUsuario();
  if (!sesion) redirect(`/login?next=/v/${vacanteId}`);
  if (sesion.tipo !== "candidato") return { error: "generico" };
  const userId = sesion.user.id;

  const admin = createAdminClient();
  const { data: candidato } = await admin.from("candidatos").select("*").eq("id", userId).maybeSingle();
  if (!candidato) redirect("/registro-candidato");
  const c = candidato as Candidato;
  if (!c.activo) return { error: "generico" };

  const { data: vacante } = await admin.from("vacantes").select("*").eq("id", vacanteId).maybeSingle();
  if (!vacante || !esVisibleEnPortal(vacante as Vacante)) return { error: "cerrada" };
  const v = vacante as Vacante;

  const limite = await limitar("postular", userId);
  if (!limite.permitido) return { error: "limite_tasa" };

  const { data: previa } = await admin
    .from("postulaciones")
    .select("id")
    .eq("candidato_id", userId)
    .eq("vacante_id", vacanteId)
    .maybeSingle();
  if (previa) return { error: "ya_postulado" };

  const detalle = evaluarMatch(perfilDe(c), v);
  const fuente = normalizarFuente(opts?.fuente);

  const { data: creada, error } = await admin
    .from("postulaciones")
    .insert({
      candidato_id: userId,
      vacante_id: vacanteId,
      estado: "enviada",
      score_match: detalle.score,
      match_detalle: detalle,
      fuente,
      mensaje: limpiarMensaje(opts?.mensaje),
    })
    .select("id")
    .single();
  if (error || !creada) {
    if (error?.code === "23505") return { error: "ya_postulado" };
    log.error("postulacion_insert_fallo", { vacanteId, err: error });
    return { error: "generico" };
  }

  const { error: histErr } = await admin.from("postulacion_historial").insert({
    postulacion_id: creada.id,
    estado_anterior: null,
    estado_nuevo: "enviada",
    actor_id: userId,
    actor_tipo: "candidato",
  });
  if (histErr) log.error("postulacion_historial_fallo", { postulacionId: creada.id, err: histErr });

  await registrarAuditoria({
    actor: { id: userId, tipo: "candidato" },
    accion: "postulacion.creada",
    entidad: "postulaciones",
    entidadId: creada.id,
    despues: { vacante_id: vacanteId, estado: "enviada", score_match: detalle.score, fuente },
  });
  await registrarEvento({
    tipo: "postulacion",
    actor_id: userId,
    actor_tipo: "candidato",
    entidad: "vacantes",
    entidad_id: vacanteId,
    meta: { score: detalle.score, fuente },
  });

  revalidatePath(`/v/${vacanteId}`);
  revalidatePath("/mis-vacantes");
  revalidatePath("/perfil");
  return { ok: true, score: detalle.score };
}

/** El candidato retira su postulación (solo desde estados abiertos). */
export async function retirarPostulacion(postulacionId: string): Promise<{ ok: true } | { error: string }> {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/perfil");
  const userId = sesion.user.id;

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("postulaciones")
    .select("id, candidato_id, vacante_id, estado")
    .eq("id", postulacionId)
    .maybeSingle();
  if (!post || post.candidato_id !== userId) return { error: "No encontramos esa postulación." };

  const desde = post.estado as EstadoPostulacion;
  if (!transicionPermitida("candidato", desde, "retirada"))
    return { error: "Esta postulación ya no se puede retirar." };

  const ahora = new Date().toISOString();
  // Condición sobre el estado leído: si la empresa lo cambió entretanto, no se pisa.
  const { data: actualizada, error } = await admin
    .from("postulaciones")
    .update({ estado: "retirada", estado_actualizado_en: ahora })
    .eq("id", postulacionId)
    .eq("estado", desde)
    .select("id");
  if (error) {
    log.error("retirar_postulacion_fallo", { postulacionId, err: error });
    return { error: "No se pudo retirar. Intenta de nuevo." };
  }
  if (!actualizada?.length) return { error: "El estado de la postulación cambió. Recarga la página." };

  const { error: histErr } = await admin.from("postulacion_historial").insert({
    postulacion_id: postulacionId,
    estado_anterior: desde,
    estado_nuevo: "retirada",
    actor_id: userId,
    actor_tipo: "candidato",
  });
  if (histErr) log.error("postulacion_historial_fallo", { postulacionId, err: histErr });

  await registrarAuditoria({
    actor: { id: userId, tipo: "candidato" },
    accion: "postulacion.retirada",
    entidad: "postulaciones",
    entidadId: postulacionId,
    antes: { estado: desde },
    despues: { estado: "retirada" },
  });
  await registrarEvento({
    tipo: "postulacion_retirada",
    actor_id: userId,
    actor_tipo: "candidato",
    entidad: "postulaciones",
    entidad_id: postulacionId,
    meta: { vacante_id: post.vacante_id, desde },
  });

  revalidatePath(`/v/${post.vacante_id}`);
  revalidatePath("/mis-vacantes");
  revalidatePath("/perfil");
  return { ok: true };
}
