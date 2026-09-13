"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift, Sparkles, X } from "lucide-react";
import { iniciarCompra, usarDestacadaIncluida } from "@/lib/actions/pagos";
import type { ProductoCodigo } from "@/lib/billing/catalogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OpcionDestacada = { codigo: ProductoCodigo; nombre: string; precio: string; dias: number };

/** Elegir un producto de vacante destacada: pagar o usar una incluida en Empresa Pro. */
export function DestacarVacante({
  vacanteId,
  bloqueo,
  opciones,
  incluidasRestantes,
}: {
  vacanteId: string;
  /** Si no se puede destacar, el motivo explicado. */
  bloqueo: string | null;
  opciones: OpcionDestacada[];
  incluidasRestantes: number;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [producto, setProducto] = useState<ProductoCodigo>(opciones[0]?.codigo ?? "destacada_7d");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (bloqueo) {
    return (
      <p className="flex items-start gap-2 text-xs text-muted">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {bloqueo}
      </p>
    );
  }

  if (!abierto) {
    return (
      <Button type="button" size="sm" variant="sol" onClick={() => setAbierto(true)}>
        <Sparkles className="h-4 w-4" /> Destacar vacante
      </Button>
    );
  }

  function pagar() {
    setError(null);
    startTransition(async () => {
      const r = await iniciarCompra(producto, { vacanteId });
      if ("error" in r) return setError(r.error);
      window.location.assign(r.url);
    });
  }

  function usarIncluida() {
    setError(null);
    startTransition(async () => {
      const r = await usarDestacadaIncluida(vacanteId, producto);
      if ("error" in r) return setError(r.error);
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border-2 border-ink bg-sol-100 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-ink">Destaca tu vacante: sale primero en el portal y en las recomendaciones.</p>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAbierto(false)} aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-3">
        <legend className="sr-only">Duración</legend>
        {opciones.map((o) => (
          <label
            key={o.codigo}
            className={cn(
              "flex cursor-pointer flex-col rounded-xl border-2 border-ink px-3 py-2 text-sm transition",
              producto === o.codigo ? "bg-ink text-canvas" : "bg-surface text-ink hover:bg-sol-200",
            )}
          >
            <input
              type="radio"
              name={`destacada-${vacanteId}`}
              value={o.codigo}
              checked={producto === o.codigo}
              onChange={() => setProducto(o.codigo)}
              className="sr-only"
            />
            <span className="font-extrabold">{o.dias} días</span>
            <span className="tabular-nums">{o.precio}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="primary" disabled={pending} onClick={pagar}>
          {pending ? "Procesando…" : "Pagar y destacar"}
        </Button>
        {incluidasRestantes > 0 && (
          <Button type="button" size="sm" variant="brand" disabled={pending} onClick={usarIncluida}>
            <Gift className="h-4 w-4" /> Usar incluida en Pro (te quedan {incluidasRestantes})
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
