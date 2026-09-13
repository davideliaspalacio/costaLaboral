import type { DetalleMatch } from "@/lib/matching";
import { cn } from "@/lib/utils";
import { LABEL_FACTOR } from "../../_components/etiquetas";

/** Desglose del score por factor (Server Component, sin interacción). */
export function DetalleMatchLista({ detalle }: { detalle: DetalleMatch | null }) {
  if (!detalle) return null;
  return (
    <ul className="grid gap-1.5 sm:grid-cols-2">
      {detalle.factores.map((f) => (
        <li key={f.factor} className="flex items-start gap-2 text-sm">
          <span
            className={cn(
              "mt-0.5 inline-flex min-w-14 justify-center rounded-md border-2 border-ink px-1 text-xs font-extrabold tabular-nums",
              f.compatibilidad === 1 ? "bg-success-50 text-success-600" : f.compatibilidad === 0.5 ? "bg-sol-200 text-ink" : "bg-surface text-muted",
            )}
          >
            {f.puntos}/{f.peso}
          </span>
          <span className="text-ink-soft">
            <strong className="text-ink">{LABEL_FACTOR[f.factor] ?? f.factor}:</strong> {f.explicacion}
          </span>
        </li>
      ))}
    </ul>
  );
}
