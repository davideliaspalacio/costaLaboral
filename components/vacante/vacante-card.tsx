import Link from "next/link";
import { MapPin, Briefcase, Clock, FileCheck2, CheckCircle2, BadgeCheck, Star } from "lucide-react";
import { AREAS, MODALIDADES, TIPOS_EMPLEO } from "@/lib/constants";
import { formatSalario, tiempoRelativo, cn } from "@/lib/utils";
import { estaDestacada, esReciente } from "@/lib/vacante";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "@/components/vacante/score-badge";

export type VacanteCardData = {
  id: string;
  titulo: string;
  ciudad: string;
  modalidad: string;
  area: string;
  salario_min: number | null;
  salario_max: number | null;
  tiene_contrato: boolean;
  creado_en: string;
  tipo?: string;
  publicada_en?: string | null;
  destacada_hasta?: string | null;
  empresa?: { nombre_negocio: string; verificada?: boolean } | null;
};

const labelDe = (lista: readonly { value: string; label: string }[], v: string) =>
  lista.find((x) => x.value === v)?.label ?? v;

/**
 * Tarjeta de vacante. La empresa siempre se muestra.
 * `href` debe incluir la fuente (p. ej. `/v/<id>?src=busqueda`); por defecto `/v/<id>`.
 */
export function VacanteCard({
  vacante,
  score,
  empresaNombre,
  yaPostulado,
  href,
  className,
}: {
  vacante: VacanteCardData;
  score?: number;
  empresaNombre?: string | null;
  yaPostulado?: boolean;
  href?: string;
  className?: string;
}) {
  const fecha = vacante.publicada_en ?? vacante.creado_en;
  const esNueva = esReciente(fecha);
  const destacada = estaDestacada({ destacada_hasta: vacante.destacada_hasta ?? null });
  const empresa = empresaNombre ?? vacante.empresa?.nombre_negocio;

  return (
    <Link
      href={href ?? `/v/${vacante.id}`}
      className={cn(
        "group block rounded-2xl border-2 border-ink bg-surface p-5 transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker-lg)]",
        destacada && "bg-sol-100 shadow-[var(--shadow-sticker)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-extrabold text-ink">{vacante.titulo}</h3>
          {empresa && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm font-medium text-muted">
              <span className="truncate">{empresa}</span>
              {vacante.empresa?.verificada && (
                <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="Empresa verificada" />
              )}
            </p>
          )}
        </div>
        {typeof score === "number" && <ScoreBadge score={score} className="shrink-0" />}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-brand-600" /> {vacante.ciudad}
        </span>
        {vacante.tipo && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-brand-600" /> {labelDe(TIPOS_EMPLEO, vacante.tipo)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Briefcase className="h-4 w-4 text-brand-600" /> {labelDe(MODALIDADES, vacante.modalidad)}
        </span>
      </div>

      <p className="mt-3 font-display text-xl font-extrabold text-ink">
        {formatSalario(vacante.salario_min, vacante.salario_max)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {destacada && (
          <Badge tone="sol">
            <Star className="h-3 w-3" /> Destacada
          </Badge>
        )}
        <Badge tone="brand">{labelDe(AREAS, vacante.area)}</Badge>
        {vacante.tiene_contrato && (
          <Badge tone="success">
            <FileCheck2 className="h-3 w-3" /> Con contrato
          </Badge>
        )}
        {esNueva && !destacada && <Badge tone="accent">Nueva</Badge>}
        {yaPostulado && (
          <Badge tone="ink">
            <CheckCircle2 className="h-3 w-3" /> Ya aplicaste
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t-2 border-line pt-3 text-xs font-medium text-muted">
        <span>{tiempoRelativo(fecha)}</span>
        <span className="font-bold text-brand-700 group-hover:underline">Ver vacante →</span>
      </div>
    </Link>
  );
}
