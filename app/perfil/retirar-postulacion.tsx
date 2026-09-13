"use client";

import { useState, useTransition } from "react";
import { Undo2 } from "lucide-react";
import { retirarPostulacion } from "@/lib/actions/postulacion";
import { Button } from "@/components/ui/button";

/** Botón con confirmación en dos pasos para retirar una postulación. */
export function RetirarPostulacion({ postulacionId, titulo }: { postulacionId: string; titulo: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function retirar() {
    setError(null);
    startTransition(async () => {
      const r = await retirarPostulacion(postulacionId);
      if ("error" in r) setError(r.error);
      else setConfirmando(false);
    });
  }

  if (!confirmando) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmando(true)}>
        <Undo2 className="h-4 w-4" /> Retirar postulación
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border-2 border-ink bg-canvas p-3" role="group" aria-label="Confirmar retiro">
      <p className="text-sm text-ink-soft">
        ¿Retirar tu postulación a <strong className="font-bold text-ink">{titulo}</strong>? La empresa dejará de verte en
        su lista y no podrás volver a postularte a esta vacante.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="danger" size="sm" onClick={retirar} disabled={pending}>
          {pending ? "Retirando…" : "Sí, retirar"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmando(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
