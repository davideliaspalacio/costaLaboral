import Link from "next/link";
import { MapPin, Briefcase, FileCheck2, CheckCircle2 } from "lucide-react";
import { AREAS, MODALIDADES } from "@/lib/constants";
import { formatSalario, tiempoRelativo, cn } from "@/lib/utils";
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
};

const labelArea = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;
const labelModalidad = (v: string) => MODALIDADES.find((m) => m.value === v)?.label ?? v;

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
  const esNueva = Date.now() - new Date(vacante.creado_en).getTime() < 3 * 86_400_000;
  return (
    <Link
      href={href ?? `/v/${vacante.id}`}
      className={cn(
        "group block rounded-2xl border-2 border-ink bg-surface p-5 transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker-lg)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-display text-lg font-extrabold text-ink">{vacante.titulo}</h3>
          <p className="mt-0.5 truncate text-sm font-medium text-muted">
            {empresaNombre ?? "Empresa confidencial"}
          </p>
        </div>
        {typeof score === "number" && <ScoreBadge score={score} className="shrink-0" />}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-brand-600" /> {vacante.ciudad}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Briefcase className="h-4 w-4 text-brand-600" /> {labelModalidad(vacante.modalidad)}
        </span>
      </div>

      <p className="mt-3 font-display text-xl font-extrabold text-ink">
        {formatSalario(vacante.salario_min, vacante.salario_max)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{labelArea(vacante.area)}</Badge>
        {vacante.tiene_contrato && (
          <Badge tone="success">
            <FileCheck2 className="h-3 w-3" /> Con contrato
          </Badge>
        )}
        {esNueva && <Badge tone="sol">Nueva</Badge>}
        {yaPostulado && (
          <Badge tone="ink">
            <CheckCircle2 className="h-3 w-3" /> Ya aplicaste
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t-2 border-line pt-3 text-xs font-medium text-muted">
        <span>{tiempoRelativo(vacante.creado_en)}</span>
        <span className="font-bold text-brand-700 group-hover:underline">Ver vacante →</span>
      </div>
    </Link>
  );
}
