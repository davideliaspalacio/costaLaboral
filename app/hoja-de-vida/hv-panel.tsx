"use client";

import { useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HvWizard } from "./hv-wizard";

/* ============================================================
   Panel cliente: alterna entre la LISTA de hojas de vida (children,
   renderizada en el servidor) y el CUESTIONARIO de creación.
   ============================================================ */

export function HvClientPanel({
  sugerencia,
  motivoBloqueo,
  children,
}: {
  sugerencia: { cargoObjetivo: string; experienciaTexto: string; nivel: string };
  motivoBloqueo: string | null;
  children: React.ReactNode;
}) {
  const [creando, setCreando] = useState(false);

  if (creando) {
    return (
      <div className="space-y-5">
        <Button type="button" variant="ghost" onClick={() => setCreando(false)}>
          <ArrowLeft className="h-4 w-4" /> Volver a mis hojas de vida
        </Button>
        <HvWizard sugerencia={sugerencia} onCancelar={() => setCreando(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-end gap-2">
        <Button type="button" variant="accent" size="lg" disabled={Boolean(motivoBloqueo)} onClick={() => setCreando(true)}>
          <Plus className="h-5 w-5" /> Crear hoja de vida
        </Button>
        {motivoBloqueo && <p className="text-sm font-semibold text-ink-soft">{motivoBloqueo}</p>}
      </div>
      {children}
    </div>
  );
}
