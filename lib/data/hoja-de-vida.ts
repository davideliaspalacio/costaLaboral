import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContenidoHV } from "@/lib/ai";

/* ============================================================
   Acceso a datos de hojas de vida generadas por IA. Service-role:
   autorizamos por código verificando la pertenencia al candidato.
   ============================================================ */

export type HojaDeVida = {
  id: string;
  candidato_id: string;
  titulo: string;
  cargo_objetivo: string;
  contenido: ContenidoHV;
  linkedin_titular: string | null;
  linkedin_acerca: string | null;
  generada_por_ia: boolean;
  creado_en: string;
  actualizado_en: string | null;
};

/** Todas las hojas de vida del candidato, más recientes primero. */
export async function getHojasDeVida(candidatoId: string): Promise<HojaDeVida[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hojas_de_vida")
    .select("*")
    .eq("candidato_id", candidatoId)
    .order("creado_en", { ascending: false });
  return (data ?? []) as HojaDeVida[];
}

/**
 * Una hoja de vida por id, verificando que pertenezca al candidato.
 * Devuelve null si no existe o no es del candidato (evita fugas).
 */
export async function getHojaDeVida(id: string, candidatoId: string): Promise<HojaDeVida | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("hojas_de_vida").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const hv = data as HojaDeVida;
  if (hv.candidato_id !== candidatoId) return null;
  return hv;
}
