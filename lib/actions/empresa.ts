"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";
import { dispararMatchingVacante } from "@/lib/notificaciones";
import { registrarEvento } from "@/lib/eventos";
import { traducirAuthError } from "@/lib/errores";
import type { Vacante } from "@/lib/types";

export type PublicarState = { error?: string } | null;

/**
 * Publica una vacante (flujo de 3 pasos, sección 4.2). Si no hay sesión de
 * empresa, crea la cuenta de empresa en el mismo flujo. Al terminar dispara
 * el matching y las notificaciones WhatsApp.
 */
export async function publicarVacante(_prev: PublicarState, formData: FormData): Promise<PublicarState> {
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => {
    const v = g(k).replace(/[^\d]/g, "");
    return v ? parseInt(v, 10) : null;
  };

  // --- Datos de empresa ---
  const nombre_negocio = g("nombre_negocio");
  const nombre_contacto = g("nombre_contacto");
  const email = g("email");
  const password = g("password");
  const whatsapp = g("whatsapp");
  const ciudad = g("ciudad");
  const sector = g("sector");

  // --- Datos de vacante ---
  const titulo = g("titulo");
  const area = g("area");
  const modalidad = g("modalidad") || "presencial";
  const nivel_educativo_min = g("nivel_educativo_min") || "bachiller";
  const salario_min = num("salario_min");
  const salario_max = num("salario_max");
  const descripcion = g("descripcion");
  const requisitos = g("requisitos");
  const tiene_contrato = g("tiene_contrato") === "on" || g("tiene_contrato") === "true";
  const ciudadVac = g("vacante_ciudad") || ciudad;

  if (!nombre_negocio || !whatsapp || !ciudad || !sector)
    return { error: "Completa los datos del negocio." };
  if (!titulo || !area || !descripcion)
    return { error: "Completa el cargo, el área y la descripción." };

  const sesion = await getUsuario();
  const admin = createAdminClient();
  let empresaId: string;

  if (sesion?.tipo === "empresa") {
    empresaId = sesion.user.id;
    await admin
      .from("empresas")
      .update({ nombre_negocio, nombre_contacto, whatsapp, ciudad, sector })
      .eq("id", empresaId);
  } else if (sesion) {
    return { error: "Tienes sesión de candidato. Cierra sesión para publicar como empresa." };
  } else {
    if (!email || !password) return { error: "Ingresa un correo y contraseña para tu cuenta." };
    if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { tipo: "empresa", nombre: nombre_contacto || nombre_negocio } },
    });
    if (error) return { error: traducirAuthError(error.message) };
    empresaId = data.user!.id;
    const { error: e2 } = await admin.from("empresas").insert({
      id: empresaId,
      nombre_negocio,
      nombre_contacto: nombre_contacto || nombre_negocio,
      email,
      whatsapp,
      ciudad,
      sector,
    });
    if (e2) return { error: "No se pudo crear la cuenta de empresa." };
  }

  const { data: vac, error: vErr } = await admin
    .from("vacantes")
    .insert({
      empresa_id: empresaId,
      titulo,
      descripcion,
      requisitos,
      ciudad: ciudadVac,
      modalidad,
      area,
      nivel_educativo_min,
      salario_min,
      salario_max,
      tiene_contrato,
    })
    .select()
    .single();
  if (vErr || !vac) return { error: "No se pudo publicar la vacante." };

  await dispararMatchingVacante(vac as Vacante);
  if (!sesion) {
    await registrarEvento({
      tipo: "registro_empresa",
      actor_id: empresaId,
      actor_tipo: "empresa",
      entidad: "empresas",
      entidad_id: empresaId,
      meta: { nombre_negocio, ciudad, sector },
    });
  }
  await registrarEvento({
    tipo: "vacante_publicada",
    actor_id: empresaId,
    actor_tipo: "empresa",
    entidad: "vacantes",
    entidad_id: vac.id,
    meta: { titulo, area, ciudad: ciudadVac },
  });
  redirect(`/empresa/panel?publicada=${vac.id}`);
}

/** Pausar/activar una vacante propia. */
export async function cambiarEstadoVacante(vacanteId: string, activa: boolean) {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login");
  const admin = createAdminClient();
  const { data: v } = await admin.from("vacantes").select("empresa_id").eq("id", vacanteId).maybeSingle();
  if (!v || v.empresa_id !== sesion!.user.id) return { error: "No autorizado" };
  await admin.from("vacantes").update({ activa }).eq("id", vacanteId);
  revalidatePath("/empresa/panel");
  return { ok: true };
}

export type EditarState = { error?: string } | null;

/** Edita los datos de una vacante propia (feature #5). */
export async function editarVacante(_prev: EditarState, formData: FormData): Promise<EditarState> {
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => {
    const v = g(k).replace(/[^\d]/g, "");
    return v ? parseInt(v, 10) : null;
  };

  const id = g("id");
  if (!id) return { error: "Falta la vacante a editar." };

  const sesion = await getUsuario();
  if (!sesion) redirect("/login");
  const admin = createAdminClient();
  const { data: v } = await admin.from("vacantes").select("empresa_id").eq("id", id).maybeSingle();
  if (!v || v.empresa_id !== sesion!.user.id) return { error: "No autorizado." };

  const titulo = g("titulo");
  const area = g("area");
  const descripcion = g("descripcion");
  if (!titulo || !area || !descripcion)
    return { error: "Completa el cargo, el área y la descripción." };

  const { error } = await admin
    .from("vacantes")
    .update({
      titulo,
      descripcion,
      requisitos: g("requisitos"),
      ciudad: g("ciudad"),
      modalidad: g("modalidad") || "presencial",
      area,
      nivel_educativo_min: g("nivel_educativo_min") || "bachiller",
      salario_min: num("salario_min"),
      salario_max: num("salario_max"),
      tiene_contrato: g("tiene_contrato") === "on" || g("tiene_contrato") === "true",
    })
    .eq("id", id);
  if (error) return { error: "No se pudieron guardar los cambios." };

  await registrarEvento({
    tipo: "vacante_moderada",
    actor_id: sesion!.user.id,
    actor_tipo: "empresa",
    entidad: "vacantes",
    entidad_id: id,
    meta: { accion: "editada", titulo },
  });

  revalidatePath("/empresa/panel");
  revalidatePath(`/v/${id}`);
  redirect(`/empresa/panel?editada=${id}`);
}

export type CierreMotivo = "contratado" | "cerrada";

/** Cierra una vacante propia (activa=false) marcando el motivo del cierre. */
export async function cerrarVacante(id: string, motivo: CierreMotivo) {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login");
  const admin = createAdminClient();
  const { data: v } = await admin.from("vacantes").select("empresa_id").eq("id", id).maybeSingle();
  if (!v || v.empresa_id !== sesion!.user.id) return { error: "No autorizado" };

  await admin.from("vacantes").update({ activa: false }).eq("id", id);
  await registrarEvento({
    tipo: "vacante_moderada",
    actor_id: sesion!.user.id,
    actor_tipo: "empresa",
    entidad: "vacantes",
    entidad_id: id,
    meta: { accion: "cerrada", motivo },
  });

  revalidatePath("/empresa/panel");
  revalidatePath(`/v/${id}`);
  return { ok: true };
}

/** Reabre una vacante propia (activa=true) y limpia el marcador de cierre. */
export async function reabrirVacante(id: string) {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login");
  const admin = createAdminClient();
  const { data: v } = await admin.from("vacantes").select("empresa_id").eq("id", id).maybeSingle();
  if (!v || v.empresa_id !== sesion!.user.id) return { error: "No autorizado" };

  await admin.from("vacantes").update({ activa: true }).eq("id", id);
  await registrarEvento({
    tipo: "vacante_moderada",
    actor_id: sesion!.user.id,
    actor_tipo: "empresa",
    entidad: "vacantes",
    entidad_id: id,
    meta: { accion: "reabierta" },
  });

  revalidatePath("/empresa/panel");
  revalidatePath(`/v/${id}`);
  return { ok: true };
}

/** Actualiza el estado de seguimiento de un candidato en el panel (5.5.1). */
export async function actualizarSeguimiento(postulacionId: string, estado_seguimiento: string) {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login");
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("postulaciones")
    .select("id, vacante:vacantes(empresa_id)")
    .eq("id", postulacionId)
    .maybeSingle();
  const empresaDe = (p as any)?.vacante?.empresa_id;
  if (!p || empresaDe !== sesion!.user.id) return { error: "No autorizado" };

  const mapEstado: Record<string, string> = {
    nuevo: "enviada",
    contactado: "vista_empresa",
    en_entrevista: "en_proceso",
    contratado: "seleccionado",
    descartado: "rechazado",
  };
  await admin
    .from("postulaciones")
    .update({ estado_seguimiento, estado: mapEstado[estado_seguimiento] ?? "vista_empresa" })
    .eq("id", postulacionId);
  revalidatePath("/empresa/panel");
  return { ok: true };
}
