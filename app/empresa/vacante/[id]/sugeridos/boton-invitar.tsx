"use client";

import { useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import { invitarCandidato } from "@/lib/actions/empresa";
import { Button } from "@/components/ui/button";

export function BotonInvitar({
  vacanteId,
  candidatoId,
  invitado,
  bloqueo,
}: {
  vacanteId: string;
  candidatoId: string;
  invitado: boolean;
  bloqueo: string | null;
}) {
  const [hecho, setHecho] = useState(invitado);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (hecho) {
    return (
      <span className="inline-flex items-center gap-1 rounded-xl border-2 border-ink bg-success-50 px-3 py-1.5 text-sm font-bold text-success-600">
        <Check className="h-4 w-4" /> Invitación enviada
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        type="button"
        size="sm"
        variant="accent"
        disabled={pending || !!bloqueo}
        title={bloqueo ?? undefined}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await invitarCandidato(vacanteId, candidatoId);
            if ("error" in r) setError(r.error);
            else setHecho(true);
          })
        }
      >
        <Send className="h-4 w-4" /> {pending ? "Enviando…" : "Invitar a postularse"}
      </Button>
      {(error ?? bloqueo) && <p className="max-w-56 text-xs font-semibold text-muted">{error ?? bloqueo}</p>}
    </div>
  );
}
