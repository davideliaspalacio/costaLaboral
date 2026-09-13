import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, Compass, MapPin, Briefcase, Clock, X, ArrowRight, ArrowLeft, Star } from "lucide-react";
import {
  buscarOfertas,
  hrefOfertas,
  parsearFiltrosOfertas,
  type ClaveFiltro,
  type FiltrosOfertas,
} from "@/lib/data/ofertas";
import { VacanteCard } from "@/components/vacante/vacante-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { AREAS, CIUDADES, MODALIDADES, TIPOS_EMPLEO } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buildMetadata } from "@/lib/seo";

type OfertasSearchParams = Promise<Record<string, string | string[] | undefined>>;

const labelDe = (lista: readonly { value: string; label: string }[], v: string) =>
  lista.find((x) => x.value === v)?.label ?? v;

const hrefFicha = (id: string) => `/v/${id}?src=busqueda`;

export async function generateMetadata({ searchParams }: { searchParams: OfertasSearchParams }): Promise<Metadata> {
  const f = parsearFiltrosOfertas(await searchParams);
  if (f.q) {
    return buildMetadata({
      title: `Búsqueda: ${f.q} · Ofertas`,
      description: `Resultados de "${f.q}" en las ofertas de empleo del Caribe colombiano.`,
      path: "/ofertas",
      noindex: true,
    });
  }
  const area = f.area ? labelDe(AREAS, f.area) : "";
  const t = ["Empleos"];
  if (area) t.push(`de ${area}`);
  t.push(f.ciudad ? `en ${f.ciudad}` : "en la Costa");
  const description = `Vacantes ${area ? `de ${area} ` : ""}${f.ciudad ? `en ${f.ciudad}` : "en el Caribe colombiano"} con empresa y salario visibles. Postúlate gratis en CostaLaboral.`;
  return buildMetadata({
    title: t.join(" "),
    description,
    path: hrefOfertas({ ...f, q: "" }),
    image: "/opengraph-image",
  });
}

export default async function OfertasPage({ searchParams }: { searchParams: OfertasSearchParams }) {
  const filtros = parsearFiltrosOfertas(await searchParams);
  const { q, ciudad, area, tipo, modalidad } = filtros;
  const { destacadas, items, total, page, totalPaginas } = await buscarOfertas(filtros);
  const hayFiltros = Boolean(q || ciudad || area || tipo || modalidad);
  const hayResultados = destacadas.length > 0 || items.length > 0;

  return (
    <>
      {/* ---------- Encabezado + buscador ---------- */}
      <section className="border-b-2 border-ink bg-sol-300">
        <div className="container-page py-12 sm:py-14">
          <span className="kicker bg-surface">
            <Compass className="h-3.5 w-3.5" /> Barranquilla · Cartagena · Santa Marta
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[0.95] text-ink sm:text-5xl">
            Ofertas de empleo en la Costa
          </h1>
          <p className="mt-4 max-w-2xl text-lg font-medium text-ink-soft">
            Todas abiertas: ves la empresa, el salario y los requisitos. Postularte es gratis.
          </p>

          {/* Formulario de búsqueda (GET, sin JS): los filtros viven en la URL */}
          <form
            method="GET"
            action="/ofertas"
            className="mt-8 rounded-2xl border-2 border-ink bg-surface p-4 shadow-[var(--shadow-sticker)] sm:p-5"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr_auto]">
              <label className="relative block sm:col-span-2 lg:col-span-1">
                <span className="sr-only">Buscar por palabra clave</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  name="q"
                  defaultValue={q}
                  maxLength={80}
                  placeholder="Cargo, palabra clave…"
                  className="input-base pl-11"
                />
              </label>

              <Select name="ciudad" defaultValue={ciudad} aria-label="Filtrar por ciudad">
                <option value="">Toda la Costa</option>
                {CIUDADES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>

              <Select name="area" defaultValue={area} aria-label="Filtrar por área">
                <option value="">Todas las áreas</option>
                {AREAS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>

              <Select name="tipo" defaultValue={tipo} aria-label="Filtrar por tipo de empleo">
                <option value="">Cualquier jornada</option>
                {TIPOS_EMPLEO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>

              <Select name="modalidad" defaultValue={modalidad} aria-label="Filtrar por modalidad">
                <option value="">Cualquier modalidad</option>
                {MODALIDADES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>

              <button type="submit" className={cn(buttonVariants({ variant: "primary", size: "lg" }), "sm:col-span-2 lg:col-span-1")}>
                <Search className="h-5 w-5" /> Buscar
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ---------- Resultados ---------- */}
      <section className="container-page py-10 sm:py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-semibold text-ink-soft" aria-live="polite">
            {total === 0 ? "Sin resultados" : `${total} ${total === 1 ? "oferta" : "ofertas"}`}
            {totalPaginas > 1 && (
              <span className="text-muted">
                {" "}
                · página {page} de {totalPaginas}
              </span>
            )}
          </p>

          {hayFiltros && (
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted" />
              {q && <ChipFiltro label={`"${q}"`} href={quitar(filtros, "q")} />}
              {ciudad && (
                <ChipFiltro label={ciudad} icon={<MapPin className="h-3.5 w-3.5" />} href={quitar(filtros, "ciudad")} />
              )}
              {area && <ChipFiltro label={labelDe(AREAS, area)} href={quitar(filtros, "area")} />}
              {tipo && (
                <ChipFiltro
                  label={labelDe(TIPOS_EMPLEO, tipo)}
                  icon={<Clock className="h-3.5 w-3.5" />}
                  href={quitar(filtros, "tipo")}
                />
              )}
              {modalidad && (
                <ChipFiltro
                  label={labelDe(MODALIDADES, modalidad)}
                  icon={<Briefcase className="h-3.5 w-3.5" />}
                  href={quitar(filtros, "modalidad")}
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

        {hayResultados ? (
          <>
            {destacadas.length > 0 && (
              <div className="mt-8 rounded-2xl border-2 border-ink bg-sol-100 p-4 sm:p-5">
                <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                  <Star className="h-5 w-5" /> Destacadas
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {destacadas.map((v) => (
                    <VacanteCard key={v.id} vacante={v} href={hrefFicha(v.id)} />
                  ))}
                </div>
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((v) => (
                  <VacanteCard key={v.id} vacante={v} href={hrefFicha(v.id)} />
                ))}
              </div>
            )}

            {totalPaginas > 1 && (
              <nav aria-label="Paginación de ofertas" className="mt-10 flex items-center justify-between gap-3">
                {page > 1 ? (
                  <Link href={hrefOfertas(filtros, { page: page - 1 })} className={buttonVariants({ variant: "outline" })}>
                    <ArrowLeft className="h-4 w-4" /> Anteriores
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-sm font-semibold text-muted">
                  Página {page} de {totalPaginas}
                </span>
                {page < totalPaginas ? (
                  <Link href={hrefOfertas(filtros, { page: page + 1 })} className={buttonVariants({ variant: "outline" })}>
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
              title={page > 1 ? "No hay más ofertas" : hayFiltros ? "No hay ofertas con esos filtros" : "Todavía no hay ofertas"}
              description={
                hayFiltros
                  ? "Prueba con menos filtros o cambia la palabra clave."
                  : "Aún no hay vacantes publicadas. Crea tu perfil y te mostramos las que encajan contigo apenas lleguen."
              }
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  {(hayFiltros || page > 1) && (
                    <Link href="/ofertas" className={buttonVariants({ variant: "primary", size: "lg" })}>
                      Ver todas las ofertas
                    </Link>
                  )}
                  <Link
                    href="/registro-candidato"
                    className={buttonVariants({ variant: hayFiltros ? "outline" : "primary", size: "lg" })}
                  >
                    Crear mi perfil gratis
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

function quitar(filtros: FiltrosOfertas, clave: ClaveFiltro): string {
  return hrefOfertas(filtros, { [clave]: "" });
}

function ChipFiltro({ label, href, icon }: { label: string; href: string; icon?: React.ReactNode }) {
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
