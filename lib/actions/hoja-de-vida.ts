"use server";

import { revalidatePath } from "next/cache";
import { getCandidato } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBeneficiosCandidato } from "@/lib/billing/suscripciones";
import { registrarAuditoria } from "@/lib/audit";
import { registrarEvento } from "@/lib/eventos";
import { limitar, mensajeLimite } from "@/lib/rate-limit";
import { log } from "@/lib/log";
import { getVacanteSinContar } from "@/lib/data/vacantes";
import { contarHojasDeVida, getHojaDeVida } from "@/lib/data/hoja-de-vida";
import { ContenidoHVSchema, EntradaHVSchema, TituloHVSchema, limpiarEntrada, primerError } from "@/lib/ia/esquemas";
import { conteosSecciones, seccionesCambiadas } from "@/lib/ia/diff";
import { generarContenidoHV } from "@/lib/ia/hv";
import { labelArea, perfilFuenteDe } from "@/lib/ia/perfil";
import { reordenarHV } from "@/lib/ia/reordenar";
import { cuotaUsadaMes, vincularUsoIA } from "@/lib/ia/uso";
import type { ContenidoHV, EntradaHV, EstadoIA } from "@/lib/ia/tipos";

/* ============================================================
   Server actions de hoja de vida (sección 6):
   plan → cuestionario → validación → generación → edición →
   aprobación → descarga/copia → nueva versión.
   ============================================================ */

type Fallo = { error: string };
const SESION: Fallo = { error: "Tu sesión expiró. Inicia sesión de nuevo." };
const SOLO_PAGOS: Fallo = { error: "Editar, aprobar, copiar y descargar es parte de los planes pagos." };
const GENERICO: Fallo = { error: "No pudimos completar la acción. Intenta otra vez." };

async function contexto() {
  const candidato = await getCandidato();
  if (!candidato) return null;
  const { plan, beneficios } = await getBeneficiosCandidato(candidato.id);
  return { candidato, plan, beneficios, actor: { id: candidato.id, tipo: "candidato" as const } };
}

function revalidar(id?: string) {
  revalidatePath("/hoja-de-vida");
  if (id) revalidatePath(`/hoja-de-vida/${id}`);
}

/* ---------------------------- Generar ---------------------------- */

export async function generarHojaDeVida(
  entradaCruda: EntradaHV,
): Promise<{ ok: true; id: string; estado: EstadoIA } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  const { candidato, plan, beneficios, actor } = ctx;

  const parsed = EntradaHVSchema.safeParse(limpiarEntrada(entradaCruda));
  if (!parsed.success) return { error: primerError(parsed.error) };

  const [usadas, total] = await Promise.all([cuotaUsadaMes(candidato.id, "hv_generar"), contarHojasDeVida(candidato.id)]);
  if (usadas >= beneficios.generacionesCvMes) {
    return { error: `Ya usaste tus ${beneficios.generacionesCvMes} generaciones de este mes. Mejora tu plan o espera al próximo mes.` };
  }
  if (total >= beneficios.maxVersionesCv) {
    return { error: `Tu plan permite ${beneficios.maxVersionesCv} hoja(s) de vida guardada(s). Elimina una para crear otra.` };
  }
  const lim = await limitar("ia_generar", candidato.id);
  if (!lim.permitido) return { error: mensajeLimite(lim) };

  const fuente = { entrada: parsed.data, perfil: perfilFuenteDe(candidato) };
  const gen = await generarContenidoHV(fuente, { actorId: candidato.id, plan });

  const titulo = `Hoja de vida — ${parsed.data.cargoObjetivo}`.slice(0, 120);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hojas_de_vida")
    .insert({
      candidato_id: candidato.id,
      titulo,
      cargo_objetivo: parsed.data.cargoObjetivo,
      contenido: gen.contenido,
      generada_por_ia: gen.generadaPorIa,
      tipo: "base",
      datos_fuente: fuente,
      estado: "borrador",
      prompt_version: gen.promptVersion,
      modelo: gen.modelo,
      validacion: gen.validacion,
    })
    .select("id")
    .single();
  if (error || !data) {
    log.error("hv_insert_fallo", { candidatoId: candidato.id, err: error });
    return GENERICO;
  }
  const id = data.id as string;

  await vincularUsoIA(gen.usoId, "hojas_de_vida", id);
  await registrarAuditoria({
    actor,
    accion: "hv.generada",
    entidad: "hojas_de_vida",
    entidadId: id,
    despues: { estado: "borrador", tipo: "base" },
    metadata: {
      estado_ia: gen.estado,
      generada_por_ia: gen.generadaPorIa,
      modelo: gen.modelo,
      prompt_version: gen.promptVersion,
      validacion_ok: gen.validacion.ok,
      problemas_graves: gen.validacion.graves,
      plan,
    },
  });
  await registrarEvento({
    tipo: "hv_generada",
    actor_id: candidato.id,
    actor_tipo: "candidato",
    entidad: "hojas_de_vida",
    entidad_id: id,
    meta: { estado_ia: gen.estado, generada_por_ia: gen.generadaPorIa, plan },
  });

  revalidar();
  return { ok: true, id, estado: gen.estado };
}

/* ---------------------------- Editar ---------------------------- */

export async function actualizarHojaDeVida(
  id: string,
  cambios: { titulo: string; contenido: ContenidoHV },
): Promise<{ ok: true; volvioABorrador: boolean } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  if (ctx.beneficios.cvIa !== "completo") return SOLO_PAGOS;

  const hv = await getHojaDeVida(id, ctx.candidato.id);
  if (!hv) return { error: "No encontramos esa hoja de vida." };

  const titulo = TituloHVSchema.safeParse(cambios.titulo);
  if (!titulo.success) return { error: primerError(titulo.error) };
  const contenido = ContenidoHVSchema.safeParse(cambios.contenido);
  if (!contenido.success) return { error: primerError(contenido.error) };

  const antes = { titulo: hv.titulo, ...hv.contenido };
  const despues = { titulo: titulo.data, ...contenido.data };
  const secciones = seccionesCambiadas(antes, despues);
  if (secciones.length === 0) return { ok: true, volvioABorrador: false };

  const volvioABorrador = hv.estado === "aprobada";
  const admin = createAdminClient();
  const { error } = await admin
    .from("hojas_de_vida")
    .update({
      titulo: titulo.data,
      contenido: contenido.data,
      estado: "borrador",
      aprobada_en: null,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("candidato_id", ctx.candidato.id);
  if (error) return GENERICO;

  await registrarAuditoria({
    actor: ctx.actor,
    accion: "hv.editada",
    entidad: "hojas_de_vida",
    entidadId: id,
    antes: { estado: hv.estado, conteos: conteosSecciones(antes) },
    despues: { estado: "borrador", conteos: conteosSecciones(despues) },
    metadata: { secciones_cambiadas: secciones, volvio_a_borrador: volvioABorrador },
  });

  revalidar(id);
  return { ok: true, volvioABorrador };
}

/* ---------------------------- Aprobar ---------------------------- */

export async function aprobarHojaDeVida(id: string, confirmo: boolean): Promise<{ ok: true } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  if (ctx.beneficios.cvIa !== "completo") return SOLO_PAGOS;
  if (confirmo !== true) return { error: "Confirma que revisaste tu hoja de vida y que toda la información es real." };

  const hv = await getHojaDeVida(id, ctx.candidato.id);
  if (!hv) return { error: "No encontramos esa hoja de vida." };
  if (hv.estado === "aprobada") return { ok: true };

  const ahora = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .from("hojas_de_vida")
    .update({ estado: "aprobada", aprobada_en: ahora, actualizado_en: ahora })
    .eq("id", id)
    .eq("candidato_id", ctx.candidato.id);
  if (error) return GENERICO;

  await registrarAuditoria({
    actor: ctx.actor,
    accion: "hv.aprobada",
    entidad: "hojas_de_vida",
    entidadId: id,
    antes: { estado: hv.estado },
    despues: { estado: "aprobada", aprobada_en: ahora },
    metadata: { confirmacion: "Revisé mi hoja de vida y confirmo que toda la información es real" },
  });
  await registrarEvento({
    tipo: "hv_aprobada",
    actor_id: ctx.candidato.id,
    actor_tipo: "candidato",
    entidad: "hojas_de_vida",
    entidad_id: id,
    meta: { tipo: hv.tipo, generada_por_ia: hv.generada_por_ia },
  });

  revalidar(id);
  return { ok: true };
}

/* ---------------------------- Exportar ---------------------------- */

export type ViaExportacion = "copiar" | "imprimir" | "imprimir_adaptada";

/** Registra la exportación (copiar o imprimir/PDF). Solo HV aprobadas de planes pagos. */
export async function registrarExportacionHV(id: string, via: ViaExportacion): Promise<{ ok: true } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  if (ctx.beneficios.cvIa !== "completo") return SOLO_PAGOS;
  if (!["copiar", "imprimir", "imprimir_adaptada"].includes(via)) return GENERICO;

  const hv = await getHojaDeVida(id, ctx.candidato.id);
  if (!hv || hv.estado !== "aprobada") return { error: "Solo puedes exportar hojas de vida aprobadas." };

  const lim = await limitar("exportar", ctx.candidato.id);
  if (!lim.permitido) return { error: mensajeLimite(lim) };

  await registrarEvento({
    tipo: "hv_exportada",
    actor_id: ctx.candidato.id,
    actor_tipo: "candidato",
    entidad: "hojas_de_vida",
    entidad_id: id,
    meta: { via, tipo: hv.tipo },
  });
  return { ok: true };
}

/* ---------------------------- Versiones ---------------------------- */

export async function crearVersionHV(id: string): Promise<{ ok: true; id: string } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  if (ctx.beneficios.cvIa !== "completo") return SOLO_PAGOS;

  const hv = await getHojaDeVida(id, ctx.candidato.id);
  if (!hv) return { error: "No encontramos esa hoja de vida." };
  const total = await contarHojasDeVida(ctx.candidato.id);
  if (total >= ctx.beneficios.maxVersionesCv) {
    return { error: `Tu plan permite ${ctx.beneficios.maxVersionesCv} versiones. Elimina una para crear otra.` };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hojas_de_vida")
    .insert({
      candidato_id: ctx.candidato.id,
      titulo: `${hv.titulo} (nueva versión)`.slice(0, 120),
      cargo_objetivo: hv.cargo_objetivo,
      contenido: hv.contenido,
      generada_por_ia: hv.generada_por_ia,
      tipo: hv.tipo,
      vacante_id: hv.vacante_id,
      sector: hv.sector,
      padre_id: hv.id,
      datos_fuente: hv.datos_fuente,
      estado: "borrador",
      prompt_version: hv.prompt_version,
      modelo: hv.modelo,
      validacion: hv.validacion,
    })
    .select("id")
    .single();
  if (error || !data) return GENERICO;

  await registrarAuditoria({
    actor: ctx.actor,
    accion: "hv.version_creada",
    entidad: "hojas_de_vida",
    entidadId: data.id as string,
    despues: { estado: "borrador", tipo: hv.tipo, padre_id: hv.id },
    metadata: { origen: "duplicar" },
  });

  revalidar();
  return { ok: true, id: data.id as string };
}

/** Berraco Pro: guarda la HV reordenada para una vacante como versión hija. */
export async function guardarVersionParaVacante(
  hvId: string,
  vacanteId: string,
): Promise<{ ok: true; id: string } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  if (ctx.beneficios.cvDinamico !== "reordenar_versiones") {
    return { error: "Guardar versiones por vacante es parte del plan Berraco Pro." };
  }

  const hv = await getHojaDeVida(hvId, ctx.candidato.id);
  if (!hv || hv.estado !== "aprobada") return { error: "Elige una hoja de vida aprobada." };
  const vacante = /^[0-9a-f-]{36}$/i.test(vacanteId) ? await getVacanteSinContar(vacanteId) : null;
  if (!vacante) return { error: "No encontramos esa vacante." };

  const total = await contarHojasDeVida(ctx.candidato.id);
  if (total >= ctx.beneficios.maxVersionesCv) {
    return { error: `Tu plan permite ${ctx.beneficios.maxVersionesCv} versiones. Elimina una para crear otra.` };
  }

  // Reordenar no cambia el texto que el candidato aprobó: la versión conserva la aprobación.
  const contenido = reordenarHV(hv.contenido, {
    titulo: vacante.titulo,
    descripcion: vacante.descripcion,
    requisitos: vacante.requisitos,
    area: labelArea(vacante.area),
  });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hojas_de_vida")
    .insert({
      candidato_id: ctx.candidato.id,
      titulo: `${hv.titulo} · ${vacante.titulo}`.slice(0, 120),
      cargo_objetivo: hv.cargo_objetivo,
      contenido,
      generada_por_ia: hv.generada_por_ia,
      tipo: "vacante",
      vacante_id: vacante.id,
      padre_id: hv.id,
      datos_fuente: hv.datos_fuente,
      estado: "aprobada",
      aprobada_en: hv.aprobada_en,
      prompt_version: hv.prompt_version,
      modelo: hv.modelo,
      validacion: hv.validacion,
    })
    .select("id")
    .single();
  if (error || !data) return GENERICO;
  const id = data.id as string;

  await registrarAuditoria({
    actor: ctx.actor,
    accion: "hv.version_creada",
    entidad: "hojas_de_vida",
    entidadId: id,
    despues: { estado: "aprobada", tipo: "vacante", padre_id: hv.id, vacante_id: vacante.id },
    metadata: { origen: "reordenar_vacante" },
  });
  await registrarEvento({
    tipo: "hv_adaptada",
    actor_id: ctx.candidato.id,
    actor_tipo: "candidato",
    entidad: "hojas_de_vida",
    entidad_id: id,
    meta: { vacante_id: vacante.id, guardada: true },
  });

  revalidar();
  return { ok: true, id };
}

/* ---------------------------- Eliminar ---------------------------- */

export async function eliminarHojaDeVida(id: string): Promise<{ ok: true } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;

  const hv = await getHojaDeVida(id, ctx.candidato.id);
  if (!hv) return { error: "No encontramos esa hoja de vida." };

  const admin = createAdminClient();
  const { error } = await admin.from("hojas_de_vida").delete().eq("id", id).eq("candidato_id", ctx.candidato.id);
  if (error) return GENERICO;

  await registrarAuditoria({
    actor: ctx.actor,
    accion: "hv.eliminada",
    entidad: "hojas_de_vida",
    entidadId: id,
    antes: { estado: hv.estado, tipo: hv.tipo, padre_id: hv.padre_id },
  });

  revalidar();
  return { ok: true };
}
