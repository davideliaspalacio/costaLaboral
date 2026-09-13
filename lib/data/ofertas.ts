import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SELECT_EMPRESA_PUBLICA } from "@/lib/data/vacantes";
import { AREAS, CIUDADES, MODALIDADES, TIPOS_EMPLEO, type EstadoPostulacion } from "@/lib/constants";
import type { VacanteConEmpresa } from "@/lib/types";

/* ============================================================
   Portal público de ofertas (/ofertas).
   Orden: destacadas vigentes primero y luego las más recientes.

   Paginación estable: la franja de destacadas (hasta 3, las más
   recientes entre las vigentes que cumplen los filtros) se calcula
   igual en cada request y se EXCLUYE del listado paginado en todas
   las páginas. Así ninguna vacante se repite ni se salta al pasar de
   página. La franja se muestra solo en la página 1; las destacadas
   que no caben en ella aparecen en el listado por fecha.
   ============================================================ */

export const OFERTAS_POR_PAGINA = 12;
export const MAX_DESTACADAS_FRANJA = 3;

export type FiltrosOfertas = {
  q: string;
  ciudad: string;
  area: string;
  tipo: string;
  modalidad: string;
  page: number;
};

type ValorParam = string | string[] | undefined;

function primer(v: ValorParam): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

const enLista = (lista: readonly { value: string }[], v: string) => (lista.some((x) => x.value === v) ? v : "");

/** Normaliza los searchParams de /ofertas: descarta valores fuera de catálogo. */
export function parsearFiltrosOfertas(sp: Record<string, ValorParam>): FiltrosOfertas {
  const ciudad = primer(sp.ciudad);
  return {
    q: primer(sp.q).slice(0, 80),
    ciudad: (CIUDADES as readonly string[]).includes(ciudad) ? ciudad : "",
    area: enLista(AREAS, primer(sp.area)),
    tipo: enLista(TIPOS_EMPLEO, primer(sp.tipo)),
    modalidad: enLista(MODALIDADES, primer(sp.modalidad)),
    page: Math.max(1, Number.parseInt(primer(sp.page), 10) || 1),
  };
}

export const CLAVES_FILTRO = ["q", "ciudad", "area", "tipo", "modalidad"] as const;
export type ClaveFiltro = (typeof CLAVES_FILTRO)[number];

/** href de /ofertas conservando los filtros; `cambios` sobrescribe (cadena vacía = quitar). */
export function hrefOfertas(
  filtros: Omit<FiltrosOfertas, "page"> & { page?: number },
  cambios: Partial<Record<ClaveFiltro, string>> & { page?: number } = {},
): string {
  const params = new URLSearchParams();
  for (const k of CLAVES_FILTRO) {
    const v = k in cambios ? cambios[k] : filtros[k];
    if (v) params.set(k, v);
  }
  const page = "page" in cambios ? cambios.page : undefined;
  if (page && page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/ofertas?${qs}` : "/ofertas";
}

/** Quita comodines y separadores que romperían el filtro `.or(...ilike...)` de PostgREST. */
export function limpiarBusqueda(q: string): string {
  return q.replace(/[%_*,()\\"'.:]/g, " ").replace(/\s+/g, " ").trim();
}

export function totalPaginas(totalListado: number, porPagina = OFERTAS_POR_PAGINA): number {
  return Math.max(1, Math.ceil(totalListado / porPagina));
}

export function rangoPagina(page: number, porPagina = OFERTAS_POR_PAGINA): { desde: number; hasta: number } {
  const desde = (Math.max(1, Math.floor(page)) - 1) * porPagina;
  return { desde, hasta: desde + porPagina - 1 };
}

export type BuscarOfertasResult = {
  /** Franja de destacadas (solo en la página 1). */
  destacadas: VacanteConEmpresa[];
  /** Listado paginado (sin las vacantes de la franja). */
  items: VacanteConEmpresa[];
  /** Total de ofertas que cumplen los filtros (franja + listado). */
  total: number;
  page: number;
  totalPaginas: number;
};

export async function buscarOfertas(f: FiltrosOfertas): Promise<BuscarOfertasResult> {
  const admin = createAdminClient();
  const ahora = new Date().toISOString();
  const termino = limpiarBusqueda(f.q);

  const base = (opts?: { count: "exact" }) => {
    let query = admin
      .from("vacantes")
      .select(`*, empresa:empresas(${SELECT_EMPRESA_PUBLICA})`, opts)
      .eq("es_publica", true)
      .gt("expira_en", ahora);
    if (f.ciudad) query = query.eq("ciudad", f.ciudad);
    if (f.area) query = query.eq("area", f.area);
    if (f.tipo) query = query.eq("tipo", f.tipo);
    if (f.modalidad) query = query.eq("modalidad", f.modalidad);
    if (termino) query = query.or(`titulo.ilike.%${termino}%,descripcion.ilike.%${termino}%`);
    return query;
  };

  const { data: dataDestacadas } = await base()
    .gt("destacada_hasta", ahora)
    .order("publicada_en", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .limit(MAX_DESTACADAS_FRANJA);
  const franja = (dataDestacadas ?? []) as unknown as VacanteConEmpresa[];

  const page = Math.max(1, f.page);
  const { desde, hasta } = rangoPagina(page);
  let listado = base({ count: "exact" });
  if (franja.length) listado = listado.not("id", "in", `(${franja.map((v) => v.id).join(",")})`);
  const { data, count } = await listado
    .order("publicada_en", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(desde, hasta);

  const totalListado = count ?? 0;
  return {
    destacadas: page === 1 ? franja : [],
    items: (data ?? []) as unknown as VacanteConEmpresa[],
    total: totalListado + franja.length,
    page,
    totalPaginas: totalPaginas(totalListado),
  };
}

/** Postulación del candidato a una vacante (para la ficha). */
export async function getPostulacionPropia(
  candidatoId: string,
  vacanteId: string,
): Promise<{ id: string; estado: EstadoPostulacion } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select("id, estado")
    .eq("candidato_id", candidatoId)
    .eq("vacante_id", vacanteId)
    .maybeSingle();
  return (data as { id: string; estado: EstadoPostulacion } | null) ?? null;
}

/** Vacantes publicadas y vigentes para el sitemap. */
export async function getVacantesParaSitemap(limite = 5000): Promise<{ id: string; actualizada_en: string }[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vacantes")
    .select("id, actualizada_en")
    .eq("es_publica", true)
    .gt("expira_en", new Date().toISOString())
    .order("publicada_en", { ascending: false })
    .limit(limite);
  return (data ?? []) as { id: string; actualizada_en: string }[];
}
