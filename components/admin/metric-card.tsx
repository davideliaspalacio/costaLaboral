import * as React from "react";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  icon: React.ReactNode;
  label: string;
  /** Valor grande a mostrar (ya formateado). */
  valor: string;
  /** Valor numérico crudo para calcular el progreso hacia la meta. */
  valorNumerico?: number;
  /** Meta a 90 días (sección 7.1). */
  meta?: number;
  /** Objetivo a 30 días, para contexto. */
  metaCorta?: number;
  /** Sufijo para la meta, ej. "%", "x". */
  sufijo?: string;
};

/** Tarjeta de métrica del panel interno: número grande + label + progreso a la meta. */
export function MetricCard({
  icon,
  label,
  valor,
  valorNumerico,
  meta,
  metaCorta,
  sufijo = "",
}: MetricCardProps) {
  const tieneMeta = meta != null && valorNumerico != null && meta > 0;
  const pct = tieneMeta ? Math.min(100, Math.round((valorNumerico! / meta!) * 100)) : 0;
  const cumplida = tieneMeta && valorNumerico! >= meta!;

  return (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            {icon}
          </span>
          {tieneMeta && (
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                cumplida ? "text-success-600" : "text-muted",
              )}
            >
              {pct}%
            </span>
          )}
        </div>

        <div>
          <p className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">{valor}</p>
          <p className="mt-1 text-sm font-medium text-ink-soft">{label}</p>
        </div>

        {tieneMeta && (
          <div className="mt-1 space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-brand-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={valorNumerico}
                aria-valuemin={0}
                aria-valuemax={meta}
                aria-label={`Progreso de ${label} hacia la meta`}
              />
            </div>
            <p className="text-xs text-muted tabular-nums">
              Meta 90 días: {meta}
              {sufijo}
              {metaCorta != null && (
                <span className="text-muted/80">
                  {" · "}30 días: {metaCorta}
                  {sufijo}
                </span>
              )}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
