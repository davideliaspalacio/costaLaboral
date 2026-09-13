import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ContenidoHV, DatosFuenteHV, ValidacionGuardada } from "@/lib/ia/tipos";

/* ============================================================
   Acceso a datos de hojas de vida. Service-role: autorizamos en
   código verificando la pertenencia al candidato.
   ============================================================ */

export type EstadoContenidoIA = "borrador" | "aprobada";
export type TipoCV = "base" | "vacante" | "sector";

export type HojaDeVida = {
  id: string;
  candidato_id: string;
  titulo: string;
  cargo_objetivo: string | null;
  contenido: ContenidoHV;
  generada_por_ia: boolean;
  tipo: TipoCV;
  vacante_id: string | null;
  sector: string | null;
  padre_id: string | null;
  datos_fuente: Partial<DatosFuenteHV>;
  estado: EstadoContenidoIA;
  aprobada_en: string | null;
  prompt_version: string | null;
  modelo: string | null;
  validacion: ValidacionGuardada | null;
  creado_en: string;
  actualizado_en: string;
};

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x ?? "")).filter(Boolean) : []);

/** Contenido defensivo (filas antiguas o incompletas). */
export function normalizarContenidoHV(raw: unknown): ContenidoHV {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    resumen: typeof c.resumen === "string" ? c.resumen : "",
    habilidades: arr(c.habilidades),
    experiencia: Array.isArray(c.experiencia)
      ? c.experiencia.map((e) => {
          const x = (e ?? {}) as Record<string, unknown>;
          return {
            cargo: String(x.cargo ?? ""),
            empresa: String(x.empresa ?? ""),
            periodo: String(x.periodo ?? ""),
            logros: arr(x.logros),
          };
        })
      : [],
    educacion: arr(c.educacion),
    logros: arr(c.logros),
  };
}

function mapear(row: Record<string, unknown>): HojaDeVida {
  return {
    ...(row as unknown as HojaDeVida),
    contenido: normalizarContenidoHV(row.contenido),
    datos_fuente: (row.datos_fuente ?? {}) as Partial<DatosFuenteHV>,
  };
}

/** Todas las hojas de vida del candidato, más recientes primero. */
export async function getHojasDeVida(candidatoId: string): Promise<HojaDeVida[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("hojas_de_vida")
    .select("*")
    .eq("candidato_id", candidatoId)
    .order("creado_en", { ascending: false });
  return (data ?? []).map(mapear);
}

/** Hojas de vida aprobadas del candidato (fuente para LinkedIn y adaptación). */
export async function getHojasAprobadas(candidatoId: string): Promise<HojaDeVida[]> {
  return (await getHojasDeVida(candidatoId)).filter((h) => h.estado === "aprobada");
}

export async function contarHojasDeVida(candidatoId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("hojas_de_vida")
    .select("id", { count: "exact", head: true })
    .eq("candidato_id", candidatoId);
  return count ?? 0;
}

/**
 * Una hoja de vida por id, verificando que pertenezca al candidato.
 * Devuelve null si no existe o no es del candidato (evita fugas).
 */
export async function getHojaDeVida(id: string, candidatoId: string): Promise<HojaDeVida | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("hojas_de_vida").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const hv = mapear(data);
  if (hv.candidato_id !== candidatoId) return null;
  return hv;
}
