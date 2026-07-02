"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { eliminarHojaDeVida } from "@/lib/actions/hoja-de-vida";

/** Botón de eliminar con confirmación en línea (sin diálogos nativos feos). */
export function DeleteHvButton({ id, titulo }: { id: string; titulo: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirmando) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={`Eliminar ${titulo}`}
        onClick={() => setConfirmando(true)}
      >
        <Trash2 className="h-4 w-4" />
        Eliminar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-ink-soft">¿Seguro?</span>
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => void (await eliminarHojaDeVida(id)))}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        Sí, borrar
      </Button>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmando(false)}>
        Cancelar
      </Button>
    </div>
  );
}
