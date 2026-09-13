"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pause, Play, RotateCcw, Send, X, XCircle } from "lucide-react";
import {
  cerrarVacante,
  pausarVacante,
  publicarVacante,
  reabrirVacante,
  reanudarVacante,
  type CierreMotivo,
} from "@/lib/actions/empresa";
import { Button } from "@/components/ui/button";
import type { EstadoVacante } from "@/lib/constants";

/** Botones del ciclo de vida de una vacante en el panel. */
export function AccionesVacante({ vacanteId, estado }: { vacanteId: string; estado: EstadoVacante }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function ejecutar(fn: () => Promise<{ error: string } | { ok: true; moderacion?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if ("error" in r) return setError(r.error);
      setConfirmando(false);
      if (r.moderacion === "pendiente") router.push(`/empresa/panel?revision=${vacanteId}`);
      else if (r.moderacion === "aprobada" && estado === "borrador") router.push(`/empresa/panel?publicada=${vacanteId}`);
      else router.refresh();
    });
  }

  const cerrar = (motivo: CierreMotivo) => ejecutar(() => cerrarVacante(vacanteId, motivo));

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {confirmando ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-ink bg-sol-100 px-3 py-2">
          <span className="text-sm font-bold text-ink">¿Cerrar la vacante?</span>
          <Button type="button" size="sm" variant="success" disabled={pending} onClick={() => cerrar("contratado")}>
            <CheckCircle2 className="h-4 w-4" /> Ya contraté
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => cerrar("cerrada")}>
            <XCircle className="h-4 w-4" /> Cerrar sin contratar
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmando(false)} aria-label="Cancelar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {estado === "borrador" && (
            <Button type="button" size="sm" variant="accent" disabled={pending} onClick={() => ejecutar(() => publicarVacante(vacanteId))}>
              <Send className="h-4 w-4" /> {pending ? "Publicando…" : "Publicar"}
            </Button>
          )}
          {estado === "publicada" && (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => ejecutar(() => pausarVacante(vacanteId))}>
              <Pause className="h-4 w-4" /> Pausar
            </Button>
          )}
          {estado === "pausada" && (
            <Button type="button" size="sm" variant="brand" disabled={pending} onClick={() => ejecutar(() => reanudarVacante(vacanteId))}>
              <Play className="h-4 w-4" /> Reanudar
            </Button>
          )}
          {estado === "cerrada" ? (
            <Button type="button" size="sm" variant="brand" disabled={pending} onClick={() => ejecutar(() => reabrirVacante(vacanteId))}>
              <RotateCcw className="h-4 w-4" /> {pending ? "Reabriendo…" : "Reabrir"}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setConfirmando(true)}>
              <CheckCircle2 className="h-4 w-4" /> {estado === "borrador" ? "Descartar" : "Cerrar"}
            </Button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
