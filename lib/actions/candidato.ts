"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";
import { enviarBienvenida } from "@/lib/notificaciones";
import { traducirAuthError } from "@/lib/errores";
import { registrarEvento } from "@/lib/eventos";
import { registrarConsentimiento } from "@/lib/actions/cuenta";
import { PLAN_DURACION_DIAS, type PlanId } from "@/lib/constants";

export type FormState = { error?: string; ok?: boolean } | null;

/** Registro de candidato (1 paso). Crea cuenta + perfil + bienvenida. */
export async function registrarCandidato(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const nombre = g("nombre");
  const email = g("email");
  const password = g("password");
  const whatsapp = g("whatsapp");
  const ciudad = g("ciudad");
  const area_interes = g("area_interes");
  const nivel_educativo = g("nivel_educativo");
  const disponibilidad = g("disponibilidad") || "inmediata";
  const barrio = g("barrio") || null;
  const experiencia = g("experiencia") || null;

  if (!nombre || !email || !password || !whatsapp || !ciudad || !area_interes || !nivel_educativo)
    return { error: "Completa todos los campos obligatorios." };
  if (password.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { tipo: "candidato", nombre } },
  });
  if (error) return { error: traducirAuthError(error.message) };
  const userId = data.user?.id;
  if (!userId) return { error: "No se pudo crear la cuenta." };

  const admin = createAdminClient();
  const { error: insErr } = await admin.from("candidatos").insert({
    id: userId,
    nombre,
    email,
    whatsapp,
    ciudad,
    barrio,
    nivel_educativo,
    area_interes,
    experiencia,
    disponibilidad,
  });
  if (insErr) return { error: "No se pudo guardar tu perfil. Intenta de nuevo." };

  await enviarBienvenida({ id: userId, nombre, ciudad, area_interes });
  await registrarEvento({
    tipo: "registro_candidato",
    actor_id: userId,
    actor_tipo: "candidato",
    entidad: "candidatos",
    entidad_id: userId,
    meta: { ciudad, area_interes, nivel_educativo },
  });
  await registrarConsentimiento(userId, "candidato", { canal: "registro", acepta_whatsapp: true });
  redirect("/mis-vacantes?bienvenida=1");
}

/** Actualiza el perfil del candidato logueado. */
export async function actualizarPerfil(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/perfil");
  const g = (k: string) => String(formData.get(k) ?? "").trim();

  const admin = createAdminClient();
  const { error } = await admin
    .from("candidatos")
    .update({
      nombre: g("nombre"),
      whatsapp: g("whatsapp"),
      ciudad: g("ciudad"),
      barrio: g("barrio") || null,
      area_interes: g("area_interes"),
      nivel_educativo: g("nivel_educativo"),
      disponibilidad: g("disponibilidad"),
      experiencia: g("experiencia") || null,
    })
    .eq("id", sesion!.user.id);
  if (error) return { error: "No se pudo guardar. Intenta de nuevo." };
  revalidatePath("/perfil");
  revalidatePath("/mis-vacantes");
  return { ok: true };
}

/**
 * Simula la activación de un plan pago (Fase 2 usará Wompi). Sirve para
 * probar los límites y el muro de pago en el MVP.
 */
export async function activarPlan(plan: PlanId): Promise<FormState> {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/planes");
  const admin = createAdminClient();
  const plan_vence =
    plan === "gratis" ? null : new Date(Date.now() + PLAN_DURACION_DIAS * 86_400_000).toISOString();
  const { error } = await admin
    .from("candidatos")
    .update({ plan, plan_vence, postulaciones_usadas: 0 })
    .eq("id", sesion!.user.id);
  if (error) return { error: "No se pudo activar el plan." };
  await registrarEvento({
    tipo: "plan_activado",
    actor_id: sesion!.user.id,
    actor_tipo: "candidato",
    meta: { plan },
  });
  revalidatePath("/perfil");
  revalidatePath("/planes");
  revalidatePath("/mis-vacantes");
  return { ok: true };
}
