"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";

/**
 * Registra el consentimiento del titular (Ley 1581 de 2012) como un evento
 * `consentimiento` en la tabla `eventos`. Best-effort: nunca rompe el flujo
 * principal de registro. Se guarda como prueba de la autorización otorgada.
 */
export async function registrarConsentimiento(
  userId: string,
  tipo: "candidato" | "empresa",
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("eventos").insert({
      tipo: "consentimiento",
      actor_id: userId,
      actor_tipo: tipo,
      entidad: tipo === "candidato" ? "candidatos" : "empresas",
      entidad_id: userId,
      meta: {
        base_legal: "Ley 1581 de 2012",
        acepta_terminos: true,
        acepta_privacidad: true,
        ...(meta ?? {}),
      },
    });
  } catch {
    // tracking best-effort
  }
}

/**
 * Elimina la cuenta del usuario logueado y TODOS sus datos personales
 * (derecho de supresión, Ley 1581 de 2012). Acción permanente.
 *
 * - Candidato: borra su fila de `candidatos`; las FKs con ON DELETE CASCADE
 *   limpian postulaciones, notificaciones y hojas de vida.
 * - Empresa: borra su fila de `empresas`; la cascada limpia vacantes y, con
 *   ellas, sus postulaciones.
 * - Luego borra el usuario de auth y cierra la sesión.
 */
export async function eliminarCuenta(): Promise<void> {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/cuenta");

  const { user, tipo } = sesion!;
  const userId = user.id;
  const admin = createAdminClient();

  // Deja constancia ANTES de borrar (queda como registro, sin datos sensibles).
  try {
    await admin.from("eventos").insert({
      tipo: "cuenta_eliminada",
      actor_id: userId,
      actor_tipo: tipo === "admin" ? "admin" : tipo,
      entidad: tipo === "empresa" ? "empresas" : "candidatos",
      entidad_id: userId,
      meta: { base_legal: "Ley 1581 de 2012", motivo: "solicitud del titular" },
    });
  } catch {
    // tracking best-effort
  }

  // Borra el perfil y, por cascada, todos los datos asociados.
  if (tipo === "empresa") {
    await admin.from("empresas").delete().eq("id", userId);
  } else {
    // candidato (o admin sin perfil: el delete simplemente no afecta filas)
    await admin.from("candidatos").delete().eq("id", userId);
  }

  // Borra la cuenta de autenticación.
  await admin.auth.admin.deleteUser(userId);

  // Cierra la sesión del navegador y vuelve al inicio.
  const supabase = await createClient();
  await supabase.auth.signOut();

  redirect("/?cuenta=eliminada");
}
