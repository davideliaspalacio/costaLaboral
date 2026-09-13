"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { eliminarCuenta } from "@/lib/actions/cuenta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CONFIRMACION = "ELIMINAR";

export function EliminarCuenta() {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [pending, startTransition] = useTransition();

  const confirmado = texto.trim().toUpperCase() === CONFIRMACION;

  function borrar() {
    if (!confirmado) return;
    startTransition(async () => {
      await eliminarCuenta();
    });
  }

  if (!abierto) {
    return (
      <Button
        type="button"
        variant="danger"
        onClick={() => setAbierto(true)}
        className="w-full sm:w-auto"
      >
        <Trash2 className="h-4 w-4" />
        Eliminar mi cuenta y mis datos
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border-2 border-danger-500 bg-danger-50 px-4 py-3 text-sm text-danger-500">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Esta acción es <strong className="font-semibold">permanente</strong>. Se borrarán tu
          cuenta y tu perfil con la información asociada, y se cancelará cualquier plan vigente. No
          se puede deshacer.
        </span>
      </div>

      <div>
        <label htmlFor="confirmar-eliminar" className="label-base">
          Para confirmar, escribe <strong className="font-bold text-ink">{CONFIRMACION}</strong>
        </label>
        <Input
          id="confirmar-eliminar"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={CONFIRMACION}
          autoComplete="off"
          autoCapitalize="characters"
          disabled={pending}
          aria-describedby="confirmar-eliminar-ayuda"
          className="mt-1.5"
        />
        <p id="confirmar-eliminar-ayuda" className="mt-1.5 text-sm text-muted">
          El botón se activa cuando el texto coincide.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="danger"
          onClick={borrar}
          disabled={!confirmado || pending}
        >
          <Trash2 className="h-4 w-4" />
          {pending ? "Eliminando…" : "Sí, eliminar todo definitivamente"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAbierto(false);
            setTexto("");
          }}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
