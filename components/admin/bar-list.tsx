import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type BarItem = { clave: string; label: string; valor: number; texto: string; detalle?: string };

/** Lista de barras horizontales (color plano) para desgloses. */
export function BarList({
  titulo,
  descripcion,
  items,
  vacio = "Sin datos en el periodo.",
}: {
  titulo: string;
  descripcion?: string;
  items: BarItem[];
  vacio?: string;
}) {
  const max = Math.max(0, ...items.map((i) => i.valor));
  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">{titulo}</h2>
          {descripcion && <p className="text-sm text-ink-soft">{descripcion}</p>}
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted">{vacio}</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((d) => (
              <li key={d.clave} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-semibold text-ink" title={d.label}>
                    {d.label}
                  </span>
                  <span className="shrink-0 text-ink-soft tabular-nums">{d.texto}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-canvas">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${max > 0 ? Math.round((d.valor / max) * 100) : 0}%` }}
                  />
                </div>
                {d.detalle && <p className="text-xs text-muted">{d.detalle}</p>}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/** Serie diaria en barras verticales. */
export function SerieBarras({
  titulo,
  descripcion,
  total,
  datos,
}: {
  titulo: string;
  descripcion?: string;
  total?: string;
  datos: { fecha: string; valor: number; texto: string }[];
}) {
  const max = Math.max(0, ...datos.map((d) => d.valor));
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">{titulo}</h2>
            {descripcion && <p className="text-sm text-ink-soft">{descripcion}</p>}
          </div>
          {total && <span className="text-2xl font-extrabold text-ink tabular-nums">{total}</span>}
        </div>
        <div className="overflow-x-auto">
          <div className="flex h-36 min-w-[36rem] items-end gap-1">
            {datos.map((d) => {
              const alto = d.valor <= 0 || max <= 0 ? 2 : Math.max(6, Math.round((d.valor / max) * 100));
              return (
                <div key={d.fecha} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={cn("w-full rounded-t border-2 border-ink", d.valor > 0 ? "bg-sol-400" : "bg-line")}
                      style={{ height: `${alto}%` }}
                      title={`${d.fecha}: ${d.texto}`}
                    />
                  </div>
                  <span className="text-[10px] text-muted tabular-nums">{Number(d.fecha.slice(8, 10))}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
