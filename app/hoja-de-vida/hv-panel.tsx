"use client";

import { useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HvWizard } from "./hv-wizard";

/* ============================================================
   Panel cliente: alterna entre la LISTA de hojas de vida (children,
   renderizada en el servidor) y el ASISTENTE de creación.
   ============================================================ */

export function HvClientPanel({
  candidato,
  sugerencia,
  children,
}: {
  candidato: { nombre: string; ciudad: string; whatsapp: string; email: string };
  sugerencia: { cargoObjetivo: string; experienciaTexto: string; nivel: string };
  children: React.ReactNode;
}) {
  const [creando, setCreando] = useState(false);

  if (creando) {
    return (
      <div className="space-y-5">
        <Button type="button" variant="ghost" onClick={() => setCreando(false)}>
          <ArrowLeft className="h-4 w-4" /> Volver a mis hojas de vida
        </Button>
        <HvWizard candidato={candidato} sugerencia={sugerencia} onCancelar={() => setCreando(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button type="button" variant="accent" size="lg" onClick={() => setCreando(true)}>
          <Plus className="h-5 w-5" /> Crear nueva hoja de vida
        </Button>
      </div>
      {children}
    </div>
  );
}
