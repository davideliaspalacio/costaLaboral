"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { iniciarCompra, usarDestacadaIncluida } from "@/lib/actions/pagos";
import { Button } from "@/components/ui/button";
import { Select, Field } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProductoCodigo } from "@/lib/billing/catalogo";
import { irAlCheckout } from "./plan-cta";

export type OpcionDestacada = { codigo: ProductoCodigo; dias: number; precio: string };

export function DestacarForm({
  vacantes,
  opciones,
  cupoIncluido,
}: {
  vacantes: { id: string; titulo: string; destacadaHasta: string | null }[];
  opciones: OpcionDestacada[];
  cupoIncluido: number;
}) {
  const router = useRouter();
  const [vacanteId, setVacanteId] = useState(vacantes[0]?.id ?? "");
  const [producto, setProducto] = useState<ProductoCodigo>(opciones[0].codigo);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const seleccionada = vacantes.find((v) => v.id === vacanteId);

  function pagar() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const res = await iniciarCompra(producto, { vacanteId });
      if ("url" in res) irAlCheckout(router, res.url);
      else setError(res.error);
    });
  }

  function usarIncluida() {
    setError(null);
    setOk(false);
    startTransition(async () => {
      const res = await usarDestacadaIncluida(vacanteId, producto);
      if ("error" in res) setError(res.error);
      else {
        setOk(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <Field label="Vacante" htmlFor="destacar-vacante">
        <Select id="destacar-vacante" value={vacanteId} onChange={(e) => setVacanteId(e.target.value)}>
          {vacantes.map((v) => (
            <option key={v.id} value={v.id}>
              {v.titulo}
            </option>
          ))}
        </Select>
      </Field>
      {seleccionada?.destacadaHasta && (
        <p className="text-xs text-muted">
          Ya está destacada hasta el {seleccionada.destacadaHasta}. Los días nuevos se suman al final.
        </p>
      )}

      <fieldset>
        <legend className="label-base">Duración</legend>
        <div className="grid grid-cols-3 gap-2">
          {opciones.map((o) => (
            <label
              key={o.codigo}
              className={cn(
                "flex cursor-pointer flex-col items-center rounded-xl border-2 border-ink px-2 py-3 text-center transition",
                producto === o.codigo ? "bg-sol-300 shadow-[var(--shadow-sticker)]" : "bg-surface hover:bg-canvas",
              )}
            >
              <input
                type="radio"
                name="destacar-duracion"
                value={o.codigo}
                checked={producto === o.codigo}
                onChange={() => setProducto(o.codigo)}
                className="sr-only"
              />
              <span className="font-display text-lg font-extrabold text-ink">{o.dias} días</span>
              <span className="text-xs font-semibold text-ink-soft">{o.precio}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        {cupoIncluido > 0 && (
          <Button type="button" variant="brand" size="lg" block onClick={usarIncluida} disabled={pending || !vacanteId}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Usar destacada incluida ({cupoIncluido} disponible{cupoIncluido === 1 ? "" : "s"})
          </Button>
        )}
        <Button
          type="button"
          variant={cupoIncluido > 0 ? "outline" : "accent"}
          size="lg"
          block
          onClick={pagar}
          disabled={pending || !vacanteId}
          aria-busy={pending}
        >
          {pending ? "Procesando…" : "Pagar y destacar"}
        </Button>
      </div>

      {ok && (
        <p role="status" className="flex items-center gap-2 rounded-xl border-2 border-ink bg-success-50 px-3 py-2 text-sm font-semibold text-success-600">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ¡Listo! Tu vacante ya aparece destacada.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border-2 border-ink bg-danger-50 px-3 py-2 text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
