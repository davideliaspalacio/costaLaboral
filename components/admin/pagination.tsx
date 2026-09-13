import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/**
 * Paginación por enlaces (server-friendly). Construye los hrefs conservando el
 * resto de searchParams.
 */
export function Pagination({
  page,
  totalPaginas,
  baseParams,
  basePath,
  param = "page",
}: {
  page: number;
  totalPaginas: number;
  baseParams: Record<string, string | undefined>;
  basePath: string;
  /** Nombre del searchParam de página (para varias tablas en la misma ruta). */
  param?: string;
}) {
  if (totalPaginas <= 1) return null;

  function href(p: number): string {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) {
      if (v) usp.set(k, v);
    }
    usp.set(param, String(p));
    return `${basePath}?${usp.toString()}`;
  }

  const anterior = Math.max(1, page - 1);
  const siguiente = Math.min(totalPaginas, page + 1);

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Paginación">
      <Link
        href={href(anterior)}
        aria-disabled={page <= 1}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          page <= 1 && "pointer-events-none opacity-50",
        )}
      >
        <ChevronLeft className="h-4 w-4" /> Anterior
      </Link>
      <span className="text-sm text-ink-soft tabular-nums">
        Página <strong className="text-ink">{page}</strong> de {totalPaginas}
      </span>
      <Link
        href={href(siguiente)}
        aria-disabled={page >= totalPaginas}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          page >= totalPaginas && "pointer-events-none opacity-50",
        )}
      >
        Siguiente <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
