import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatearKpi, textoMeta, type KpiResultado, type Semaforo } from "@/lib/data/kpis";

export const SEMAFORO_INFO: Record<Semaforo, { label: string; punto: string; chip: string }> = {
  verde: { label: "En meta", punto: "bg-success-500", chip: "bg-success-50 text-success-600" },
  amarillo: { label: "Cerca", punto: "bg-sol-400", chip: "bg-sol-100 text-ink" },
  rojo: { label: "Bajo meta", punto: "bg-danger-500", chip: "bg-danger-50 text-danger-600" },
  sin_datos: { label: "Sin datos", punto: "bg-line", chip: "bg-surface text-muted" },
};

export function SemaforoChip({ semaforo }: { semaforo: Semaforo }) {
  const s = SEMAFORO_INFO[semaforo];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold", s.chip)}>
      <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full border border-ink", s.punto)} />
      {s.label}
    </span>
  );
}

/** Tarjeta de KPI: valor, meta, semáforo y definición del cálculo. */
export function KpiCard({ kpi }: { kpi: KpiResultado }) {
  return (
    <Card className={cn(kpi.semaforo === "rojo" && "shadow-[var(--shadow-sticker)]")}>
      <CardBody className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-bold leading-snug text-ink">{kpi.nombre}</h2>
          <SemaforoChip semaforo={kpi.semaforo} />
        </div>
        <div className="flex items-end justify-between gap-3">
          <p className="font-display text-4xl font-extrabold tracking-tight text-ink tabular-nums">
            {formatearKpi(kpi.valor, kpi.formato)}
          </p>
          <p className="text-right text-xs font-semibold text-muted">
            Meta <span className="text-ink tabular-nums">{textoMeta(kpi.meta, kpi.formato)}</span>
          </p>
        </div>
        {kpi.formato === "pct" && kpi.den != null && kpi.den > 0 && (
          <p className="text-xs text-ink-soft tabular-nums">
            {kpi.num?.toLocaleString("es-CO")} de {kpi.den.toLocaleString("es-CO")}
          </p>
        )}
        {kpi.nota && <p className="text-xs text-ink-soft">{kpi.nota}</p>}
        <details className="mt-auto rounded-xl border-2 border-line bg-canvas px-3 py-2 text-xs text-ink-soft">
          <summary className="cursor-pointer font-bold text-ink">Cómo se calcula</summary>
          <p className="mt-2 leading-relaxed">{kpi.definicion}</p>
        </details>
      </CardBody>
    </Card>
  );
}
