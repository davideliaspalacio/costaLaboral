"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { moderarVacante } from "@/lib/actions/admin";

type Estado = "aprobada" | "pendiente" | "rechazada" | "reportada";

/** Controles de moderación de una vacante: Aprobar / Rechazar (con motivo) / Reportar. */
export function VacanteModerar({
  vacanteId,
  estado,
}: {
  vacanteId: string;
  estado: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<"rechazar" | "reportar" | null>(null);
  const [motivo, setMotivo] = useState("");

  function ejecutar(nuevo: Estado, motivoTexto?: string) {
    setError(null);
    startTransition(async () => {
      const res = await moderarVacante(vacanteId, nuevo, motivoTexto);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setModo(null);
      setMotivo("");
      router.refresh();
    });
  }

  if (modo) {
    const esRechazo = modo === "rechazar";
    return (
      <div className="w-full max-w-sm space-y-2">
        <Field
          label={esRechazo ? "Motivo del rechazo (obligatorio)" : "Motivo del reporte (opcional)"}
          htmlFor={`motivo-${vacanteId}`}
        >
          <Textarea
            id={`motivo-${vacanteId}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={esRechazo ? "Ej: contenido engañoso, datos falsos…" : "Ej: posible estafa reportada por un usuario"}
            className="min-h-20"
          />
        </Field>
        {error && <p className="text-xs font-medium text-danger-500">{error}</p>}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={esRechazo ? "danger" : "accent"}
            disabled={pending}
            onClick={() => ejecutar(esRechazo ? "rechazada" : "reportada", motivo)}
          >
            {pending ? "Guardando…" : esRechazo ? "Confirmar rechazo" : "Confirmar reporte"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              setModo(null);
              setError(null);
            }}
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button
          type="button"
          size="sm"
          variant="success"
          disabled={pending || estado === "aprobada"}
          onClick={() => ejecutar("aprobada")}
        >
          <Check className="h-4 w-4" /> Aprobar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => setModo("rechazar")}
        >
          <X className="h-4 w-4" /> Rechazar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setModo("reportar")}
        >
          <Flag className="h-4 w-4" /> Reportar
        </Button>
      </div>
      {error && <span className="text-xs font-medium text-danger-500">{error}</span>}
    </div>
  );
}
