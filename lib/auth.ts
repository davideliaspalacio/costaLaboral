import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Candidato, Empresa } from "@/lib/types";

export type Tipo = "candidato" | "empresa" | "admin";

/** Lista de correos con acceso al panel /admin (separados por coma en env). */
export function esAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  const lista = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.toLowerCase());
}

/** Usuario autenticado + su tipo (candidato/empresa) guardado en metadata. */
export async function getUsuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const tipo = (user.user_metadata?.tipo as Tipo | undefined) ?? "candidato";
  return { user, tipo, email: user.email ?? "" };
}

/** Perfil del candidato logueado, o null. */
export async function getCandidato(): Promise<Candidato | null> {
  const sesion = await getUsuario();
  if (!sesion) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("candidatos")
    .select("*")
    .eq("id", sesion.user.id)
    .maybeSingle();
  return (data as Candidato) ?? null;
}

/** Perfil de empresa logueada, o null. */
export async function getEmpresa(): Promise<Empresa | null> {
  const sesion = await getUsuario();
  if (!sesion) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("empresas")
    .select("*")
    .eq("id", sesion.user.id)
    .maybeSingle();
  return (data as Empresa) ?? null;
}
