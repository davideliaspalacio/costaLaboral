import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Columna = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  className?: string;
};

/**
 * Envoltorio de tabla del panel: cabecera de página + tarjeta con scroll
 * horizontal. Renderiza el thead a partir de `columnas`; el children son las
 * filas (<tr>…).
 */
export function DataTable({
  columnas,
  children,
  vacio,
  hayFilas,
}: {
  columnas: Columna[];
  children: React.ReactNode;
  vacio?: React.ReactNode;
  hayFilas: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      {!hayFilas ? (
        <div className="p-6">{vacio ?? <p className="text-sm text-muted">Sin resultados.</p>}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-line text-xs uppercase tracking-wide text-muted">
                {columnas.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      "px-4 py-3 font-semibold",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.className,
                    )}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">{children}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
