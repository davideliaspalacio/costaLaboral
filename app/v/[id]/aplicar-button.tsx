"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { postularse } from "@/lib/actions/postulacion";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import type { Fuente } from "@/lib/constants";

type ErrorPostulacion = "ya_postulado" | "cerrada" | "limite_tasa" | "generico";

const MENSAJE_ERROR: Record<ErrorPostulacion, string> = {
  ya_postulado: "Ya te postulaste a esta vacante.",
  cerrada: "Esta vacante ya no recibe postulaciones.",
  limite_tasa: "Has enviado muchas postulaciones seguidas. Tómate un respiro e intenta de nuevo en un rato.",
  generico: "No pudimos enviar tu postulación. Intenta de nuevo.",
};

export function AplicarButton({
  vacanteId,
  fuente,
  abierta,
  estadoPostulacion,
}: {
  vacanteId: string;
  fuente: Fuente;
  /** La vacante es pública y recibe postulaciones. */
  abierta: boolean;
  /** Etiqueta para el candidato del estado de su postulación, si ya se postuló. */
  estadoPostulacion: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState("");
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState<ErrorPostulacion | null>(null);

  if (estadoPostulacion || enviada) {
    return (
      <div className="rounded-xl border-2 border-ink bg-success-50 px-4 py-3 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-bold text-success-600">
          <CheckCircle2 className="h-4 w-4" />
          {enviada && !estadoPostulacion ? "¡Postulación enviada!" : "Ya te postulaste"}
        </p>
        {estadoPostulacion && (
          <p className="mt-1 text-sm text-ink-soft">
            Estado: <span className="font-bold text-ink">{estadoPostulacion}</span>
          </p>
        )}
      </div>
    );
  }

  if (!abierta) {
    return (
      <p className="flex items-center gap-2 rounded-xl border-2 border-ink bg-warn-50 px-4 py-3 text-sm font-bold text-ink">
        <AlertTriangle className="h-4 w-4 shrink-0" /> Esta vacante ya no recibe postulaciones.
      </p>
    );
  }

  function aplicar() {
    setError(null);
    startTransition(async () => {
      const r = await postularse(vacanteId, { mensaje: mensaje.trim() || undefined, fuente });
      if ("ok" in r) {
        setEnviada(true);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Mensaje para la empresa (opcional)" htmlFor="mensaje-aplicar">
        <Textarea
          id="mensaje-aplicar"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          placeholder="Cuéntale por qué eres la persona indicada para el cargo…"
          className="min-h-20"
          maxLength={500}
        />
      </Field>

      <Button type="button" size="lg" block variant="accent" disabled={pending} onClick={aplicar}>
        {pending ? "Enviando…" : "Postularme gratis"}
      </Button>

      {error && (
        <p
          role="alert"
          className={
            error === "generico"
              ? "rounded-xl border-2 border-ink bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-600"
              : "rounded-xl border-2 border-ink bg-sol-100 px-4 py-2.5 text-sm font-semibold text-ink"
          }
        >
          {MENSAJE_ERROR[error] ?? MENSAJE_ERROR.generico}
        </p>
      )}
    </div>
  );
}
