"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cerrarVacante, reabrirVacante, type CierreMotivo } from "@/lib/actions/empresa";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCcw, X } from "lucide-react";

type Props = { vacanteId: string; activa: boolean; cerrada: boolean };

export function VacanteCierre({ vacanteId, activa, cerrada }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  function cerrar(motivo: CierreMotivo) {
    startTransition(async () => {
      await cerrarVacante(vacanteId, motivo);
      setConfirmando(false);
      router.refresh();
    });
  }

  function reabrir() {
    startTransition(async () => {
      await reabrirVacante(vacanteId);
      router.refresh();
    });
  }

  if (!activa && cerrada) {
    return (
      <Button type="button" size="sm" variant="success" disabled={pending} onClick={reabrir}>
        <RotateCcw className="h-4 w-4" />
        {pending ? "Reabriendo…" : "Reabrir"}
      </Button>
    );
  }

  if (confirmando) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-ink bg-sol-100 px-3 py-2">
        <span className="text-sm font-semibold text-ink">¿Cerrar esta vacante?</span>
        <Button type="button" size="sm" variant="success" disabled={pending} onClick={() => cerrar("contratado")}>
          <CheckCircle2 className="h-4 w-4" /> Ya contraté
        </Button>
        <Button type="button" size="sm" variant="danger" disabled={pending} onClick={() => cerrar("cerrada")}>
          <XCircle className="h-4 w-4" /> Cerrar sin contratar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setConfirmando(false)}
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setConfirmando(true)}>
      <CheckCircle2 className="h-4 w-4" /> Cerrar / Ya contraté
    </Button>
  );
}
