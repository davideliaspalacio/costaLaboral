"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string } | null;

/** Inicia sesión con email/contraseña y redirige según el tipo de usuario. */
export async function iniciarSesion(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Correo o contraseña incorrectos." };

  const tipo = (data.user?.user_metadata?.tipo as string) ?? "candidato";
  redirect(next || (tipo === "empresa" ? "/empresa/panel" : "/mis-vacantes"));
}

/** Cierra sesión y vuelve al inicio. */
export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
