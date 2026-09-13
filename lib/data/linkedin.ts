import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContenidoLinkedIn, FuenteLinkedIn, NivelLinkedIn, ValidacionGuardada } from "@/lib/ia/tipos";
import type { EstadoContenidoIA } from "./hoja-de-vida";

/* ============================================================
   Perfil de LinkedIn del candidato (linkedin_perfiles, 1:1).
   ============================================================ */

export type PerfilLinkedIn = {
  id: string;
  candidato_id: string;
  hoja_de_vida_id: string | null;
  nivel: NivelLinkedIn;
  fuente: Partial<FuenteLinkedIn>;
  contenido: ContenidoLinkedIn;
  estado: EstadoContenidoIA;
  aprobado_en: string | null;
  generado_por_ia: boolean;
  prompt_version: string | null;
  modelo: string | null;
  validacion: ValidacionGuardada | null;
  creado_en: string;
  actualizado_en: string;
};

const arr = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.map((x) => String(x ?? "")).filter(Boolean) : undefined;

export function normalizarContenidoLinkedIn(raw: unknown): ContenidoLinkedIn {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: ContenidoLinkedIn = {
    titular: typeof c.titular === "string" ? c.titular : "",
    acerca: typeof c.acerca === "string" ? c.acerca : "",
  };
  const alt = arr(c.titulares_alternativos);
  const hab = arr(c.habilidades);
  const pal = arr(c.palabras_clave);
  if (alt) out.titulares_alternativos = alt;
  if (hab) out.habilidades = hab;
  if (pal) out.palabras_clave = pal;
  if (Array.isArray(c.experiencias)) {
    out.experiencias = c.experiencias.map((e) => {
      const x = (e ?? {}) as Record<string, unknown>;
      return { cargo: String(x.cargo ?? ""), empresa: String(x.empresa ?? ""), descripcion: String(x.descripcion ?? "") };
    });
  }
  return out;
}

export async function getPerfilLinkedIn(candidatoId: string): Promise<PerfilLinkedIn | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("linkedin_perfiles").select("*").eq("candidato_id", candidatoId).maybeSingle();
  if (!data) return null;
  return {
    ...(data as unknown as PerfilLinkedIn),
    contenido: normalizarContenidoLinkedIn(data.contenido),
    fuente: (data.fuente ?? {}) as Partial<FuenteLinkedIn>,
  };
}
