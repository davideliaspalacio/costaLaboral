"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoPostulacion } from "@/lib/actions/empresa";
import { transicionPermitida } from "@/lib/postulaciones-reglas";
import { ESTADOS_PIPELINE_EMPRESA, estadoPostulacionInfo, type EstadoPostulacion } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

/** Selector de estado del pipeline con nota opcional. */
export function EstadoPostulacion({ postulacionId, estado }: { postulacionId: string; estado: EstadoPostulacion }) {
  const router = useRouter();
  const [nuevo, setNuevo] = useState<EstadoPostulacion>(estado);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const opciones = ESTADOS_PIPELINE_EMPRESA.filter((e) => e === estado || transicionPermitida("empresa", estado, e));
  const cambio = nuevo !== estado;

  function guardar() {
    setError(null);
    startTransition(async () => {
      const r = await cambiarEstadoPostulacion(postulacionId, nuevo, nota || undefined);
      if ("error" in r) return setError(r.error);
      setNota("");
      router.refresh();
    });
  }

  return (
    <div className="w-full space-y-2 sm:w-60">
      <label className="label-base" htmlFor={`estado-${postulacionId}`}>
        Estado
      </label>
      <Select
        id={`estado-${postulacionId}`}
        value={nuevo}
        disabled={pending}
        onChange={(e) => setNuevo(e.target.value as EstadoPostulacion)}
        className="h-11 py-0 text-sm"
      >
        {opciones.map((e) => (
          <option key={e} value={e}>
            {estadoPostulacionInfo(e).label}
          </option>
        ))}
      </Select>
      {cambio && (
        <>
          <Input
            aria-label="Nota interna (opcional)"
            placeholder="Nota interna (opcional)"
            value={nota}
            maxLength={500}
            onChange={(e) => setNota(e.target.value)}
            className="py-2 text-sm"
          />
          <Button type="button" size="sm" block disabled={pending} onClick={guardar}>
            {pending ? "Guardando…" : "Guardar estado"}
          </Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-xs font-semibold text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
