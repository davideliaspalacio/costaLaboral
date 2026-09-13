"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { iniciarCompra } from "@/lib/actions/pagos";
import { Button } from "@/components/ui/button";
import type { ProductoCodigo } from "@/lib/billing/catalogo";

/** Navega al checkout: interno con el router, externo (Wompi) con recarga completa. */
export function irAlCheckout(router: ReturnType<typeof useRouter>, url: string) {
  if (/^https?:\/\//.test(url)) window.location.assign(url);
  else router.push(url);
}

/** Botón de compra: crea el pago pendiente y lleva al checkout del proveedor. */
export function ComprarBoton({
  producto,
  label,
  variant = "primary",
  vacanteId,
}: {
  producto: ProductoCodigo;
  label: string;
  variant?: "primary" | "accent" | "brand" | "sol" | "outline";
  vacanteId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onComprar() {
    setError(null);
    startTransition(async () => {
      const res = await iniciarCompra(producto, vacanteId ? { vacanteId } : undefined);
      if ("url" in res) irAlCheckout(router, res.url);
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant={variant} size="lg" block onClick={onComprar} disabled={pending} aria-busy={pending}>
        {pending ? "Preparando pago…" : label}
        {!pending && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </Button>
      {error && (
        <p role="alert" className="rounded-xl border-2 border-ink bg-danger-50 px-3 py-2 text-center text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
