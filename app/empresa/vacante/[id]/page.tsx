import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Filter, GraduationCap, History, Inbox, MapPin, Pencil, Search, UserX } from "lucide-react";
import { getCandidatosDeVacante } from "@/lib/data/vacantes";
import {
  filtrarCandidatos,
  getHistorialDePostulaciones,
  getPostulacionesRetiradas,
  getVacantePropia,
  hayFiltros,
  parseFiltrosPipeline,
  requerirEmpresa,
} from "@/lib/data/empresa";
import { marcarPostulacionesVistas } from "@/lib/actions/empresa";
import { getBeneficiosEmpresa } from "@/lib/billing/suscripciones";
import { CIUDADES, ESTADOS_PIPELINE_EMPRESA, NIVELES_EDUCATIVOS, estadoPostulacionInfo } from "@/lib/constants";
import { tiempoRelativo, waLink } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreBadge } from "@/components/vacante/score-badge";
import type { CandidatoMatch, PostulacionHistorial, Vacante } from "@/lib/types";
import { UpsellPro } from "../../_components/upsell-pro";
import { LABEL_FUENTE, MODERACION, fechaHora, labelDisponibilidad, labelEstadoVacante, labelNivel } from "../../_components/etiquetas";
import { EstadoPostulacion } from "./estado-postulacion";
import { BotonWhatsapp } from "./boton-whatsapp";
import { DetalleMatchLista } from "./detalle-match";

export const metadata: Metadata = { title: "Postulados" };

export default async function PipelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const empresa = await requerirEmpresa(`/empresa/vacante/${id}`);
  const vacante = await getVacantePropia(empresa.id, id);
  if (!vacante) notFound();

  // Abrir el pipeline marca enviada → vista (historial + auditoría).
  await marcarPostulacionesVistas(vacante.id);

  const [candidatos, retiradas, { beneficios }, sp] = await Promise.all([
    getCandidatosDeVacante(vacante),
    getPostulacionesRetiradas(vacante),
    getBeneficiosEmpresa(empresa.id),
    searchParams,
  ]);
  const historial = await getHistorialDePostulaciones([...candidatos, ...retiradas].map((c) => c.postulacion.id));

  const pro = beneficios.filtrosPipeline;
  const filtros = pro ? parseFiltrosPipeline(sp) : parseFiltrosPipeline({});
  const lista = filtrarCandidatos(candidatos, filtros);
  const qs = new URLSearchParams();
  if (filtros.scoreMin != null) qs.set("score", String(filtros.scoreMin));
  if (filtros.estado) qs.set("estado", filtros.estado);
  if (filtros.nivel) qs.set("nivel", filtros.nivel);
  if (filtros.ciudad) qs.set("ciudad", filtros.ciudad);
  const exportHref = `/api/empresa/export/${vacante.id}${qs.size ? `?${qs}` : ""}`;
  const mod = MODERACION[vacante.estado_moderacion];

  return (
    <div className="container-page py-8 sm:py-12">
      <Link href="/empresa/panel" className={`${buttonVariants({ variant: "ghost", size: "sm" })} -ml-3 mb-4`}>
        <ArrowLeft className="h-4 w-4" /> Volver al panel
      </Link>

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="kicker">Pipeline de postulados</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">{vacante.titulo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <Badge tone="outline">{labelEstadoVacante(vacante.estado)}</Badge>
            {vacante.estado_moderacion !== "aprobada" && mod && <Badge tone={mod.tono}>{mod.label}</Badge>}
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted" /> {vacante.ciudad}
            </span>
            <span className="tabular-nums">
              · {candidatos.length} activos · {vacante.vistas} vistas
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/empresa/vacante/${vacante.id}/editar`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Pencil className="h-4 w-4" /> Editar
          </Link>
          {beneficios.accesoAmpliado ? (
            <Link href={`/empresa/vacante/${vacante.id}/sugeridos`} className={buttonVariants({ variant: "brand", size: "sm" })}>
              <Search className="h-4 w-4" /> Candidatos sugeridos
            </Link>
          ) : null}
        </div>
      </header>

      <FiltrosPipeline vacante={vacante} pro={pro} filtros={filtros} exportHref={exportHref} exportar={beneficios.exportarCsv} />

      {!beneficios.accesoAmpliado && (
        <UpsellPro
          className="mb-6"
          titulo="Encuentra candidatos que aún no se postulan"
          descripcion="Con Empresa Pro ves perfiles que encajan (anonimizados) y los invitas a postularse por WhatsApp."
        />
      )}

      {candidatos.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          title="Aún nadie se ha postulado"
          description={
            vacante.es_publica
              ? "Compartimos tu vacante con las personas que encajan. Las postulaciones llegan aquí ordenadas por match."
              : "La vacante no está visible en el portal todavía. Cuando se publique y apruebe, empezarán a llegar postulaciones."
          }
        />
      ) : lista.length === 0 ? (
        <EmptyState icon={<Filter className="h-6 w-6" />} title="Nadie cumple los filtros" description="Prueba con filtros menos estrictos." />
      ) : (
        <ol className="space-y-4">
          {lista.map((c, i) => (
            <li key={c.postulacion.id}>
              <TarjetaCandidato c={c} posicion={i + 1} vacante={vacante} historial={historial.get(c.postulacion.id) ?? []} />
            </li>
          ))}
        </ol>
      )}

      {retiradas.length > 0 && (
        <details className="card mt-10 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center gap-2 p-5 font-bold text-ink">
            <UserX className="h-5 w-5 text-muted" /> Postulaciones retiradas ({retiradas.length})
          </summary>
          <ul className="space-y-2 border-t-2 border-ink p-5">
            {retiradas.map((c) => (
              <li key={c.postulacion.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
                <span>
                  <strong className="text-ink">{c.candidato.nombre}</strong> · {c.candidato.ciudad} · {c.score}% match
                </span>
                <span className="text-muted">Retirada {tiempoRelativo(c.postulacion.estado_actualizado_en)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function FiltrosPipeline({
  vacante,
  pro,
  filtros,
  exportHref,
  exportar,
}: {
  vacante: Vacante;
  pro: boolean;
  filtros: ReturnType<typeof parseFiltrosPipeline>;
  exportHref: string;
  exportar: boolean;
}) {
  return (
    <section aria-label="Filtros" className="mb-6 space-y-3">
      <form method="get" action={`/empresa/vacante/${vacante.id}`} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
        <fieldset disabled={!pro} className="grid flex-1 gap-3 disabled:opacity-60 sm:grid-cols-2 lg:grid-cols-4">
          <legend className="sr-only">Filtrar postulados</legend>
          <label className="text-sm">
            <span className="label-base">Score mínimo</span>
            <Select name="score" defaultValue={filtros.scoreMin?.toString() ?? ""} className="h-11 py-0 text-sm">
              <option value="">Todos</option>
              <option value="40">40% o más</option>
              <option value="60">60% o más</option>
              <option value="80">80% o más</option>
            </Select>
          </label>
          <label className="text-sm">
            <span className="label-base">Estado</span>
            <Select name="estado" defaultValue={filtros.estado ?? ""} className="h-11 py-0 text-sm">
              <option value="">Todos</option>
              {ESTADOS_PIPELINE_EMPRESA.map((e) => (
                <option key={e} value={e}>
                  {estadoPostulacionInfo(e).label}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm">
            <span className="label-base">Nivel</span>
            <Select name="nivel" defaultValue={filtros.nivel ?? ""} className="h-11 py-0 text-sm">
              <option value="">Todos</option>
              {NIVELES_EDUCATIVOS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-sm">
            <span className="label-base">Ciudad</span>
            <Select name="ciudad" defaultValue={filtros.ciudad ?? ""} className="h-11 py-0 text-sm">
              <option value="">Todas</option>
              {CIUDADES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="md" disabled={!pro}>
            <Filter className="h-4 w-4" /> Filtrar
          </Button>
          {pro && hayFiltros(filtros) && (
            <Link href={`/empresa/vacante/${vacante.id}`} className={buttonVariants({ variant: "ghost", size: "md" })}>
              Limpiar
            </Link>
          )}
          {exportar ? (
            <a href={exportHref} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Download className="h-4 w-4" /> Exportar CSV
            </a>
          ) : (
            <Button type="button" variant="outline" size="md" disabled title="Disponible en Empresa Pro">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          )}
        </div>
      </form>
      {!pro && (
        <UpsellPro titulo="Filtros y exportación" descripcion="Filtra por score, estado, nivel y ciudad, y descarga tus postulados en CSV." />
      )}
    </section>
  );
}

function TarjetaCandidato({
  c,
  posicion,
  vacante,
  historial,
}: {
  c: CandidatoMatch;
  posicion: number;
  vacante: Vacante;
  historial: PostulacionHistorial[];
}) {
  const info = estadoPostulacionInfo(c.postulacion.estado);
  const fuente = c.postulacion.fuente ? LABEL_FUENTE[c.postulacion.fuente] : null;
  return (
    <article className="card-pop p-5 sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg border-2 border-ink bg-sol-300 text-sm font-extrabold tabular-nums">
              {posicion}
            </span>
            <h2 className="font-display text-lg font-extrabold text-ink">{c.candidato.nombre}</h2>
            <ScoreBadge score={c.score} />
            <Badge tone={info.tono}>{info.label}</Badge>
          </div>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted" /> {c.candidato.ciudad}
            </span>
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="h-4 w-4 text-muted" /> {labelNivel(c.candidato.nivel_educativo)}
            </span>
            <span>Inicio: {labelDisponibilidad(c.candidato.disponibilidad)}</span>
            <span className="text-muted">
              Se postuló {tiempoRelativo(c.postulacion.creado_en)}
              {fuente ? ` · vía ${fuente}` : ""}
            </span>
          </p>

          <DetalleMatchLista detalle={c.detalle} />

          <div className="text-sm text-ink-soft">
            <p className="font-bold text-ink">Experiencia</p>
            <p className="whitespace-pre-line">
              {c.candidato.experiencia?.trim() || <span className="italic text-muted">Sin experiencia registrada</span>}
            </p>
          </div>

          {c.postulacion.mensaje && (
            <blockquote className="rounded-xl border-2 border-ink bg-brand-50 px-4 py-2 text-sm text-brand-800">
              “{c.postulacion.mensaje}”
            </blockquote>
          )}

          {historial.length > 0 && (
            <details className="text-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-semibold text-ink-soft hover:text-ink">
                <History className="h-4 w-4" /> Historial ({historial.length})
              </summary>
              <ol className="mt-2 space-y-1 border-l-2 border-ink pl-4">
                {historial.map((h) => (
                  <li key={h.id} className="text-ink-soft">
                    <span className="font-semibold text-ink">{estadoPostulacionInfo(h.estado_nuevo).label}</span> ·{" "}
                    {h.actor_tipo === "empresa" ? "tu equipo" : h.actor_tipo} · {fechaHora(h.creado_en)}
                    {h.nota && <span className="block italic">“{h.nota}”</span>}
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 md:items-end">
          <BotonWhatsapp
            postulacionId={c.postulacion.id}
            href={waLink(
              c.candidato.whatsapp,
              `Hola ${c.candidato.nombre.split(" ")[0]}, te escribimos por tu postulación a la vacante de ${vacante.titulo} en CostaLaboral.`,
            )}
          />
          <EstadoPostulacion postulacionId={c.postulacion.id} estado={c.postulacion.estado} />
        </div>
      </div>
    </article>
  );
}
