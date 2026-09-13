"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";
import { enviarBienvenida } from "@/lib/notificaciones";
import { traducirAuthError } from "@/lib/errores";
import { registrarEvento } from "@/lib/eventos";
import { registrarAuditoria, diffCampos } from "@/lib/audit";
import { limitar, mensajeLimite } from "@/lib/rate-limit";
import { registrarConsentimientos } from "@/lib/legal/consentimientos";
import { log } from "@/lib/log";
import {
  esquemaPerfil,
  esquemaRegistro,
  erroresPorCampo,
  leerFormPerfil,
  leerFormRegistro,
  redactarDiff,
} from "@/lib/candidato-validacion";

export type FormState = {
  error?: string;
  ok?: boolean;
  campos?: Record<string, string>;
  /** Valores enviados (sin contraseña) para no vaciar el formulario tras un error. */
  valores?: Record<string, string | boolean>;
} | null;

const ERROR_CAMPOS = "Revisa los campos marcados.";

/** Borra el usuario recién creado para no dejar cuentas sin perfil o sin evidencia de consentimiento. */
async function deshacerRegistro(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId); // la cascada borra la fila de candidatos
  if (error) log.error("registro_rollback_fallo", { userId, err: error });
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // sin sesión que cerrar
  }
}

/** Registro de candidato (1 paso): cuenta + perfil + evidencia de consentimientos. */
export async function registrarCandidato(_prev: FormState, formData: FormData): Promise<FormState> {
  const entrada = leerFormRegistro(formData);
  const { password: _omit, ...valores } = entrada;

  const parsed = esquemaRegistro.safeParse(entrada);
  if (!parsed.success) return { error: ERROR_CAMPOS, campos: erroresPorCampo(parsed.error), valores };
  const d = parsed.data;

  const limite = await limitar("registro");
  if (!limite.permitido) return { error: mensajeLimite(limite), valores };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: d.email,
    password: d.password,
    options: { data: { tipo: "candidato", nombre: d.nombre } },
  });
  if (error) return { error: traducirAuthError(error.message), valores };
  const userId = data.user?.id;
  if (!userId) return { error: "No se pudo crear la cuenta.", valores };

  const ahora = new Date().toISOString();
  const admin = createAdminClient();
  const { error: insErr } = await admin.from("candidatos").insert({
    id: userId,
    nombre: d.nombre,
    email: d.email,
    whatsapp: d.whatsapp,
    ciudad: d.ciudad,
    barrio: d.barrio,
    nivel_educativo: d.nivel_educativo,
    area_interes: d.area_interes,
    experiencia: d.experiencia,
    disponibilidad: d.disponibilidad,
    wsp_opt_in: d.wsp_opt_in,
    wsp_opt_in_en: d.wsp_opt_in ? ahora : null,
    mayor_de_edad: true,
  });
  if (insErr) {
    log.error("registro_candidato_insert_fallo", { userId, err: insErr });
    await deshacerRegistro(userId);
    return { error: "No se pudo guardar tu perfil. Intenta de nuevo.", valores };
  }

  const evidencia = await registrarConsentimientos(
    { id: userId, tipo: "candidato" },
    [
      { finalidad: "tratamiento_datos", otorgado: true },
      { finalidad: "terminos", otorgado: true },
      { finalidad: "mayoria_edad", otorgado: true },
      { finalidad: "whatsapp", otorgado: d.wsp_opt_in },
    ],
    "registro_candidato",
  );
  if (!evidencia) {
    await deshacerRegistro(userId);
    return { error: "No pudimos guardar tu autorización. Intenta de nuevo en un momento.", valores };
  }

  await registrarAuditoria({
    actor: { id: userId, tipo: "candidato" },
    accion: "candidato.registro",
    entidad: "candidatos",
    entidadId: userId,
    metadata: {
      ciudad: d.ciudad,
      area_interes: d.area_interes,
      wsp_opt_in: d.wsp_opt_in,
      mayor_de_edad: true,
    },
  });
  await registrarEvento({
    tipo: "registro_candidato",
    actor_id: userId,
    actor_tipo: "candidato",
    entidad: "candidatos",
    entidad_id: userId,
    meta: { ciudad: d.ciudad, area_interes: d.area_interes, nivel_educativo: d.nivel_educativo, wsp_opt_in: d.wsp_opt_in },
  });
  if (d.wsp_opt_in) await enviarBienvenida({ id: userId, nombre: d.nombre, ciudad: d.ciudad });

  redirect("/mis-vacantes?bienvenida=1");
}

const CAMPOS_PERFIL = [
  "nombre",
  "whatsapp",
  "ciudad",
  "barrio",
  "area_interes",
  "nivel_educativo",
  "disponibilidad",
  "experiencia",
] as const;

/** Actualiza el perfil del candidato logueado (con auditoría de los campos cambiados). */
export async function actualizarPerfil(_prev: FormState, formData: FormData): Promise<FormState> {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/perfil");
  const userId = sesion.user.id;

  const parsed = esquemaPerfil.safeParse(leerFormPerfil(formData));
  if (!parsed.success) return { error: ERROR_CAMPOS, campos: erroresPorCampo(parsed.error) };
  const d = parsed.data;

  const admin = createAdminClient();
  const { data: antes } = await admin
    .from("candidatos")
    .select(CAMPOS_PERFIL.join(", "))
    .eq("id", userId)
    .maybeSingle();
  if (!antes) redirect("/registro-candidato");

  const { error } = await admin
    .from("candidatos")
    .update({ ...d, actualizado_en: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { error: "No se pudo guardar. Intenta de nuevo." };

  const diff = redactarDiff(diffCampos(antes as unknown as Record<string, unknown>, d));
  if (Object.keys(diff.antes).length || diff.sensiblesCambiados.length) {
    await registrarAuditoria({
      actor: { id: userId, tipo: "candidato" },
      accion: "candidato.perfil_actualizado",
      entidad: "candidatos",
      entidadId: userId,
      antes: diff.antes,
      despues: diff.despues,
      metadata: {
        campos: [...Object.keys(diff.despues), ...diff.sensiblesCambiados],
        sensibles_cambiados: diff.sensiblesCambiados,
      },
    });
  }

  revalidatePath("/perfil");
  revalidatePath("/mis-vacantes");
  return { ok: true };
}
