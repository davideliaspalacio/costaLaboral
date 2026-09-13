"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  crearVersionHV,
  guardarVersionParaVacante,
  registrarExportacionHV,
  type ViaExportacion,
} from "@/lib/actions/hoja-de-vida";

/* Botones cliente de la hoja de vida: PDF, nueva versión y versión por vacante. */

export function ImprimirButton({
  hvId,
  via = "imprimir",
  label = "Descargar PDF",
}: {
  hvId: string;
  via?: Extract<ViaExportacion, "imprimir" | "imprimir_adaptada">;
  label?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="accent"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await registrarExportacionHV(hvId, via).catch(() => undefined);
          window.print();
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {label}
    </Button>
  );
}

function useAccionConRedireccion() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ejecutar = (fn: () => Promise<{ ok: true; id: string } | { error: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else router.push(`/hoja-de-vida/${r.id}`);
    });
  };
  return { error, pending, ejecutar };
}

export function NuevaVersionButton({ hvId }: { hvId: string }) {
  const { error, pending, ejecutar } = useAccionConRedireccion();
  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" disabled={pending} onClick={() => ejecutar(() => crearVersionHV(hvId))}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
        Crear nueva versión
      </Button>
      {error && <p className="text-xs font-semibold text-danger-600">{error}</p>}
    </div>
  );
}

export function GuardarVersionVacanteButton({ hvId, vacanteId }: { hvId: string; vacanteId: string }) {
  const { error, pending, ejecutar } = useAccionConRedireccion();
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="brand"
        disabled={pending}
        onClick={() => ejecutar(() => guardarVersionParaVacante(hvId, vacanteId))}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Guardar como versión para esta vacante
      </Button>
      {error && <p className="text-xs font-semibold text-danger-600">{error}</p>}
    </div>
  );
}
