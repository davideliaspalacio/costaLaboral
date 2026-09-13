import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { infoRequest } from "@/lib/request";
import { log } from "@/lib/log";

/* ============================================================
   Rate limiting de ventana fija sobre Postgres (función atómica
   rate_limit_hit). Sin infraestructura extra; si el tráfico crece,
   se reemplaza por Upstash/Vercel Firewall sin tocar los llamadores.
   Falla abierto: una caída del limitador no tumba la app.
   ============================================================ */

export const LIMITES = {
  login: { ventanaSeg: 15 * 60, max: 10 },
  registro: { ventanaSeg: 60 * 60, max: 5 },
  postular: { ventanaSeg: 60 * 60, max: 30 },
  ia_generar: { ventanaSeg: 60 * 60, max: 10 },
  reportar: { ventanaSeg: 24 * 60 * 60, max: 10 },
  solicitud_titular: { ventanaSeg: 24 * 60 * 60, max: 5 },
  checkout: { ventanaSeg: 60 * 60, max: 20 },
  webhook: { ventanaSeg: 60, max: 300 },
  exportar: { ventanaSeg: 60 * 60, max: 20 },
} as const;

export type NombreLimite = keyof typeof LIMITES;

export type ResultadoLimite = { permitido: boolean; reintentarEnSeg: number };

/**
 * Cuenta un intento para `nombre` + `identificador` (id de usuario o IP).
 * Si no pasas identificador, usa la IP de la petición.
 */
export async function limitar(nombre: NombreLimite, identificador?: string | null): Promise<ResultadoLimite> {
  const { ventanaSeg, max } = LIMITES[nombre];
  const id = identificador || (await infoRequest()).ip || "anonimo";
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_clave: `${nombre}:${id}`,
      p_ventana_seg: ventanaSeg,
      p_max: max,
    });
    if (error) throw error;
    const fila = (Array.isArray(data) ? data[0] : data) as { permitido: boolean; reinicia_en: string } | undefined;
    if (!fila) return { permitido: true, reintentarEnSeg: 0 };
    const reintentarEnSeg = Math.max(0, Math.ceil((new Date(fila.reinicia_en).getTime() - Date.now()) / 1000));
    if (!fila.permitido) log.warn("rate_limit_excedido", { nombre, reintentarEnSeg });
    return { permitido: fila.permitido, reintentarEnSeg };
  } catch (err) {
    log.error("rate_limit_fallo", { nombre, err });
    return { permitido: true, reintentarEnSeg: 0 };
  }
}

export function mensajeLimite(r: ResultadoLimite): string {
  const minutos = Math.max(1, Math.ceil(r.reintentarEnSeg / 60));
  return `Demasiados intentos. Intenta de nuevo en ${minutos} ${minutos === 1 ? "minuto" : "minutos"}.`;
}
