"use server";

import { revalidatePath } from "next/cache";
import { getCandidato } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { estadoPlanDeCandidato } from "@/lib/data/postulaciones";
import { registrarEvento } from "@/lib/eventos";
import { getHojaDeVida } from "@/lib/data/hoja-de-vida";
import { generarHojaDeVida, type DatosHV, type ContenidoHV, type LinkedInHV } from "@/lib/ai";
import { AREAS, NIVELES_EDUCATIVOS } from "@/lib/constants";

/* ============================================================
   Server actions de la feature de IA (hoja de vida + LinkedIn).
   Gate premium: solo candidatos con plan de pago vigente.
   ============================================================ */

const labelArea = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;
const labelNivel = (v: string) => NIVELES_EDUCATIVOS.find((n) => n.value === v)?.label ?? v;

export type EntradaHV = {
  cargoObjetivo: string;
  aniosExperiencia: number;
  experiencia: { cargo: string; empresa: string; periodo: string; descripcion: string }[];
  habilidades: string[];
  educacion: string[];
};

export type ResultadoCrear =
  | {
      ok: true;
      id: string;
      contenido: ContenidoHV;
      linkedin: LinkedInHV;
      generada_por_ia: boolean;
    }
  | { error: "premium" | "sesion" | "generico" };

/**
 * Genera con IA (o fallback), inserta la hoja de vida y registra el evento.
 * Devuelve el contenido para mostrar la vista previa editable en el wizard.
 */
export async function crearHojaDeVida(entrada: EntradaHV): Promise<ResultadoCrear> {
  const candidato = await getCandidato();
  if (!candidato) return { error: "sesion" };

  // Gate premium: plan de pago vigente.
  const estado = await estadoPlanDeCandidato(candidato);
  if (estado.plan === "gratis") return { error: "premium" };

  const datos: DatosHV = {
    nombre: candidato.nombre,
    ciudad: candidato.ciudad,
    area: labelArea(candidato.area_interes),
    cargoObjetivo: (entrada.cargoObjetivo || "").trim(),
    aniosExperiencia: Number.isFinite(entrada.aniosExperiencia)
      ? Math.max(0, Math.floor(entrada.aniosExperiencia))
      : 0,
    nivelEducativo: labelNivel(candidato.nivel_educativo),
    experiencia: (entrada.experiencia ?? [])
      .map((e) => ({
        cargo: (e.cargo || "").trim(),
        empresa: (e.empresa || "").trim(),
        periodo: (e.periodo || "").trim(),
        descripcion: (e.descripcion || "").trim(),
      }))
      .filter((e) => e.cargo || e.empresa || e.descripcion),
    habilidades: (entrada.habilidades ?? []).map((h) => h.trim()).filter(Boolean),
    educacion: (entrada.educacion ?? []).map((e) => e.trim()).filter(Boolean),
  };

  const resultado = await generarHojaDeVida(datos);

  const titulo = datos.cargoObjetivo
    ? `Hoja de vida — ${datos.cargoObjetivo}`
    : `Hoja de vida — ${datos.area}`;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("hojas_de_vida")
    .insert({
      candidato_id: candidato.id,
      titulo,
      cargo_objetivo: datos.cargoObjetivo || datos.area,
      contenido: resultado.contenido,
      linkedin_titular: resultado.linkedin.titular,
      linkedin_acerca: resultado.linkedin.acerca,
      generada_por_ia: resultado.generada_por_ia,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "generico" };

  await registrarEvento({
    tipo: "hv_generada",
    actor_id: candidato.id,
    actor_tipo: "candidato",
    entidad: "hojas_de_vida",
    entidad_id: data.id,
    meta: {
      cargo_objetivo: datos.cargoObjetivo,
      generada_por_ia: resultado.generada_por_ia,
      plan: estado.plan,
    },
  });

  revalidatePath("/hoja-de-vida");

  return {
    ok: true,
    id: data.id as string,
    contenido: resultado.contenido,
    linkedin: resultado.linkedin,
    generada_por_ia: resultado.generada_por_ia,
  };
}

export type ContenidoEditable = {
  titulo?: string;
  contenido: ContenidoHV;
  linkedin_titular: string;
  linkedin_acerca: string;
};

/** Actualiza el contenido editado de una hoja de vida (verifica pertenencia). */
export async function actualizarHojaDeVida(
  id: string,
  contenido: ContenidoEditable,
): Promise<{ ok: true } | { error: string }> {
  const candidato = await getCandidato();
  if (!candidato) return { error: "sesion" };

  const existente = await getHojaDeVida(id, candidato.id);
  if (!existente) return { error: "no_encontrada" };

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    contenido: contenido.contenido,
    linkedin_titular: contenido.linkedin_titular,
    linkedin_acerca: contenido.linkedin_acerca,
    actualizado_en: new Date().toISOString(),
  };
  if (contenido.titulo && contenido.titulo.trim()) patch.titulo = contenido.titulo.trim();

  const { error } = await admin.from("hojas_de_vida").update(patch).eq("id", id);
  if (error) return { error: "generico" };

  revalidatePath("/hoja-de-vida");
  revalidatePath(`/hoja-de-vida/${id}`);
  return { ok: true };
}

/** Elimina una hoja de vida del candidato (verifica pertenencia). */
export async function eliminarHojaDeVida(id: string): Promise<{ ok: true } | { error: string }> {
  const candidato = await getCandidato();
  if (!candidato) return { error: "sesion" };

  const existente = await getHojaDeVida(id, candidato.id);
  if (!existente) return { error: "no_encontrada" };

  const admin = createAdminClient();
  const { error } = await admin.from("hojas_de_vida").delete().eq("id", id);
  if (error) return { error: "generico" };

  revalidatePath("/hoja-de-vida");
  return { ok: true };
}
