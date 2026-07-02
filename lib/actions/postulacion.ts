"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";
import { calcularScore, razonMatch } from "@/lib/matching";
import { registrarEvento } from "@/lib/eventos";
import { estadoPlan } from "@/lib/plan";
import type { Candidato, Vacante } from "@/lib/types";

export type PostulacionResult =
  | { ok: true; score: number }
  | { error: "limite" | "ya_postulado" | "cerrada" | "generico" };

/** El candidato se postula a una vacante, respetando el límite de su plan (sección 4.4). */
export async function postularse(vacanteId: string, mensaje?: string): Promise<PostulacionResult> {
  const sesion = await getUsuario();
  if (!sesion) redirect(`/login?next=/v/${vacanteId}`);
  if (sesion!.tipo === "empresa") return { error: "generico" };

  const admin = createAdminClient();

  const { data: candidato } = await admin
    .from("candidatos")
    .select("*")
    .eq("id", sesion!.user.id)
    .maybeSingle();
  if (!candidato) redirect("/registro-candidato");

  const { data: vacante } = await admin
    .from("vacantes")
    .select("*")
    .eq("id", vacanteId)
    .maybeSingle();
  if (!vacante || !(vacante as Vacante).activa) return { error: "cerrada" };

  // ¿Ya se postuló?
  const { data: previa } = await admin
    .from("postulaciones")
    .select("id")
    .eq("candidato_id", candidato.id)
    .eq("vacante_id", vacanteId)
    .maybeSingle();
  if (previa) return { error: "ya_postulado" };

  // Límite del plan según postulaciones en la ventana de 90 días.
  const c = candidato as Candidato;
  const { ventanaInicio } = estadoPlan(c, 0);
  const { count } = await admin
    .from("postulaciones")
    .select("*", { count: "exact", head: true })
    .eq("candidato_id", c.id)
    .gte("creado_en", ventanaInicio.toISOString());
  const estado = estadoPlan(c, count ?? 0);
  if (!estado.puedeAplicar) return { error: "limite" };

  const perfil = {
    ciudad: c.ciudad,
    area_interes: c.area_interes,
    nivel_educativo: c.nivel_educativo,
    disponibilidad: c.disponibilidad,
  };
  const score = calcularScore(perfil, vacante as Vacante);

  const { error } = await admin.from("postulaciones").insert({
    candidato_id: c.id,
    vacante_id: vacanteId,
    score_match: score,
    match_razon: razonMatch(perfil, vacante as Vacante),
    mensaje: mensaje?.trim() || null,
  });
  if (error) return { error: "generico" };

  await admin
    .from("candidatos")
    .update({ postulaciones_usadas: (count ?? 0) + 1 })
    .eq("id", c.id);

  await registrarEvento({
    tipo: "postulacion",
    actor_id: c.id,
    actor_tipo: "candidato",
    entidad: "vacantes",
    entidad_id: vacanteId,
    meta: { score },
  });

  revalidatePath(`/v/${vacanteId}`);
  revalidatePath("/mis-vacantes");
  revalidatePath("/perfil");
  return { ok: true, score };
}
