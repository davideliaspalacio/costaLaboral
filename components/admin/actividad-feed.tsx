import { Badge } from "@/components/ui/badge";
import { tiempoRelativo } from "@/lib/utils";
import { labelEvento, EVENTO_TONO, resumenMeta } from "@/components/admin/labels";
import type { EventoRow } from "@/lib/data/admin";

/** Feed compacto de eventos recientes (para el resumen). */
export function ActividadFeed({ eventos }: { eventos: EventoRow[] }) {
  if (eventos.length === 0) {
    return <p className="p-6 text-sm text-muted">Todavía no hay actividad registrada.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {eventos.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Badge tone={EVENTO_TONO[e.tipo] ?? "neutral"} className="shrink-0">
              {labelEvento(e.tipo)}
            </Badge>
            <span className="truncate text-sm text-ink-soft">{resumenMeta(e.meta)}</span>
          </div>
          <span className="shrink-0 text-xs text-muted tabular-nums">
            {tiempoRelativo(e.creado_en)}
          </span>
        </li>
      ))}
    </ul>
  );
}
