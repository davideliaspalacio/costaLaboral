import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { labelEvento } from "@/components/admin/labels";
import type { EventoPorTipo, PuntoSerie } from "@/lib/data/admin";

/** Desglose de eventos por tipo con barras horizontales (color plano, sin gradiente). */
export function EventosPorTipoChart({ datos }: { datos: EventoPorTipo[] }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">Eventos por tipo</h2>
          <p className="text-sm text-ink-soft">Actividad de los últimos 14 días.</p>
        </div>
        {datos.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay eventos registrados.</p>
        ) : (
          <ul className="space-y-2.5">
            {datos.map((d) => (
              <li key={d.tipo} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">{labelEvento(d.tipo)}</span>
                  <span className="text-muted tabular-nums">{d.total}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-canvas">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: `${Math.round((d.total / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/** Mini gráfico de barras: eventos por día en los últimos 14 días. */
export function SerieDiariaChart({ datos }: { datos: PuntoSerie[] }) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  const totalPeriodo = datos.reduce((s, d) => s + d.total, 0);
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Eventos por día</h2>
            <p className="text-sm text-ink-soft">Últimos 14 días.</p>
          </div>
          <span className="text-2xl font-extrabold text-ink tabular-nums">{totalPeriodo}</span>
        </div>
        <div className="flex h-32 items-end gap-1.5">
          {datos.map((d) => {
            const alto = d.total === 0 ? 2 : Math.max(6, Math.round((d.total / max) * 100));
            const dia = new Date(`${d.fecha}T00:00:00`).getDate();
            return (
              <div key={d.fecha} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "w-full rounded-t border-2 border-ink",
                      d.total === 0 ? "bg-line" : "bg-sol-400",
                    )}
                    style={{ height: `${alto}%` }}
                    title={`${d.fecha}: ${d.total} eventos`}
                  />
                </div>
                <span className="text-[10px] text-muted tabular-nums">{dia}</span>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
