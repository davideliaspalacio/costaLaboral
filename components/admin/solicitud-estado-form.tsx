"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/input";
import { actualizarSolicitud } from "@/lib/actions/admin";

type Destino = "en_tramite" | "respondida" | "cerrada";

const OPCIONES: Record<string, { value: Destino; label: string }[]> = {
  recibida: [
    { value: "en_tramite", label: "En trámite" },
    { value: "respondida", label: "Respondida" },
    { value: "cerrada", label: "Cerrada" },
  ],
  en_tramite: [
    { value: "respondida", label: "Respondida" },
    { value: "cerrada", label: "Cerrada" },
  ],
  respondida: [{ value: "cerrada", label: "Cerrada" }],
  cerrada: [],
};

/** Cambio de estado de una solicitud de titular con respuesta obligatoria cuando aplica. */
export function SolicitudEstadoForm({
  solicitudId,
  estado,
  tieneRespuesta,
}: {
  solicitudId: string;
  estado: string;
  tieneRespuesta: boolean;
}) {
  const router = useRouter();
  const opciones = OPCIONES[estado] ?? [];
  const [destino, setDestino] = useState<Destino | "">(opciones[0]?.value ?? "");
  const [respuesta, setRespuesta] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!opciones.length) {
    return <p className="text-sm text-muted">La solicitud está cerrada: no admite más cambios.</p>;
  }

  const pideRespuesta = destino === "respondida" || (destino === "cerrada" && !tieneRespuesta);

  function enviar() {
    if (!destino) return;
    if (pideRespuesta && respuesta.trim().length < 10) {
      setError("Escribe la respuesta dada al titular (mínimo 10 caracteres).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await actualizarSolicitud(solicitudId, destino, respuesta.trim() || undefined);
      if ("error" in res) {
        setError(res.error);
        setConfirmando(false);
        return;
      }
      setConfirmando(false);
      setRespuesta("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Field label="Nuevo estado" htmlFor="solicitud-estado">
        <Select
          id="solicitud-estado"
          value={destino}
          onChange={(e) => {
            setDestino(e.target.value as Destino);
            setConfirmando(false);
          }}
        >
          {opciones.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      {pideRespuesta && (
        <Field
          label="Respuesta al titular (obligatoria)"
          htmlFor="solicitud-respuesta"
          hint="Queda registrada con la fecha de respuesta. Envíala también por el canal que indicó el titular."
        >
          <Textarea
            id="solicitud-respuesta"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            maxLength={2000}
          />
        </Field>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
      {confirmando ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-ink bg-sol-100 p-3">
          <span className="text-sm font-bold text-ink">¿Confirmas el cambio de estado?</span>
          <Button type="button" size="sm" variant="primary" disabled={pending} onClick={enviar}>
            {pending ? "Guardando…" : "Sí, guardar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="brand" onClick={() => setConfirmando(true)}>
          Actualizar estado
        </Button>
      )}
    </div>
  );
}
