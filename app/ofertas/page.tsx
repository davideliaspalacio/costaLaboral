import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, Compass, MapPin, Briefcase, X, ArrowRight, ArrowLeft } from "lucide-react";
import { buscarOfertas, OFERTAS_POR_PAGINA } from "@/lib/data/ofertas";
import { VacanteCard } from "@/components/vacante/vacante-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { AREAS, CIUDADES, MODALIDADES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";

const labelArea = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;
const labelModalidad = (v: string) => MODALIDADES.find((m) => m.value === v)?.label ?? v;

/** Toma un valor de searchParams (posible string[]) y devuelve el primero. */
function primer(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

type OfertasSearchParams = {
  q?: string | string[];
  ciudad?: string | string[];
  area?: string | string[];
  modalidad?: string | string[];
  page?: string | string[];
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<OfertasSearchParams>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = primer(sp.q);
  if (q) {
    return buildMetadata({
      title: `Búsqueda: ${q} · Ofertas`,
      description: `Resultados de "${q}" en las ofertas de empleo del Caribe colombiano.`,
      path: "/ofertas",
      noindex: true,
    });
  }
  const area = AREAS.find((a) => a.value === primer(sp.area))?.label;
  const ciudadVal = CIUDADES.includes(primer(sp.ciudad) as (typeof CIUDADES)[number]) ? primer(sp.ciudad) : "";
  const modVal = MODALIDADES.find((m) => m.value === primer(sp.modalidad))?.value;

  const t = ["Empleos"];
  if (area) t.push(`de ${area}`);
  t.push(ciudadVal ? `en ${ciudadVal}` : "en la Costa");
  const description = `Vacantes ${area ? `de ${area} ` : ""}${ciudadVal ? `en ${ciudadVal}` : "en el Caribe colombiano"}, actualizadas y gratis. Postúlate por WhatsApp en CostaLaboral.`;

  const qs = new URLSearchParams();
  if (area) qs.set("area", primer(sp.area));
  if (ciudadVal) qs.set("ciudad", ciudadVal);
  if (modVal) qs.set("modalidad", modVal);
  const path = qs.toString() ? `/ofertas?${qs.toString()}` : "/ofertas";

  return buildMetadata({ title: t.join(" "), description, path, image: "/opengraph-image" });
}

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<OfertasSearchParams>;
}) {
  const sp = await searchParams;
  const q = primer(sp.q);
  const ciudad = CIUDADES.includes(primer(sp.ciudad) as (typeof CIUDADES)[number])
    ? primer(sp.ciudad)
    : "";
  const area = AREAS.some((a) => a.value === primer(sp.area)) ? primer(sp.area) : "";
  const modalidad = MODALIDADES.some((m) => m.value === primer(sp.modalidad))
    ? primer(sp.modalidad)
    : "";
  const page = Math.max(1, Number.parseInt(primer(sp.page), 10) || 1);

  const { items, total } = await buscarOfertas({ q, ciudad, area, modalidad, page });

  const totalPaginas = Math.max(1, Math.ceil(total / OFERTAS_POR_PAGINA));
  const hayFiltros = Boolean(q || ciudad || area || modalidad);

  // Construye un querystring conservando los filtros vigentes y sobre-escribiendo `page`.
  const hrefPagina = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (ciudad) params.set("ciudad", ciudad);
    if (area) params.set("area", area);
    if (modalidad) params.set("modalidad", modalidad);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/ofertas?${qs}` : "/ofertas";
  };

  return (
    <>
      {/* ---------- Encabezado + buscador ---------- */}
      <section className="border-b-2 border-ink bg-sol-300">
        <div className="container-page py-12 sm:py-14">
          <span className="kicker bg-surface">
            <Compass className="h-3.5 w-3.5" /> Vitrina de empleo · toda la Costa
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[0.95] text-ink sm:text-5xl">
            Todas las ofertas de la Costa
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-medium text-ink-soft">
            Léelas todas a tu ritmo. Busca por palabra clave o filtra por ciudad, área y modalidad
            para encontrar el camello que va contigo.
          </p>

          {/* Formulario de búsqueda (GET, sin JS) */}
          <form
            method="GET"
            action="/ofertas"
            className="mt-8 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[var(--shadow-sticker)] sm:p-5"
          >
            <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
              <label className="relative block">
                <span className="sr-only">Buscar por palabra clave</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="Cargo, palabra clave…"
                  className="input-base pl-11"
                  aria-label="Buscar por palabra clave"
                />
              </label>

              <label className="block">
                <span className="sr-only">Ciudad</span>
                <select
                  name="ciudad"
                  defaultValue={ciudad}
                  aria-label="Filtrar por ciudad"
                  className="input-base appearance-none bg-[right_1rem_center] pr-10"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <option value="">Toda la Costa</option>
                  {CIUDADES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">Área</span>
                <select
                  name="area"
                  defaultValue={area}
                  aria-label="Filtrar por área"
                  className="input-base appearance-none bg-[right_1rem_center] pr-10"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <option value="">Todas las áreas</option>
                  {AREAS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">Modalidad</span>
                <select
                  name="modalidad"
                  defaultValue={modalidad}
                  aria-label="Filtrar por modalidad"
                  className="input-base appearance-none bg-[right_1rem_center] pr-10"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <option value="">Cualquier modalidad</option>
                  {MODALIDADES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <button type="submit" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                <Search className="h-5 w-5" /> Buscar
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ---------- Resultados ---------- */}
      <section className="container-page py-10 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-semibold text-ink-soft">
            {total === 0
              ? "Sin resultados"
              : `${total} ${total === 1 ? "oferta" : "ofertas"} encontradas`}
            {totalPaginas > 1 && (
              <span className="text-muted">
                {" "}
                · página {page} de {totalPaginas}
              </span>
            )}
          </p>

          {/* Chips de filtros activos */}
          {hayFiltros && (
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted" />
              {q && <ChipFiltro label={`"${q}"`} href={quitarFiltro({ q, ciudad, area, modalidad }, "q")} />}
              {ciudad && (
                <ChipFiltro
                  label={ciudad}
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  href={quitarFiltro({ q, ciudad, area, modalidad }, "ciudad")}
                />
              )}
              {area && (
                <ChipFiltro
                  label={labelArea(area)}
                  href={quitarFiltro({ q, ciudad, area, modalidad }, "area")}
                />
              )}
              {modalidad && (
                <ChipFiltro
                  label={labelModalidad(modalidad)}
                  icon={<Briefcase className="h-3.5 w-3.5" />}
                  href={quitarFiltro({ q, ciudad, area, modalidad }, "modalidad")}
                />
              )}
              <Link
                href="/ofertas"
                className="text-xs font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                Limpiar todo
              </Link>
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((v) => (
                <VacanteCard key={v.id} vacante={v} empresaNombre={v.empresa?.nombre_negocio} />
              ))}
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <nav
                aria-label="Paginación de ofertas"
                className="mt-10 flex items-center justify-between gap-3"
              >
                {page > 1 ? (
                  <Link href={hrefPagina(page - 1)} className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
                    <ArrowLeft className="h-4 w-4" /> Anteriores
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-sm font-semibold text-muted">
                  Página {page} de {totalPaginas}
                </span>
                {page < totalPaginas ? (
                  <Link href={hrefPagina(page + 1)} className={cn(buttonVariants({ variant: "outline", size: "md" }))}>
                    Siguientes <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </>
        ) : (
          <div className="mt-8">
            <EmptyState
              icon={<Compass className="h-6 w-6" />}
              title={hayFiltros ? "No hay ofertas con esos filtros" : "Todavía no hay ofertas"}
              description={
                hayFiltros
                  ? "Prueba con menos filtros o cambia la palabra clave. También puedes registrarte y recibir por WhatsApp las que encajan contigo."
                  : "Aún no se han publicado vacantes. Regístrate y te avisamos apenas llegue una que vaya contigo."
              }
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  {hayFiltros && (
                    <Link href="/ofertas" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                      Ver todas las ofertas
                    </Link>
                  )}
                  <Link
                    href="/registro-candidato"
                    className={cn(buttonVariants({ variant: hayFiltros ? "outline" : "primary", size: "lg" }))}
                  >
                    Registrarme gratis
                  </Link>
                </div>
              }
            />
          </div>
        )}
      </section>
    </>
  );
}

/** Devuelve el href de /ofertas quitando un filtro concreto (mantiene los demás). */
function quitarFiltro(
  filtros: { q: string; ciudad: string; area: string; modalidad: string },
  quitar: "q" | "ciudad" | "area" | "modalidad",
): string {
  const params = new URLSearchParams();
  (["q", "ciudad", "area", "modalidad"] as const).forEach((k) => {
    if (k !== quitar && filtros[k]) params.set(k, filtros[k]);
  });
  const qs = params.toString();
  return qs ? `/ofertas?${qs}` : "/ofertas";
}

function ChipFiltro({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-surface px-3 py-1 text-xs font-bold text-ink transition hover:bg-sol-300"
    >
      {icon}
      {label}
      <X className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">Quitar filtro</span>
    </Link>
  );
}
