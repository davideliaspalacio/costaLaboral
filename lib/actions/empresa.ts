"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";
import { dispararMatchingVacante } from "@/lib/notificaciones";
import { registrarEvento } from "@/lib/eventos";
import { registrarAuditoria, diffCampos, type ActorAuditoria } from "@/lib/audit";
import { registrarConsentimientos } from "@/lib/legal/consentimientos";
import { limitar, mensajeLimite } from "@/lib/rate-limit";
import { log } from "@/lib/log";
import { traducirAuthError } from "@/lib/errores";
import { transicionPermitida } from "@/lib/postulaciones-reglas";
import { getBeneficiosEmpresa } from "@/lib/billing/suscripciones";
import {
  estadoModeracionInicial,
  moderacionTrasCambio,
  motivoModeracionTexto,
  revisarContenidoVacante,
  validarNit,
} from "@/lib/moderacion";
import {
  CAMPOS_VACANTE,
  MAX_INVITACIONES_DIA,
  camposVacante,
  getInvitacionesVacante,
  normalizarSitioWeb,
  validarVacanteInput,
  type VacanteInput,
} from "@/lib/data/empresa";
import { esRecomendable, evaluarMatch, perfilDe } from "@/lib/matching";
import {
  CIUDADES,
  ESTADOS_POSTULACION,
  SECTORES,
  VACANTE_EXPIRA_DIAS,
  type EstadoPostulacion,
} from "@/lib/constants";
import type { Candidato, Empresa, Vacante } from "@/lib/types";

/* ============================================================
   Acciones del área de empresa (secciones 4, 5, 8 y 13).
   Todas: sesión de empresa + verificación de dueño en código,
   escritura con service-role, auditoría y revalidación.
   Nunca se escriben columnas derivadas (es_publica, verificada).
   ============================================================ */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const DIA_MS = 86_400_000;

export type ResultadoAccion = { ok: true } | { error: string };

/* ---------------- Helpers internos ---------------- */

const actorEmpresa = (id: string): ActorAuditoria => ({ id, tipo: "empresa" });

async function getEmpresaSesion(): Promise<Empresa | null> {
  const sesion = await getUsuario();
  if (!sesion || sesion.tipo !== "empresa") return null;
  const admin = createAdminClient();
  const { data } = await admin.from("empresas").select("*").eq("id", sesion.user.id).maybeSingle();
  return (data as Empresa) ?? null;
}

async function getVacanteDe(empresaId: string, vacanteId: string): Promise<Vacante | null> {
  if (!/^[0-9a-f-]{36}$/i.test(String(vacanteId))) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("vacantes").select("*").eq("id", vacanteId).eq("empresa_id", empresaId).maybeSingle();
  return (data as Vacante) ?? null;
}

function leerFormulario(formData: FormData): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") raw[k] = v;
  return raw;
}

function revalidarVacante(id: string) {
  revalidatePath("/empresa/panel");
  revalidatePath("/empresa/analitica");
  revalidatePath(`/empresa/vacante/${id}`);
  revalidatePath(`/v/${id}`);
  revalidatePath("/ofertas");
  revalidatePath("/");
}

const expiraDesdeAhora = () => new Date(Date.now() + VACANTE_EXPIRA_DIAS * DIA_MS).toISOString();

/** Convierte una fila a strings para re-validarla con las reglas estrictas antes de publicar. */
function filaComoFormulario(v: Vacante): Record<string, string> {
  return Object.fromEntries(
    CAMPOS_VACANTE.map((k) => {
      const valor = v[k];
      if (k === "tiene_contrato") return [k, valor ? "true" : ""];
      return [k, valor == null ? "" : String(valor)];
    }),
  );
}

async function dispararMatchingSeguro(vacante: Vacante) {
  try {
    await dispararMatchingVacante(vacante);
  } catch (err) {
    log.error("matching_vacante_fallo", { vacanteId: vacante.id, err });
  }
}

type ResultadoPublicacion = { ok: true; moderacion: "aprobada" | "pendiente"; motivos: string[] } | { error: string };

/** Publica una vacante (borrador → publicada) aplicando la moderación inicial. */
async function publicarInterno(empresa: Empresa, vacante: Vacante): Promise<ResultadoPublicacion> {
  if (vacante.estado !== "borrador") return { error: "Solo se pueden publicar borradores." };
  const validacion = validarVacanteInput(filaComoFormulario(vacante), true);
  if (!validacion.ok) return { error: `Completa la vacante antes de publicarla: ${validacion.error}` };

  const revision = revisarContenidoVacante(vacante);
  const moderacion = estadoModeracionInicial({ empresaVerificada: empresa.verificada, sospechosa: revision.sospechosa });
  const ahora = new Date().toISOString();
  const cambios = {
    estado: "publicada" as const,
    publicada_en: ahora,
    expira_en: expiraDesdeAhora(),
    estado_moderacion: moderacion,
    motivo_moderacion: moderacion === "pendiente" ? motivoModeracionTexto(revision, empresa.verificada) : null,
    actualizada_en: ahora,
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vacantes")
    .update(cambios)
    .eq("id", vacante.id)
    .eq("empresa_id", empresa.id)
    .eq("estado", "borrador")
    .select("*")
    .maybeSingle();
  if (error || !data) {
    log.error("publicar_vacante_fallo", { vacanteId: vacante.id, err: error });
    return { error: "No se pudo publicar la vacante. Intenta de nuevo." };
  }

  await registrarAuditoria({
    actor: actorEmpresa(empresa.id),
    accion: "vacante.publicada",
    entidad: "vacantes",
    entidadId: vacante.id,
    antes: { estado: vacante.estado, estado_moderacion: vacante.estado_moderacion },
    despues: { estado: cambios.estado, estado_moderacion: moderacion, expira_en: cambios.expira_en },
    metadata: { motivos: revision.motivos, empresa_verificada: empresa.verificada },
  });
  await registrarEvento({
    tipo: "vacante_publicada",
    actor_id: empresa.id,
    actor_tipo: "empresa",
    entidad: "vacantes",
    entidad_id: vacante.id,
    meta: { area: vacante.area, ciudad: vacante.ciudad, tipo: vacante.tipo, moderacion },
  });
  if (moderacion === "aprobada") await dispararMatchingSeguro(data as Vacante);

  return { ok: true, moderacion, motivos: revision.motivos };
}

async function crearVacante(empresaId: string, datos: VacanteInput): Promise<Vacante | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vacantes")
    .insert({ ...datos, empresa_id: empresaId, estado: "borrador" })
    .select("*")
    .single();
  if (error || !data) {
    log.error("crear_vacante_fallo", { empresaId, err: error });
    return null;
  }
  await registrarAuditoria({
    actor: actorEmpresa(empresaId),
    accion: "vacante.creada",
    entidad: "vacantes",
    entidadId: data.id,
    despues: camposVacante(datos),
  });
  return data as Vacante;
}

function destinoTrasPublicar(id: string, r: ResultadoPublicacion): string {
  if ("error" in r) return `/empresa/panel?borrador=${id}&error=publicar`;
  return r.moderacion === "aprobada" ? `/empresa/panel?publicada=${id}` : `/empresa/panel?revision=${id}`;
}

/* ============================================================
   Wizard /registro-empresa
   ============================================================ */

export type WizardState = { error?: string; paso?: number } | null;

function whatsappValido(v: string): boolean {
  const d = v.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 13;
}

/**
 * Registro de empresa + vacante en un solo flujo (publicación en < 5 min).
 * `intent` = "publicar" | "borrador". Si hay sesión de empresa, no pide datos de cuenta.
 */
export async function enviarWizard(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const raw = leerFormulario(formData);
  const g = (k: string) => String(raw[k] ?? "").trim();
  const intent = g("intent") === "borrador" ? "borrador" : "publicar";

  const sesion = await getUsuario();
  if (sesion && sesion.tipo !== "empresa")
    return { error: "Tienes sesión como candidato. Cierra sesión para publicar como empresa.", paso: 0 };

  const vacante = validarVacanteInput(raw, intent === "publicar");
  let empresa: Empresa | null = null;

  if (sesion) {
    empresa = await getEmpresaSesion();
    if (!empresa) return { error: "No encontramos el perfil de tu empresa. Escríbenos para ayudarte.", paso: 0 };
    if (!vacante.ok) return { error: vacante.error, paso: 1 };
  } else {
    const nombre_negocio = g("nombre_negocio").slice(0, 120);
    const nombre_contacto = g("nombre_contacto").slice(0, 120);
    const email = g("email").toLowerCase();
    const password = String(raw.password ?? "");
    const whatsapp = g("whatsapp");
    // `ciudad` es la de la vacante; la del negocio llega como `empresa_ciudad`.
    const ciudad = g("empresa_ciudad");
    const sector = g("sector");

    if (!nombre_negocio || !nombre_contacto) return { error: "Escribe el nombre del negocio y de contacto.", paso: 0 };
    if (!(CIUDADES as readonly string[]).includes(ciudad)) return { error: "Elige la ciudad de tu negocio.", paso: 0 };
    if (!SECTORES.some((s) => s.value === sector)) return { error: "Elige el sector.", paso: 0 };
    if (!whatsappValido(whatsapp)) return { error: "Escribe un WhatsApp válido, ej: +57 300 123 4567.", paso: 0 };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un correo válido.", paso: 0 };
    if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres.", paso: 0 };
    if (raw.acepta_terminos !== "on" || raw.acepta_datos !== "on")
      return { error: "Debes aceptar los Términos y la Política de tratamiento de datos.", paso: 0 };
    if (!vacante.ok) return { error: vacante.error, paso: 1 };

    const limite = await limitar("registro");
    if (!limite.permitido) return { error: mensajeLimite(limite), paso: 0 };

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { tipo: "empresa", nombre: nombre_contacto } },
    });
    if (error || !data.user) return { error: traducirAuthError(error?.message ?? ""), paso: 0 };
    const userId = data.user.id;
    const admin = createAdminClient();

    const revertir = async (motivo: string, err: unknown) => {
      log.error("registro_empresa_revertido", { motivo, userId, err });
      await admin.from("empresas").delete().eq("id", userId);
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) log.error("registro_empresa_revertir_usuario_fallo", { userId, err: delErr });
      await supabase.auth.signOut().catch(() => undefined);
    };

    const { data: fila, error: e2 } = await admin
      .from("empresas")
      .insert({ id: userId, nombre_negocio, nombre_contacto, email, whatsapp, ciudad, sector })
      .select("*")
      .single();
    if (e2 || !fila) {
      await revertir("insert_empresa", e2);
      return { error: "No se pudo crear la cuenta de empresa. Intenta de nuevo.", paso: 0 };
    }

    const consentido = await registrarConsentimientos(
      { id: userId, tipo: "empresa" },
      [
        { finalidad: "tratamiento_datos", otorgado: true },
        { finalidad: "terminos", otorgado: true },
      ],
      "registro_empresa",
    );
    if (!consentido) {
      await revertir("consentimientos", null);
      return { error: "No pudimos guardar tu autorización de datos. Intenta de nuevo en un momento.", paso: 0 };
    }

    empresa = fila as Empresa;
    await registrarAuditoria({
      actor: actorEmpresa(userId),
      accion: "empresa.registro",
      entidad: "empresas",
      entidadId: userId,
      despues: { nombre_negocio, ciudad, sector },
    });
    await registrarEvento({
      tipo: "registro_empresa",
      actor_id: userId,
      actor_tipo: "empresa",
      entidad: "empresas",
      entidad_id: userId,
      meta: { ciudad, sector },
    });
  }

  const creada = await crearVacante(empresa.id, vacante.datos);
  if (!creada) return { error: "Tu cuenta quedó lista, pero no se pudo guardar la vacante. Publícala desde tu panel.", paso: 2 };

  revalidatePath("/empresa/panel");
  if (intent === "borrador") redirect(`/empresa/panel?borrador=${creada.id}`);

  const r = await publicarInterno(empresa, creada);
  revalidarVacante(creada.id);
  redirect(destinoTrasPublicar(creada.id, r));
}

/* ============================================================
   Ciclo de vida de la vacante
   ============================================================ */

export type FormVacanteState = { error?: string } | null;

/** Crea (sin `id`) o actualiza (con `id`) un borrador propio. */
export async function guardarBorrador(_prev: FormVacanteState, formData: FormData): Promise<FormVacanteState> {
  const empresa = await getEmpresaSesion();
  if (!empresa) redirect("/login?next=/empresa/panel");
  const raw = leerFormulario(formData);
  const v = validarVacanteInput(raw, false);
  if (!v.ok) return { error: v.error };

  const id = String(raw.id ?? "").trim();
  if (!id) {
    const creada = await crearVacante(empresa.id, v.datos);
    if (!creada) return { error: "No se pudo guardar el borrador." };
    revalidatePath("/empresa/panel");
    redirect(`/empresa/panel?borrador=${creada.id}`);
  }

  const actual = await getVacanteDe(empresa.id, id);
  if (!actual) return { error: "No encontramos esa vacante." };
  if (actual.estado !== "borrador") return { error: "Esta vacante ya no es un borrador." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("vacantes")
    .update({ ...v.datos, actualizada_en: new Date().toISOString() })
    .eq("id", id)
    .eq("empresa_id", empresa.id);
  if (error) return { error: "No se pudo guardar el borrador." };

  const diff = diffCampos(camposVacante(actual), camposVacante(v.datos));
  await registrarAuditoria({
    actor: actorEmpresa(empresa.id),
    accion: "vacante.editada",
    entidad: "vacantes",
    entidadId: id,
    antes: diff.antes,
    despues: diff.despues,
    metadata: { borrador: true },
  });
  revalidatePath("/empresa/panel");
  redirect(`/empresa/panel?borrador=${id}`);
}

/** Publica un borrador propio. */
export async function publicarVacante(
  vacanteId: string,
): Promise<{ ok: true; moderacion: "aprobada" | "pendiente"; motivos: string[] } | { error: string }> {
  const empresa = await getEmpresaSesion();
  if (!empresa) return { error: "Inicia sesión como empresa." };
  const vacante = await getVacanteDe(empresa.id, vacanteId);
  if (!vacante) return { error: "No autorizado." };
  const r = await publicarInterno(empresa, vacante);
  revalidarVacante(vacanteId);
  return r;
}

/**
 * Edita una vacante propia.
 *  - Borrador: guarda; con intent=publicar además la publica.
 *  - Resto: si cambia el contenido, re-moderación (`moderacionTrasCambio`):
 *    aprobada + (empresa sin verificar o contenido sospechoso) → pendiente;
 *    rechazada → pendiente; reportada se mantiene.
 */
export async function editarVacante(_prev: FormVacanteState, formData: FormData): Promise<FormVacanteState> {
  const empresa = await getEmpresaSesion();
  if (!empresa) redirect("/login?next=/empresa/panel");
  const raw = leerFormulario(formData);
  const id = String(raw.id ?? "").trim();
  const actual = await getVacanteDe(empresa.id, id);
  if (!actual) return { error: "No autorizado." };

  const intent = raw.intent === "publicar" ? "publicar" : "guardar";
  const esBorrador = actual.estado === "borrador";
  const v = validarVacanteInput(raw, !esBorrador || intent === "publicar");
  if (!v.ok) return { error: v.error };

  const diff = diffCampos(camposVacante(actual), camposVacante(v.datos));
  const huboCambios = Object.keys(diff.despues).length > 0;
  const admin = createAdminClient();
  const ahora = new Date().toISOString();

  if (esBorrador) {
    if (huboCambios) {
      const { error } = await admin
        .from("vacantes")
        .update({ ...v.datos, actualizada_en: ahora })
        .eq("id", id)
        .eq("empresa_id", empresa.id);
      if (error) return { error: "No se pudieron guardar los cambios." };
      await registrarAuditoria({
        actor: actorEmpresa(empresa.id),
        accion: "vacante.editada",
        entidad: "vacantes",
        entidadId: id,
        antes: diff.antes,
        despues: diff.despues,
        metadata: { borrador: true },
      });
    }
    if (intent === "publicar") {
      const r = await publicarInterno(empresa, { ...actual, ...v.datos });
      if ("error" in r) return { error: r.error };
      revalidarVacante(id);
      redirect(destinoTrasPublicar(id, r));
    }
    revalidatePath("/empresa/panel");
    redirect(`/empresa/panel?borrador=${id}`);
  }

  if (!huboCambios) redirect(`/empresa/panel?editada=${id}`);

  const revision = revisarContenidoVacante(v.datos);
  const moderacion = moderacionTrasCambio({
    actual: actual.estado_moderacion,
    empresaVerificada: empresa.verificada,
    sospechosa: revision.sospechosa,
  });
  const motivo =
    moderacion === "pendiente"
      ? motivoModeracionTexto(revision, empresa.verificada)
      : moderacion === "reportada"
        ? actual.motivo_moderacion
        : null;

  const { error } = await admin
    .from("vacantes")
    .update({ ...v.datos, estado_moderacion: moderacion, motivo_moderacion: motivo, actualizada_en: ahora })
    .eq("id", id)
    .eq("empresa_id", empresa.id);
  if (error) {
    log.error("editar_vacante_fallo", { vacanteId: id, err: error });
    return { error: "No se pudieron guardar los cambios." };
  }

  await registrarAuditoria({
    actor: actorEmpresa(empresa.id),
    accion: "vacante.editada",
    entidad: "vacantes",
    entidadId: id,
    antes: { ...diff.antes, estado_moderacion: actual.estado_moderacion },
    despues: { ...diff.despues, estado_moderacion: moderacion },
    metadata: { motivos: revision.motivos, empresa_verificada: empresa.verificada },
  });

  revalidarVacante(id);
  const aRevision = moderacion === "pendiente" && actual.estado_moderacion !== "pendiente";
  redirect(`/empresa/panel?editada=${id}${aRevision ? "&revision=" + id : ""}`);
}

type Transicion = {
  desde: Vacante["estado"][];
  accion: "vacante.pausada" | "vacante.reanudada" | "vacante.cerrada";
  error: string;
};

async function cambiarEstadoVacante(
  vacanteId: string,
  t: Transicion,
  cambios: (v: Vacante) => Record<string, unknown> | { error: string },
): Promise<ResultadoAccion> {
  const empresa = await getEmpresaSesion();
  if (!empresa) return { error: "Inicia sesión como empresa." };
  const vacante = await getVacanteDe(empresa.id, vacanteId);
  if (!vacante) return { error: "No autorizado." };
  if (!t.desde.includes(vacante.estado)) return { error: t.error };

  const c = cambios(vacante);
  if ("error" in c) return c as { error: string };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vacantes")
    .update({ ...c, actualizada_en: new Date().toISOString() })
    .eq("id", vacanteId)
    .eq("empresa_id", empresa.id)
    .eq("estado", vacante.estado)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo actualizar la vacante. Recarga e intenta de nuevo." };

  const antes = Object.fromEntries(Object.keys(c).map((k) => [k, (vacante as Record<string, unknown>)[k] ?? null]));
  await registrarAuditoria({
    actor: actorEmpresa(empresa.id),
    accion: t.accion,
    entidad: "vacantes",
    entidadId: vacanteId,
    antes,
    despues: c,
  });
  revalidarVacante(vacanteId);
  return { ok: true };
}

export async function pausarVacante(vacanteId: string): Promise<ResultadoAccion> {
  return cambiarEstadoVacante(
    vacanteId,
    { desde: ["publicada"], accion: "vacante.pausada", error: "Solo puedes pausar una vacante publicada." },
    () => ({ estado: "pausada" }),
  );
}

export async function reanudarVacante(vacanteId: string): Promise<ResultadoAccion> {
  return cambiarEstadoVacante(
    vacanteId,
    { desde: ["pausada"], accion: "vacante.reanudada", error: "Solo puedes reanudar una vacante pausada." },
    (v) =>
      new Date(v.expira_en).getTime() <= Date.now()
        ? { error: "La vacante ya expiró. Ciérrala y reábrela para renovarla." }
        : { estado: "publicada" },
  );
}

export type CierreMotivo = "contratado" | "cerrada";

export async function cerrarVacante(vacanteId: string, motivo: CierreMotivo): Promise<ResultadoAccion> {
  if (motivo !== "contratado" && motivo !== "cerrada") return { error: "Motivo inválido." };
  return cambiarEstadoVacante(
    vacanteId,
    { desde: ["publicada", "pausada", "borrador"], accion: "vacante.cerrada", error: "La vacante ya está cerrada." },
    () => ({ estado: "cerrada", motivo_cierre: motivo, cerrada_en: new Date().toISOString() }),
  );
}

/** Reabre una vacante cerrada: vuelve a publicada, renueva la expiración y re-modera. */
export async function reabrirVacante(vacanteId: string): Promise<ResultadoAccion & { moderacion?: string }> {
  const empresa = await getEmpresaSesion();
  if (!empresa) return { error: "Inicia sesión como empresa." };
  const vacante = await getVacanteDe(empresa.id, vacanteId);
  if (!vacante) return { error: "No autorizado." };
  if (vacante.estado !== "cerrada") return { error: "Solo puedes reabrir una vacante cerrada." };

  const revision = revisarContenidoVacante(vacante);
  const moderacion = moderacionTrasCambio({
    actual: vacante.estado_moderacion,
    empresaVerificada: empresa.verificada,
    sospechosa: revision.sospechosa,
  });
  const ahora = new Date().toISOString();
  const cambios = {
    estado: "publicada" as const,
    motivo_cierre: null,
    cerrada_en: null,
    publicada_en: ahora,
    expira_en: expiraDesdeAhora(),
    estado_moderacion: moderacion,
    motivo_moderacion:
      moderacion === "pendiente"
        ? motivoModeracionTexto(revision, empresa.verificada)
        : moderacion === "reportada"
          ? vacante.motivo_moderacion
          : null,
  };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vacantes")
    .update({ ...cambios, actualizada_en: ahora })
    .eq("id", vacanteId)
    .eq("empresa_id", empresa.id)
    .eq("estado", "cerrada")
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "No se pudo reabrir la vacante." };

  await registrarAuditoria({
    actor: actorEmpresa(empresa.id),
    accion: "vacante.reabierta",
    entidad: "vacantes",
    entidadId: vacanteId,
    antes: {
      estado: vacante.estado,
      motivo_cierre: vacante.motivo_cierre,
      expira_en: vacante.expira_en,
      estado_moderacion: vacante.estado_moderacion,
    },
    despues: { estado: cambios.estado, expira_en: cambios.expira_en, estado_moderacion: moderacion },
    metadata: { motivos: revision.motivos },
  });
  revalidarVacante(vacanteId);
  return { ok: true, moderacion };
}

/* ============================================================
   Pipeline de postulaciones
   ============================================================ */

type PostulacionConVacante = {
  id: string;
  estado: EstadoPostulacion;
  vacante_id: string;
  candidato_id: string;
  vacante: { empresa_id: string } | null;
};

export async function cambiarEstadoPostulacion(
  postulacionId: string,
  estado: EstadoPostulacion,
  nota?: string,
): Promise<{ ok: true } | { error: string }> {
  const empresa = await getEmpresaSesion();
  if (!empresa) return { error: "Inicia sesión como empresa." };
  if (!ESTADOS_POSTULACION.some((e) => e.value === estado)) return { error: "Estado inválido." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select("id, estado, vacante_id, candidato_id, vacante:vacantes(empresa_id)")
    .eq("id", postulacionId)
    .maybeSingle();
  const p = data as unknown as PostulacionConVacante | null;
  if (!p || p.vacante?.empresa_id !== empresa.id) return { error: "No autorizado." };
  if (!transicionPermitida("empresa", p.estado, estado)) return { error: "Ese cambio de estado no está permitido." };

  const notaLimpia = nota?.trim().slice(0, 500) || null;
  const ahora = new Date().toISOString();
  const { data: actualizada, error } = await admin
    .from("postulaciones")
    .update({ estado, estado_actualizado_en: ahora })
    .eq("id", postulacionId)
    .eq("estado", p.estado)
    .select("id")
    .maybeSingle();
  if (error || !actualizada) return { error: "La postulación cambió mientras tanto. Recarga la página." };

  const { error: hErr } = await admin.from("postulacion_historial").insert({
    postulacion_id: postulacionId,
    estado_anterior: p.estado,
    estado_nuevo: estado,
    actor_id: empresa.id,
    actor_tipo: "empresa",
    nota: notaLimpia,
  });
  if (hErr) log.error("historial_postulacion_fallo", { postulacionId, err: hErr });

  await registrarAuditoria({
    actor: actorEmpresa(empresa.id),
    accion: "postulacion.estado_cambiado",
    entidad: "postulaciones",
    entidadId: postulacionId,
    antes: { estado: p.estado },
    despues: { estado },
    metadata: { vacante_id: p.vacante_id, con_nota: !!notaLimpia },
  });
  revalidatePath(`/empresa/vacante/${p.vacante_id}`);
  revalidatePath("/empresa/panel");
  revalidatePath("/mis-vacantes");
  return { ok: true };
}

/**
 * Al abrir el pipeline: enviada → vista para todas las postulaciones de la vacante.
 * Se llama durante el render del Server Component, por eso NO usa revalidatePath
 * (Next no permite revalidar durante el render); la misma petición ya lee el estado nuevo.
 */
export async function marcarPostulacionesVistas(vacanteId: string): Promise<{ ok: true; marcadas: number } | { error: string }> {
  const empresa = await getEmpresaSesion();
  if (!empresa) return { error: "Inicia sesión como empresa." };
  const vacante = await getVacanteDe(empresa.id, vacanteId);
  if (!vacante) return { error: "No autorizado." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("postulaciones")
    .update({ estado: "vista", estado_actualizado_en: new Date().toISOString() })
    .eq("vacante_id", vacanteId)
    .eq("estado", "enviada")
    .select("id");
  if (error) {
    log.error("marcar_vistas_fallo", { vacanteId, err: error });
    return { error: "No se pudieron actualizar las postulaciones." };
  }
  const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
  if (!ids.length) return { ok: true, marcadas: 0 };

  const { error: hErr } = await admin.from("postulacion_historial").insert(
    ids.map((id) => ({
      postulacion_id: id,
      estado_anterior: "enviada",
      estado_nuevo: "vista",
      actor_id: empresa.id,
      actor_tipo: "empresa",
    })),
  );
  if (hErr) log.error("historial_vistas_fallo", { vacanteId, err: hErr });

  await registrarAuditoria({
    actor: actorEmpresa(empresa.id),
    accion: "postulacion.estado_cambiado",
    entidad: "vacantes",
    entidadId: vacanteId,
    antes: { estado: "enviada" },
    despues: { estado: "vista" },
    metadata: { lote: true, postulaciones: ids, total: ids.length },
  });
  return { ok: true, marcadas: ids.length };
}

/** Evento de KPI al abrir el chat de WhatsApp con un postulado. */
export async function registrarContactoWhatsapp(postulacionId: string): Promise<ResultadoAccion> {
  const empresa = await getEmpresaSesion();
  if (!empresa) return { error: "Inicia sesión como empresa." };
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select("id, estado, vacante_id, candidato_id, vacante:vacantes(empresa_id)")
    .eq("id", postulacionId)
    .maybeSingle();
  const p = data as unknown as PostulacionConVacante | null;
  if (!p || p.vacante?.empresa_id !== empresa.id) return { error: "No autorizado." };
  await registrarEvento({
    tipo: "contacto_whatsapp",
    actor_id: empresa.id,
    actor_tipo: "empresa",
    entidad: "postulaciones",
    entidad_id: postulacionId,
    meta: { vacante_id: p.vacante_id, estado: p.estado },
  });
  return { ok: true };
}

/* ============================================================
   Acceso ampliado (Empresa Pro): invitar a postularse
   ============================================================ */

export async function invitarCandidato(vacanteId: string, candidatoId: string): Promise<ResultadoAccion> {
  const empresa = await getEmpresaSesion();
  if (!empresa) return { error: "Inicia sesión como empresa." };
  const { beneficios } = await getBeneficiosEmpresa(empresa.id);
  if (!beneficios.accesoAmpliado) return { error: "Invitar candidatos es parte de Empresa Pro." };

  const vacante = await getVacanteDe(empresa.id, vacanteId);
  if (!vacante) return { error: "No autorizado." };
  if (!vacante.es_publica) return { error: "Solo puedes invitar a una vacante publicada y aprobada." };

  const invitaciones = await getInvitacionesVacante(vacanteId);
  if (invitaciones.hoy >= MAX_INVITACIONES_DIA)
    return { error: `Llegaste al límite de ${MAX_INVITACIONES_DIA} invitaciones por vacante hoy. Vuelve mañana.` };
  if (invitaciones.invitados.has(candidatoId)) return { error: "Ya invitaste a esta persona." };

  const admin = createAdminClient();
  const [{ data: cData }, { data: postulado }] = await Promise.all([
    admin
      .from("candidatos")
      .select("id, nombre, ciudad, area_interes, nivel_educativo, disponibilidad, activo, perfil_visible_empresas, wsp_opt_in")
      .eq("id", candidatoId)
      .maybeSingle(),
    admin.from("postulaciones").select("id").eq("vacante_id", vacanteId).eq("candidato_id", candidatoId).maybeSingle(),
  ]);
  const c = cData as Pick<
    Candidato,
    "id" | "nombre" | "ciudad" | "area_interes" | "nivel_educativo" | "disponibilidad" | "activo" | "perfil_visible_empresas" | "wsp_opt_in"
  > | null;
  // Mismo mensaje para todos los casos: no revela si la persona existe ni por qué no aplica.
  const noDisponible = { error: "Esta persona ya no está disponible para invitaciones." };
  if (!c || !c.activo || !c.perfil_visible_empresas || postulado) return noDisponible;
  if (!esRecomendable(evaluarMatch(perfilDe(c), vacante))) return noDisponible;
  if (!c.wsp_opt_in) return { error: "Esta persona no aceptó recibir mensajes por WhatsApp." };

  const primerNombre = c.nombre.trim().split(/\s+/)[0] ?? "";
  const mensaje = `Hola ${primerNombre}, ${empresa.nombre_negocio} vio que tu perfil encaja con su vacante de ${vacante.titulo} en ${vacante.ciudad} y te invita a postularte en CostaLaboral: ${SITE}/v/${vacante.id}?src=whatsapp`;
  const { error } = await admin
    .from("notificaciones_wsp")
    .insert({ candidato_id: c.id, vacante_id: vacante.id, tipo: "enlace_real", mensaje });
  if (error) {
    log.error("invitacion_candidato_fallo", { vacanteId, err: error });
    return { error: "No se pudo enviar la invitación." };
  }
  await registrarEvento({
    tipo: "invitacion_candidato",
    actor_id: empresa.id,
    actor_tipo: "empresa",
    entidad: "vacantes",
    entidad_id: vacanteId,
    meta: { candidato_id: c.id },
  });
  revalidatePath(`/empresa/vacante/${vacanteId}/sugeridos`);
  return { ok: true };
}

/* ============================================================
   Perfil y verificación
   ============================================================ */

export type PerfilEmpresaState = { error?: string; ok?: boolean } | null;

export async function actualizarPerfilEmpresa(_prev: PerfilEmpresaState, formData: FormData): Promise<PerfilEmpresaState> {
  const empresa = await getEmpresaSesion();
  if (!empresa) redirect("/login?next=/empresa/perfil");
  const raw = leerFormulario(formData);
  const g = (k: string, max = 200) => String(raw[k] ?? "").trim().slice(0, max);

  const nombre_negocio = g("nombre_negocio", 120);
  const nombre_contacto = g("nombre_contacto", 120);
  const whatsapp = g("whatsapp", 30);
  const ciudad = g("ciudad");
  const sector = g("sector");
  if (!nombre_negocio || !nombre_contacto) return { error: "Escribe el nombre comercial y el de contacto." };
  if (!whatsappValido(whatsapp)) return { error: "Escribe un WhatsApp válido, ej: +57 300 123 4567." };
  if (!(CIUDADES as readonly string[]).includes(ciudad)) return { error: "Elige la ciudad." };
  if (!SECTORES.some((s) => s.value === sector)) return { error: "Elige el sector." };

  const nitTexto = g("nit", 30);
  let nit: string | null = null;
  if (nitTexto) {
    const r = validarNit(nitTexto);
    if (!r.ok) return { error: r.error };
    nit = r.nit;
  }
  const web = normalizarSitioWeb(g("sitio_web", 300));
  if (!web.ok) return { error: "El sitio web no es una URL válida (ej: https://minegocio.com)." };

  const nuevo = {
    nombre_negocio,
    nombre_contacto,
    whatsapp,
    ciudad,
    sector,
    razon_social: g("razon_social", 200) || null,
    nit,
    descripcion: g("descripcion", 2000) || null,
    sitio_web: web.url,
    direccion: g("direccion", 200) || null,
  };
  const antes = Object.fromEntries(Object.keys(nuevo).map((k) => [k, (empresa as Record<string, unknown>)[k] ?? null]));
  const diff = diffCampos(antes, nuevo);
  if (!Object.keys(diff.despues).length) return { ok: true };

  // Cambiar la identidad legal de una empresa verificada exige volver a verificarla.
  const cambiaIdentidad = "razon_social" in diff.despues || "nit" in diff.despues;
  const extra =
    cambiaIdentidad && (empresa.verificacion === "verificada" || empresa.verificacion === "en_revision")
      ? { verificacion: "sin_verificar" as const, verificacion_nota: "Cambiaste la razón social o el NIT: solicita de nuevo la verificación." }
      : {};

  const admin = createAdminClient();
  const { error } = await admin
    .from("empresas")
    .update({ ...nuevo, ...extra, actualizado_en: new Date().toISOString() })
    .eq("id", empresa.id);
  if (error) {
    log.error("perfil_empresa_fallo", { empresaId: empresa.id, err: error });
    return { error: "No se pudo guardar el perfil." };
  }

  // Sin datos de contacto en claro en el log: solo qué campos cambiaron.
  const sensibles = new Set(["whatsapp", "nombre_contacto"]);
  const ocultar = (o: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, sensibles.has(k) ? "[actualizado]" : v]));
  await registrarAuditoria({
    actor: actorEmpresa(empresa.id),
    accion: "empresa.perfil_actualizado",
    entidad: "empresas",
    entidadId: empresa.id,
    antes: ocultar(diff.antes),
    despues: ocultar(diff.despues),
    metadata: "verificacion" in extra ? { verificacion_reiniciada: true } : {},
  });
  revalidatePath("/empresa/perfil");
  revalidatePath("/empresa/panel");
  return { ok: true };
}

export async function solicitarVerificacion(_prev: PerfilEmpresaState, _formData: FormData): Promise<PerfilEmpresaState> {
  const empresa = await getEmpresaSesion();
  if (!empresa) redirect("/login?next=/empresa/perfil");
  if (empresa.verificacion === "verificada") return { error: "Tu empresa ya está verificada." };
  if (empresa.verificacion === "en_revision") return { error: "Tu solicitud ya está en revisión." };
  if (!empresa.razon_social?.trim()) return { error: "Guarda primero la razón social en tu perfil." };
  const nit = validarNit(empresa.nit);
  if (!nit.ok) return { error: `Guarda un NIT válido en tu perfil. ${nit.error}` };

  const admin = createAdminClient();
  const ahora = new Date().toISOString();
  const { error } = await admin
    .from("empresas")
    .update({ verificacion: "en_revision", verificacion_solicitada_en: ahora, actualizado_en: ahora })
    .eq("id", empresa.id)
    .in("verificacion", ["sin_verificar", "rechazada"]);
  if (error) return { error: "No se pudo enviar la solicitud." };

  await registrarAuditoria({
    actor: actorEmpresa(empresa.id),
    accion: "empresa.verificacion_solicitada",
    entidad: "empresas",
    entidadId: empresa.id,
    antes: { verificacion: empresa.verificacion },
    despues: { verificacion: "en_revision" },
    metadata: { nit: nit.nit },
  });
  revalidatePath("/empresa/perfil");
  return { ok: true };
}
