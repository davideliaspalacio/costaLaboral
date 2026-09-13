"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { actorDeStaff, getStaff, puede, type Permiso, type StaffRol, type StaffSesion } from "@/lib/roles";
import { diffCampos, registrarAuditoria } from "@/lib/audit";
import { registrarEvento } from "@/lib/eventos";
import { dispararMatchingVacante } from "@/lib/notificaciones";
import { claseSolicitud, PLAZOS_HABEAS_DATA, sumarDiasHabiles } from "@/lib/legal/dias-habiles";
import { cancelarSuscripcionAdmin, reembolsarPago } from "@/lib/billing/servicio";
import { log } from "@/lib/log";
import type { Vacante } from "@/lib/types";

export type AdminActionResult = { ok: true } | { error: string };

const ROLES: StaffRol[] = ["super_admin", "admin", "moderador"];
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTA_MIN = 5;
const NOTA_MAX = 2000;

/** Sesión de staff con TODOS los permisos indicados, o error tipado. */
async function autorizar(...permisos: Permiso[]): Promise<{ staff: StaffSesion } | { error: string }> {
  const staff = await getStaff();
  if (!staff) return { error: "No autorizado." };
  if (!permisos.every((p) => puede(staff.rol, p))) return { error: "No tienes permiso para esta acción." };
  return { staff };
}

function idValido(id: unknown): id is string {
  return typeof id === "string" && RE_UUID.test(id);
}

/** Texto limpio y acotado; null si queda vacío. */
function limpiar(texto: unknown): string | null {
  if (typeof texto !== "string") return null;
  const t = texto.trim().slice(0, NOTA_MAX);
  return t || null;
}

const ahoraIso = () => new Date().toISOString();

/* ============================================================
   Verificación de empresas
   ============================================================ */

type EmpresaVerif = {
  id: string;
  nombre_negocio: string;
  verificacion: string;
  verificada_en: string | null;
  verificada_por: string | null;
  verificacion_nota: string | null;
};

async function cargarEmpresa(empresaId: string): Promise<EmpresaVerif | null> {
  const { data } = await createAdminClient()
    .from("empresas")
    .select("id, nombre_negocio, verificacion, verificada_en, verificada_por, verificacion_nota")
    .eq("id", empresaId)
    .maybeSingle();
  return (data as EmpresaVerif) ?? null;
}

async function aplicarVerificacion(
  staff: StaffSesion,
  empresa: EmpresaVerif,
  patch: Partial<EmpresaVerif>,
  accion: "empresa.verificada" | "empresa.verificacion_rechazada" | "empresa.verificacion_revocada",
): Promise<AdminActionResult> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("empresas")
    .update({ ...patch, actualizado_en: ahoraIso() })
    .eq("id", empresa.id)
    .eq("verificacion", empresa.verificacion); // evita pisar un cambio concurrente
  if (error) {
    log.error("admin_verificacion_fallo", { empresaId: empresa.id, accion, err: error });
    return { error: "No se pudo actualizar la verificación." };
  }
  const antes = Object.fromEntries(Object.keys(patch).map((k) => [k, empresa[k as keyof EmpresaVerif]]));
  const diff = diffCampos(antes, patch);
  await registrarAuditoria({
    actor: actorDeStaff(staff),
    accion,
    entidad: "empresas",
    entidadId: empresa.id,
    antes: diff.antes,
    despues: diff.despues,
    metadata: { nombre_negocio: empresa.nombre_negocio },
  });
  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
  return { ok: true };
}

export async function verificarEmpresa(empresaId: string): Promise<AdminActionResult> {
  const auth = await autorizar("verificar");
  if ("error" in auth) return auth;
  if (!idValido(empresaId)) return { error: "Empresa no encontrada." };

  const empresa = await cargarEmpresa(empresaId);
  if (!empresa) return { error: "Empresa no encontrada." };
  if (empresa.verificacion === "verificada") return { error: "La empresa ya está verificada." };

  const res = await aplicarVerificacion(
    auth.staff,
    empresa,
    { verificacion: "verificada", verificada_en: ahoraIso(), verificada_por: auth.staff.userId, verificacion_nota: null },
    "empresa.verificada",
  );
  if ("ok" in res) {
    await registrarEvento({
      tipo: "empresa_verificada",
      actor_id: auth.staff.userId,
      actor_tipo: "admin",
      entidad: "empresas",
      entidad_id: empresaId,
      meta: { nombre_negocio: empresa.nombre_negocio, desde: empresa.verificacion },
    });
  }
  return res;
}

export async function rechazarVerificacion(empresaId: string, nota: string): Promise<AdminActionResult> {
  const auth = await autorizar("verificar");
  if ("error" in auth) return auth;
  if (!idValido(empresaId)) return { error: "Empresa no encontrada." };
  const texto = limpiar(nota);
  if (!texto || texto.length < NOTA_MIN) return { error: "Escribe una nota para la empresa explicando el rechazo." };

  const empresa = await cargarEmpresa(empresaId);
  if (!empresa) return { error: "Empresa no encontrada." };
  if (empresa.verificacion !== "en_revision") return { error: "Solo se rechazan verificaciones en revisión." };

  return aplicarVerificacion(
    auth.staff,
    empresa,
    { verificacion: "rechazada", verificada_por: auth.staff.userId, verificacion_nota: texto },
    "empresa.verificacion_rechazada",
  );
}

/** Revoca una verificación: queda `rechazada` con la nota visible para la empresa (puede volver a solicitarla). */
export async function revocarVerificacion(empresaId: string, nota: string): Promise<AdminActionResult> {
  const auth = await autorizar("verificar");
  if ("error" in auth) return auth;
  if (!idValido(empresaId)) return { error: "Empresa no encontrada." };
  const texto = limpiar(nota);
  if (!texto || texto.length < NOTA_MIN) return { error: "Escribe el motivo de la revocación." };

  const empresa = await cargarEmpresa(empresaId);
  if (!empresa) return { error: "Empresa no encontrada." };
  if (empresa.verificacion !== "verificada") return { error: "La empresa no está verificada." };

  return aplicarVerificacion(
    auth.staff,
    empresa,
    { verificacion: "rechazada", verificada_en: null, verificada_por: auth.staff.userId, verificacion_nota: texto },
    "empresa.verificacion_revocada",
  );
}

/* ============================================================
   Moderación de vacantes y reportes
   ============================================================ */

type EstadoReporteFinal = "resuelto" | "descartado";

/** Cierra los reportes abiertos de una vacante. Devuelve cuántos (y sus motivos). */
async function cerrarReportesAbiertos(
  staff: StaffSesion,
  vacanteId: string,
  estado: EstadoReporteFinal,
  resolucion: string,
): Promise<{ ids: string[]; motivos: string[] } | { error: string }> {
  const { data, error } = await createAdminClient()
    .from("reportes_vacante")
    .update({ estado, resuelto_por: staff.userId, resuelto_en: ahoraIso(), resolucion })
    .eq("vacante_id", vacanteId)
    .eq("estado", "abierto")
    .select("id, motivo");
  if (error) {
    log.error("admin_reportes_fallo", { vacanteId, err: error });
    return { error: "No se pudieron actualizar los reportes." };
  }
  return { ids: (data ?? []).map((r) => r.id), motivos: (data ?? []).map((r) => r.motivo) };
}

/** Cambia estado_moderacion con auditoría y evento (KPI). No toca el ciclo de vida de la empresa (`estado`). */
async function cambiarModeracion(
  staff: StaffSesion,
  vacante: Vacante,
  estado: "aprobada" | "rechazada",
  motivo: string | null,
  origen: "moderacion" | "reportes",
): Promise<AdminActionResult> {
  const admin = createAdminClient();
  const patch = { estado_moderacion: estado, motivo_moderacion: estado === "rechazada" ? motivo : null };
  const { error } = await admin
    .from("vacantes")
    .update({ ...patch, actualizada_en: ahoraIso() })
    .eq("id", vacante.id)
    .eq("estado_moderacion", vacante.estado_moderacion);
  if (error) {
    log.error("admin_moderacion_fallo", { vacanteId: vacante.id, err: error });
    return { error: "No se pudo moderar la vacante." };
  }

  const diff = diffCampos(
    { estado_moderacion: vacante.estado_moderacion, motivo_moderacion: vacante.motivo_moderacion },
    patch,
  );
  await Promise.all([
    registrarAuditoria({
      actor: actorDeStaff(staff),
      accion: "vacante.moderada",
      entidad: "vacantes",
      entidadId: vacante.id,
      antes: diff.antes,
      despues: diff.despues,
      metadata: { titulo: vacante.titulo, origen },
    }),
    registrarEvento({
      tipo: "vacante_moderada",
      actor_id: staff.userId,
      actor_tipo: "admin",
      entidad: "vacantes",
      entidad_id: vacante.id,
      meta: { estado, anterior: vacante.estado_moderacion, origen },
    }),
  ]);

  // Primera aprobación de una vacante publicada → avisar a candidatos compatibles.
  // Una vacante "reportada" ya se había notificado cuando se aprobó la primera vez.
  if (estado === "aprobada" && vacante.estado === "publicada" && vacante.estado_moderacion !== "reportada") {
    try {
      await dispararMatchingVacante({ ...vacante, estado_moderacion: "aprobada", motivo_moderacion: null, es_publica: true });
    } catch (err) {
      log.error("admin_matching_fallo", { vacanteId: vacante.id, err });
    }
  }
  return { ok: true };
}

async function cargarVacante(vacanteId: string): Promise<Vacante | null> {
  const { data } = await createAdminClient().from("vacantes").select("*").eq("id", vacanteId).maybeSingle();
  return (data as Vacante) ?? null;
}

function revalidarVacante(vacanteId: string) {
  revalidatePath("/admin/vacantes");
  revalidatePath("/admin/reportes");
  revalidatePath("/admin");
  revalidatePath(`/v/${vacanteId}`);
  revalidatePath("/ofertas");
}

async function auditarReportes(
  staff: StaffSesion,
  vacante: Vacante,
  resultado: EstadoReporteFinal,
  cerrados: { ids: string[]; motivos: string[] },
  nota: string | null,
) {
  if (!cerrados.ids.length) return;
  await registrarAuditoria({
    actor: actorDeStaff(staff),
    accion: "reporte.resuelto",
    entidad: "vacantes",
    entidadId: vacante.id,
    metadata: { resultado, reportes: cerrados.ids, motivos: cerrados.motivos, nota, titulo: vacante.titulo },
  });
}

/**
 * Aprobar o rechazar una vacante desde la cola de moderación. Rechazar exige
 * motivo (lo ve la empresa). Los reportes abiertos se cierran en consecuencia.
 */
export async function moderarVacante(
  vacanteId: string,
  decision: "aprobada" | "rechazada",
  motivo?: string,
): Promise<AdminActionResult> {
  const auth = await autorizar("moderar");
  if ("error" in auth) return auth;
  if (decision !== "aprobada" && decision !== "rechazada") return { error: "Decisión de moderación inválida." };
  if (!idValido(vacanteId)) return { error: "Vacante no encontrada." };

  const texto = limpiar(motivo);
  if (decision === "rechazada" && (!texto || texto.length < NOTA_MIN))
    return { error: "Indica el motivo del rechazo: la empresa lo verá." };

  const vacante = await cargarVacante(vacanteId);
  if (!vacante) return { error: "Vacante no encontrada." };
  if (vacante.estado_moderacion === decision && decision === "aprobada") return { error: "La vacante ya está aprobada." };

  const res = await cambiarModeracion(auth.staff, vacante, decision, texto, "moderacion");
  if ("error" in res) return res;

  // Los reportes abiertos quedan resueltos con la decisión (evita re-ocultar al instante).
  const resultado: EstadoReporteFinal = decision === "aprobada" ? "descartado" : "resuelto";
  const cerrados = await cerrarReportesAbiertos(
    auth.staff,
    vacanteId,
    resultado,
    decision === "aprobada" ? "Vacante aprobada en moderación" : `Vacante rechazada: ${texto}`,
  );
  if (!("error" in cerrados)) await auditarReportes(auth.staff, vacante, resultado, cerrados, texto);
  revalidarVacante(vacanteId);
  return { ok: true };
}

/** Descarta los reportes abiertos. Si la vacante estaba oculta por reportes, vuelve a `aprobada`. */
export async function descartarReportes(vacanteId: string, nota?: string): Promise<AdminActionResult> {
  const auth = await autorizar("moderar");
  if ("error" in auth) return auth;
  if (!idValido(vacanteId)) return { error: "Vacante no encontrada." };

  const vacante = await cargarVacante(vacanteId);
  if (!vacante) return { error: "Vacante no encontrada." };

  const texto = limpiar(nota);
  const cerrados = await cerrarReportesAbiertos(auth.staff, vacanteId, "descartado", texto ?? "Reportes descartados tras revisión");
  if ("error" in cerrados) return cerrados;
  if (!cerrados.ids.length) return { error: "La vacante no tiene reportes abiertos." };
  await auditarReportes(auth.staff, vacante, "descartado", cerrados, texto);

  if (vacante.estado_moderacion === "reportada") {
    const { count } = await createAdminClient()
      .from("reportes_vacante")
      .select("id", { count: "exact", head: true })
      .eq("vacante_id", vacanteId)
      .eq("estado", "abierto");
    if (!count) {
      const res = await cambiarModeracion(auth.staff, vacante, "aprobada", null, "reportes");
      if ("error" in res) return res;
    }
  }
  revalidarVacante(vacanteId);
  return { ok: true };
}

/** Confirma los reportes (quedan `resuelto`) y rechaza la vacante con motivo visible para la empresa. */
export async function confirmarReportes(vacanteId: string, motivo: string): Promise<AdminActionResult> {
  const auth = await autorizar("moderar");
  if ("error" in auth) return auth;
  if (!idValido(vacanteId)) return { error: "Vacante no encontrada." };
  const texto = limpiar(motivo);
  if (!texto || texto.length < NOTA_MIN) return { error: "Indica el motivo del rechazo: la empresa lo verá." };

  const vacante = await cargarVacante(vacanteId);
  if (!vacante) return { error: "Vacante no encontrada." };

  const cerrados = await cerrarReportesAbiertos(auth.staff, vacanteId, "resuelto", `Reporte confirmado: ${texto}`);
  if ("error" in cerrados) return cerrados;
  await auditarReportes(auth.staff, vacante, "resuelto", cerrados, texto);

  if (vacante.estado_moderacion !== "rechazada") {
    const res = await cambiarModeracion(auth.staff, vacante, "rechazada", texto, "reportes");
    if ("error" in res) return res;
  }
  revalidarVacante(vacanteId);
  return { ok: true };
}

/* ============================================================
   Staff y usuarios
   ============================================================ */

export async function cambiarRolStaff(userId: string, rol: StaffRol): Promise<AdminActionResult> {
  const auth = await autorizar("gestionar_staff");
  if ("error" in auth) return auth;
  if (!ROLES.includes(rol)) return { error: "Rol inválido." };
  if (!idValido(userId)) return { error: "Ese usuario no está en el equipo." };
  if (userId === auth.staff.userId) return { error: "No puedes cambiar tu propio rol." };

  const admin = createAdminClient();
  const { data: fila } = await admin.from("staff").select("user_id, rol, nombre").eq("user_id", userId).maybeSingle();
  if (!fila) return { error: "Ese usuario no está en el equipo." };
  if (fila.rol === rol) return { ok: true };

  const { error } = await admin.from("staff").update({ rol }).eq("user_id", userId);
  if (error) return { error: "No se pudo actualizar el rol." };

  await registrarAuditoria({
    actor: actorDeStaff(auth.staff),
    accion: "staff.rol_cambiado",
    entidad: "staff",
    entidadId: userId,
    antes: { rol: fila.rol },
    despues: { rol },
    metadata: { nombre: fila.nombre },
  });
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function alternarCandidatoActivo(candidatoId: string, activo: boolean): Promise<AdminActionResult> {
  const auth = await autorizar("gestionar_usuarios");
  if ("error" in auth) return auth;
  if (!idValido(candidatoId) || typeof activo !== "boolean") return { error: "Candidato no encontrado." };

  const admin = createAdminClient();
  const { data: candidato } = await admin.from("candidatos").select("id, activo").eq("id", candidatoId).maybeSingle();
  if (!candidato) return { error: "Candidato no encontrado." };
  if (candidato.activo === activo) return { ok: true };

  const { error } = await admin
    .from("candidatos")
    .update({ activo, actualizado_en: ahoraIso() })
    .eq("id", candidatoId);
  if (error) return { error: "No se pudo actualizar el candidato." };

  await registrarAuditoria({
    actor: actorDeStaff(auth.staff),
    accion: activo ? "candidato.activado" : "candidato.desactivado",
    entidad: "candidatos",
    entidadId: candidatoId,
    antes: { activo: candidato.activo },
    despues: { activo },
  });
  revalidatePath("/admin/candidatos");
  revalidatePath("/admin");
  return { ok: true };
}

/* ============================================================
   Solicitudes de titulares (Ley 1581/2012)
   ============================================================ */

const TRANSICIONES_SOLICITUD: Record<string, string[]> = {
  recibida: ["en_tramite", "respondida", "cerrada"],
  en_tramite: ["respondida", "cerrada"],
  respondida: ["cerrada"],
  cerrada: [],
};

type SolicitudMin = {
  id: string;
  radicado: string;
  tipo: string;
  estado: string;
  vence_en: string;
  prorrogada: boolean;
  respuesta: string | null;
  respondida_en: string | null;
};

async function cargarSolicitud(id: string): Promise<SolicitudMin | null> {
  const { data } = await createAdminClient()
    .from("solicitudes_titular")
    .select("id, radicado, tipo, estado, vence_en, prorrogada, respuesta, respondida_en")
    .eq("id", id)
    .maybeSingle();
  return (data as SolicitudMin) ?? null;
}

/**
 * Cambia el estado de una solicitud. `respondida` exige respuesta; cerrar una
 * solicitud que nunca se respondió también exige dejar la respuesta dada.
 */
export async function actualizarSolicitud(
  solicitudId: string,
  estado: "en_tramite" | "respondida" | "cerrada",
  respuesta?: string,
): Promise<AdminActionResult> {
  const auth = await autorizar("atender_solicitudes");
  if ("error" in auth) return auth;
  if (!idValido(solicitudId)) return { error: "Solicitud no encontrada." };

  const s = await cargarSolicitud(solicitudId);
  if (!s) return { error: "Solicitud no encontrada." };
  if (!TRANSICIONES_SOLICITUD[s.estado]?.includes(estado))
    return { error: "Ese cambio de estado no está permitido." };

  const texto = limpiar(respuesta);
  const necesitaRespuesta = estado === "respondida" || (estado === "cerrada" && !s.respuesta);
  if (necesitaRespuesta && (!texto || texto.length < 10))
    return { error: "Escribe la respuesta dada al titular (mínimo 10 caracteres)." };

  const patch: Record<string, unknown> = { estado, atendida_por: auth.staff.userId };
  if (texto && necesitaRespuesta) {
    patch.respuesta = texto;
    patch.respondida_en = ahoraIso();
  }

  const { error } = await createAdminClient()
    .from("solicitudes_titular")
    .update({ ...patch, actualizado_en: ahoraIso() })
    .eq("id", solicitudId)
    .eq("estado", s.estado);
  if (error) {
    log.error("admin_solicitud_fallo", { solicitudId, err: error });
    return { error: "No se pudo actualizar la solicitud." };
  }

  // La respuesta puede contener datos personales: el log guarda solo que se registró.
  await registrarAuditoria({
    actor: actorDeStaff(auth.staff),
    accion: "solicitud_titular.actualizada",
    entidad: "solicitudes_titular",
    entidadId: solicitudId,
    antes: { estado: s.estado, respondida_en: s.respondida_en },
    despues: { estado, respondida_en: (patch.respondida_en as string | undefined) ?? s.respondida_en },
    metadata: { radicado: s.radicado, respuesta_registrada: Boolean(patch.respuesta) },
  });
  revalidatePath("/admin/solicitudes");
  revalidatePath(`/admin/solicitudes/${solicitudId}`);
  revalidatePath("/admin");
  return { ok: true };
}

/** Prórroga legal (una sola vez): suma los días hábiles de prórroga al vencimiento actual. */
export async function prorrogarSolicitud(solicitudId: string, motivo: string): Promise<AdminActionResult> {
  const auth = await autorizar("atender_solicitudes");
  if ("error" in auth) return auth;
  if (!idValido(solicitudId)) return { error: "Solicitud no encontrada." };
  const texto = limpiar(motivo);
  if (!texto || texto.length < 10) return { error: "Indica el motivo de la prórroga (se debe informar al titular)." };

  const s = await cargarSolicitud(solicitudId);
  if (!s) return { error: "Solicitud no encontrada." };
  if (s.prorrogada) return { error: "Esta solicitud ya fue prorrogada; la prórroga solo se permite una vez." };
  if (s.estado === "respondida" || s.estado === "cerrada") return { error: "La solicitud ya fue atendida." };

  const clase = claseSolicitud(s.tipo);
  const dias = PLAZOS_HABEAS_DATA[clase].prorroga;
  const nuevoVence = sumarDiasHabiles(new Date(s.vence_en), dias).toISOString();

  const { data, error } = await createAdminClient()
    .from("solicitudes_titular")
    .update({ vence_en: nuevoVence, prorrogada: true, atendida_por: auth.staff.userId, actualizado_en: ahoraIso() })
    .eq("id", solicitudId)
    .eq("prorrogada", false)
    .select("id");
  if (error || !data?.length) {
    if (error) log.error("admin_prorroga_fallo", { solicitudId, err: error });
    return { error: "No se pudo prorrogar la solicitud." };
  }

  await registrarAuditoria({
    actor: actorDeStaff(auth.staff),
    accion: "solicitud_titular.actualizada",
    entidad: "solicitudes_titular",
    entidadId: solicitudId,
    antes: { vence_en: s.vence_en, prorrogada: false },
    despues: { vence_en: nuevoVence, prorrogada: true },
    metadata: { radicado: s.radicado, prorroga: { clase, dias_habiles: dias, motivo: texto } },
  });
  revalidatePath("/admin/solicitudes");
  revalidatePath(`/admin/solicitudes/${solicitudId}`);
  revalidatePath("/admin");
  return { ok: true };
}

/* ============================================================
   Pagos (lógica en lib/billing/servicio.ts, que audita)
   ============================================================ */

export async function reembolsarPagoAdmin(pagoId: string): Promise<AdminActionResult> {
  const auth = await autorizar("ver_pagos", "reembolsar");
  if ("error" in auth) return auth;
  if (!idValido(pagoId)) return { error: "Pago no encontrado." };
  try {
    const res = await reembolsarPago(pagoId, actorDeStaff(auth.staff));
    revalidatePath("/admin/pagos");
    return res;
  } catch (err) {
    log.error("admin_reembolso_fallo", { pagoId, err });
    return { error: "No se pudo reembolsar el pago." };
  }
}

export async function cancelarSuscripcionDesdeAdmin(suscripcionId: string, inmediata: boolean): Promise<AdminActionResult> {
  const auth = await autorizar("ver_pagos", "gestionar_usuarios");
  if ("error" in auth) return auth;
  if (!idValido(suscripcionId) || typeof inmediata !== "boolean") return { error: "Suscripción no encontrada." };
  try {
    const res = await cancelarSuscripcionAdmin(suscripcionId, actorDeStaff(auth.staff), inmediata);
    revalidatePath("/admin/pagos");
    return res;
  } catch (err) {
    log.error("admin_cancelar_suscripcion_fallo", { suscripcionId, err });
    return { error: "No se pudo cancelar la suscripción." };
  }
}
