import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VacanteConEmpresa } from "@/lib/types";

export const OFERTAS_POR_PAGINA = 12;

export type BuscarOfertasParams = {
  q?: string;
  ciudad?: string;
  area?: string;
  modalidad?: string;
  page?: number;
};

export type BuscarOfertasResult = {
  items: VacanteConEmpresa[];
  total: number;
  page: number;
};

/** Escapa comodines y comas para usar el término dentro de `.or(...ilike...)`. */
function limpiarBusqueda(q: string): string {
  return q.trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Buscador público de ofertas ("vitrina"). Devuelve vacantes activas, no
 * rechazadas y sin expirar, con filtros por ciudad/área/modalidad y búsqueda
 * de texto en título/descripción. Ordenado por más recientes y paginado.
 */
export async function buscarOfertas({
  q,
  ciudad,
  area,
  modalidad,
  page = 1,
}: BuscarOfertasParams): Promise<BuscarOfertasResult> {
  const admin = createAdminClient();
  const paginaActual = Math.max(1, Math.floor(page) || 1);
  const desde = (paginaActual - 1) * OFERTAS_POR_PAGINA;
  const hasta = desde + OFERTAS_POR_PAGINA - 1;

  let query = admin
    .from("vacantes")
    .select("*, empresa:empresas(id, nombre_negocio, sector, verificada, whatsapp)", {
      count: "exact",
    })
    .eq("activa", true)
    .neq("estado_moderacion", "rechazada")
    .gt("expira_en", new Date().toISOString());

  if (ciudad) query = query.eq("ciudad", ciudad);
  if (area) query = query.eq("area", area);
  if (modalidad) query = query.eq("modalidad", modalidad);

  const termino = q ? limpiarBusqueda(q) : "";
  if (termino) {
    query = query.or(`titulo.ilike.%${termino}%,descripcion.ilike.%${termino}%`);
  }

  const { data, count } = await query
    .order("creado_en", { ascending: false })
    .range(desde, hasta);

  return {
    items: (data ?? []) as unknown as VacanteConEmpresa[],
    total: count ?? 0,
    page: paginaActual,
  };
}
