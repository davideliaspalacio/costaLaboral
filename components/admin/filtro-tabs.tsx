"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export type FiltroOpcion = { value: string; label: string; total?: number };

/**
 * Pestañas de filtro que escriben en el searchParam indicado (link-based, sin JS
 * para navegar). `value` vacío limpia el filtro.
 */
export function FiltroTabs({
  param,
  opciones,
  activo,
}: {
  param: string;
  opciones: FiltroOpcion[];
  activo: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefPara(value: string): string {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(param, value);
    else p.delete(param);
    p.delete("page");
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((o) => {
        const on = activo === o.value;
        return (
          <Link
            key={o.value || "todas"}
            href={hrefPara(o.value)}
            aria-current={on ? "true" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-sm font-bold transition-all",
              on
                ? "border-ink bg-ink text-canvas shadow-[var(--shadow-sticker)]"
                : "border-line bg-surface text-ink-soft hover:border-ink hover:text-ink",
            )}
          >
            {o.label}
            {o.total != null && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  on ? "bg-canvas/20 text-canvas" : "bg-canvas text-muted",
                )}
              >
                {o.total}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
