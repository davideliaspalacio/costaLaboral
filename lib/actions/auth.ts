"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { limitar, mensajeLimite } from "@/lib/rate-limit";
import { infoRequest } from "@/lib/request";
import { registrarEvento } from "@/lib/eventos";

export type AuthState = { error?: string } | null;

/** Solo rutas internas: evita redirecciones abiertas con ?next=https://… */
function destinoSeguro(next: string): string | null {
  return next.startsWith("/") && !next.startsWith("//") ? next : null;
}

/** Inicia sesión con email/contraseña y redirige según el tipo de usuario. */
export async function iniciarSesion(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = destinoSeguro(String(formData.get("next") ?? ""));

  if (!email || !password) return { error: "Escribe tu correo y tu contraseña." };

  const { ip } = await infoRequest();
  const limite = await limitar("login", ip);
  if (!limite.permitido) return { error: mensajeLimite(limite) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Correo o contraseña incorrectos." };

  const tipo = (data.user?.user_metadata?.tipo as string) ?? "candidato";
  await registrarEvento({
    tipo: "login",
    actor_id: data.user?.id ?? null,
    actor_tipo: tipo === "empresa" ? "empresa" : "candidato",
  });
  redirect(next ?? (tipo === "empresa" ? "/empresa/panel" : "/mis-vacantes"));
}

/** Cierra sesión y vuelve al inicio. */
export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
