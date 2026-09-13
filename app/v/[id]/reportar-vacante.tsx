"use client";

import { useState, useTransition } from "react";
import { Flag, CheckCircle2 } from "lucide-react";
import { reportarVacante } from "@/lib/actions/reportes";
import { MOTIVOS_REPORTE, type MotivoReporte } from "@/lib/constants";
import { DETALLE_REPORTE_MAX, validarReporte } from "@/components/vacante/reporte";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";

export function ReportarVacante({ vacanteId }: { vacanteId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoReporte | "">("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [pending, startTransition] = useTransition();

  if (enviado) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm font-semibold text-ink-soft">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
        Gracias. Recibimos tu reporte y el equipo lo revisará.
      </p>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-danger-600 hover:underline"
      >
        <Flag className="h-4 w-4" /> Reportar vacante
      </button>
    );
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const v = validarReporte(motivo, detalle);
    if ("error" in v) {
      setError(v.error);
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await reportarVacante(vacanteId, v.motivo, v.detalle ?? undefined);
      if ("ok" in r) setEnviado(true);
      else setError(r.error);
    });
  }

  return (
    <form onSubmit={enviar} className="card space-y-3 p-4">
      <p className="flex items-center gap-2 font-display font-extrabold text-ink">
        <Flag className="h-4 w-4 text-danger-600" /> Reportar vacante
      </p>
      <Field label="Motivo" htmlFor="motivo-reporte">
        <Select
          id="motivo-reporte"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value as MotivoReporte)}
          required
        >
          <option value="" disabled>
            Elige un motivo
          </option>
          {MOTIVOS_REPORTE.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field
        label={motivo === "otro" ? "Detalle" : "Detalle (opcional)"}
        htmlFor="detalle-reporte"
        hint={`${detalle.length}/${DETALLE_REPORTE_MAX}`}
      >
        <Textarea
          id="detalle-reporte"
          value={detalle}
          onChange={(e) => setDetalle(e.target.value)}
          maxLength={DETALLE_REPORTE_MAX}
          className="min-h-20"
          placeholder="¿Qué viste? Ej.: piden pagar un curso para ser contratado."
        />
      </Field>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? "Enviando…" : "Enviar reporte"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
