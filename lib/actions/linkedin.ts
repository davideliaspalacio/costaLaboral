"use server";

import { revalidatePath } from "next/cache";
import { getCandidato } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBeneficiosCandidato } from "@/lib/billing/suscripciones";
import { registrarAuditoria } from "@/lib/audit";
import { registrarEvento } from "@/lib/eventos";
import { limitar, mensajeLimite } from "@/lib/rate-limit";
import { log } from "@/lib/log";
import { getHojaDeVida } from "@/lib/data/hoja-de-vida";
import { getPerfilLinkedIn } from "@/lib/data/linkedin";
import { ContenidoLinkedInSchema, primerError } from "@/lib/ia/esquemas";
import { conteosSecciones, seccionesCambiadas } from "@/lib/ia/diff";
import { generarContenidoLinkedIn } from "@/lib/ia/linkedin";
import { labelArea, perfilFuenteDe } from "@/lib/ia/perfil";
import { cuotaUsadaMes, vincularUsoIA } from "@/lib/ia/uso";
import type { ContenidoLinkedIn, EstadoIA, FuenteLinkedIn } from "@/lib/ia/tipos";

/* ============================================================
   Server actions de optimización de LinkedIn (sección 11).
   Gratis: sin acceso. Camelleitor: básico. Berraco Pro: avanzado.
   ============================================================ */

type Fallo = { error: string };
const SESION: Fallo = { error: "Tu sesión expiró. Inicia sesión de nuevo." };
const SIN_PLAN: Fallo = { error: "La optimización de LinkedIn es parte de los planes pagos." };
const GENERICO: Fallo = { error: "No pudimos completar la acción. Intenta otra vez." };

export type BloqueLinkedIn = "titular" | "acerca" | "titulares_alternativos" | "habilidades" | "experiencias" | "palabras_clave";
const BLOQUES: BloqueLinkedIn[] = ["titular", "acerca", "titulares_alternativos", "habilidades", "experiencias", "palabras_clave"];

async function contexto() {
  const candidato = await getCandidato();
  if (!candidato) return null;
  const { plan, beneficios } = await getBeneficiosCandidato(candidato.id);
  return { candidato, plan, beneficios, actor: { id: candidato.id, tipo: "candidato" as const } };
}

/** Deja solo los campos del nivel del plan vigente. */
function segunNivel(c: ContenidoLinkedIn, nivel: "basico" | "avanzado"): ContenidoLinkedIn {
  if (nivel === "avanzado") return c;
  return { titular: c.titular, acerca: c.acerca };
}

export async function generarLinkedIn(opciones: {
  hojaDeVidaId: string | null;
}): Promise<{ ok: true; estado: EstadoIA } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  const { candidato, plan, beneficios, actor } = ctx;
  if (beneficios.linkedin === "no") return SIN_PLAN;
  const nivel = beneficios.linkedin;

  const usadas = await cuotaUsadaMes(candidato.id, "linkedin_generar");
  if (usadas >= beneficios.generacionesLinkedinMes) {
    return { error: `Ya usaste tus ${beneficios.generacionesLinkedinMes} generaciones de LinkedIn de este mes.` };
  }

  const perfilBase = perfilFuenteDe(candidato);
  let fuente: FuenteLinkedIn;
  if (opciones.hojaDeVidaId) {
    const hv = await getHojaDeVida(opciones.hojaDeVidaId, candidato.id);
    if (!hv || hv.estado !== "aprobada") return { error: "Elige una hoja de vida aprobada como fuente." };
    const entrada = hv.datos_fuente?.entrada ?? null;
    fuente = {
      tipo: "hoja_de_vida",
      hojaDeVidaId: hv.id,
      perfil: {
        ...perfilBase,
        cargoObjetivo: hv.cargo_objetivo || entrada?.cargoObjetivo || labelArea(candidato.area_interes),
        experienciaLibre: "",
      },
      entrada,
      contenidoHV: hv.contenido,
    };
  } else {
    fuente = {
      tipo: "perfil",
      hojaDeVidaId: null,
      perfil: { ...perfilBase, cargoObjetivo: labelArea(candidato.area_interes), experienciaLibre: candidato.experiencia ?? "" },
      entrada: null,
      contenidoHV: null,
    };
  }

  const lim = await limitar("ia_generar", candidato.id);
  if (!lim.permitido) return { error: mensajeLimite(lim) };

  const gen = await generarContenidoLinkedIn(fuente, nivel, { actorId: candidato.id, plan });
  const ahora = new Date().toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("linkedin_perfiles")
    .upsert(
      {
        candidato_id: candidato.id,
        hoja_de_vida_id: fuente.hojaDeVidaId,
        nivel,
        // Referencia a la fuente (no se duplica el contenido de la HV).
        fuente: { tipo: fuente.tipo, hojaDeVidaId: fuente.hojaDeVidaId, perfil: { ...fuente.perfil, experienciaLibre: undefined } },
        contenido: gen.contenido,
        estado: "borrador",
        aprobado_en: null,
        generado_por_ia: gen.generadoPorIa,
        prompt_version: gen.promptVersion,
        modelo: gen.modelo,
        validacion: gen.validacion,
        actualizado_en: ahora,
      },
      { onConflict: "candidato_id" },
    )
    .select("id")
    .single();
  if (error || !data) {
    log.error("linkedin_upsert_fallo", { candidatoId: candidato.id, err: error });
    return GENERICO;
  }
  const id = data.id as string;

  await vincularUsoIA(gen.usoId, "linkedin_perfiles", id);
  await registrarAuditoria({
    actor,
    accion: "linkedin.generado",
    entidad: "linkedin_perfiles",
    entidadId: id,
    despues: { estado: "borrador", nivel, fuente: fuente.tipo },
    metadata: {
      estado_ia: gen.estado,
      generado_por_ia: gen.generadoPorIa,
      modelo: gen.modelo,
      prompt_version: gen.promptVersion,
      validacion_ok: gen.validacion.ok,
      problemas_graves: gen.validacion.graves,
      plan,
    },
  });
  await registrarEvento({
    tipo: "linkedin_generado",
    actor_id: candidato.id,
    actor_tipo: "candidato",
    entidad: "linkedin_perfiles",
    entidad_id: id,
    meta: { nivel, fuente: fuente.tipo, estado_ia: gen.estado, generado_por_ia: gen.generadoPorIa, plan },
  });

  revalidatePath("/linkedin");
  return { ok: true, estado: gen.estado };
}

export async function actualizarLinkedIn(contenido: ContenidoLinkedIn): Promise<{ ok: true } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  if (ctx.beneficios.linkedin === "no") return SIN_PLAN;

  const perfil = await getPerfilLinkedIn(ctx.candidato.id);
  if (!perfil) return { error: "Primero genera tu perfil de LinkedIn." };

  const parsed = ContenidoLinkedInSchema.safeParse(segunNivel(contenido, ctx.beneficios.linkedin));
  if (!parsed.success) return { error: primerError(parsed.error) };

  const antes = segunNivel(perfil.contenido, ctx.beneficios.linkedin);
  const secciones = seccionesCambiadas(antes, parsed.data);
  if (secciones.length === 0) return { ok: true };

  // Conserva campos avanzados guardados si el plan bajó a básico.
  const nuevo = { ...perfil.contenido, ...parsed.data };
  const admin = createAdminClient();
  const { error } = await admin
    .from("linkedin_perfiles")
    .update({ contenido: nuevo, estado: "borrador", aprobado_en: null, actualizado_en: new Date().toISOString() })
    .eq("id", perfil.id)
    .eq("candidato_id", ctx.candidato.id);
  if (error) return GENERICO;

  await registrarAuditoria({
    actor: ctx.actor,
    accion: "linkedin.editado",
    entidad: "linkedin_perfiles",
    entidadId: perfil.id,
    antes: { estado: perfil.estado, conteos: conteosSecciones(antes) },
    despues: { estado: "borrador", conteos: conteosSecciones(parsed.data) },
    metadata: { secciones_cambiadas: secciones },
  });

  revalidatePath("/linkedin");
  return { ok: true };
}

export async function aprobarLinkedIn(confirmo: boolean): Promise<{ ok: true } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  if (ctx.beneficios.linkedin === "no") return SIN_PLAN;
  if (confirmo !== true) return { error: "Confirma que revisaste tu perfil y que toda la información es real." };

  const perfil = await getPerfilLinkedIn(ctx.candidato.id);
  if (!perfil) return { error: "Primero genera tu perfil de LinkedIn." };
  if (perfil.estado === "aprobada") return { ok: true };

  const ahora = new Date().toISOString();
  const admin = createAdminClient();
  const { error } = await admin
    .from("linkedin_perfiles")
    .update({ estado: "aprobada", aprobado_en: ahora, actualizado_en: ahora })
    .eq("id", perfil.id)
    .eq("candidato_id", ctx.candidato.id);
  if (error) return GENERICO;

  await registrarAuditoria({
    actor: ctx.actor,
    accion: "linkedin.aprobado",
    entidad: "linkedin_perfiles",
    entidadId: perfil.id,
    antes: { estado: perfil.estado },
    despues: { estado: "aprobada", aprobado_en: ahora },
  });

  revalidatePath("/linkedin");
  return { ok: true };
}

export async function registrarExportacionLinkedIn(bloque: BloqueLinkedIn): Promise<{ ok: true } | Fallo> {
  const ctx = await contexto();
  if (!ctx) return SESION;
  if (ctx.beneficios.linkedin === "no") return SIN_PLAN;
  if (!BLOQUES.includes(bloque)) return GENERICO;

  const perfil = await getPerfilLinkedIn(ctx.candidato.id);
  if (!perfil || perfil.estado !== "aprobada") return { error: "Aprueba tu perfil antes de copiarlo." };

  await registrarEvento({
    tipo: "linkedin_exportado",
    actor_id: ctx.candidato.id,
    actor_tipo: "candidato",
    entidad: "linkedin_perfiles",
    entidad_id: perfil.id,
    meta: { bloque, nivel: perfil.nivel },
  });
  return { ok: true };
}
