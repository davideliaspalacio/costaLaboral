"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Clock, Flag, RotateCcw, ShieldCheck, ShieldOff, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import type { AdminActionResult } from "@/lib/actions/admin";

const ICONOS = {
  check: Check,
  x: X,
  ban: Ban,
  flag: Flag,
  undo: Undo2,
  refund: RotateCcw,
  shield: ShieldCheck,
  revocar: ShieldOff,
  clock: Clock,
} as const;

type Variante = "primary" | "success" | "danger" | "outline" | "accent" | "brand";

/**
 * Botón de acción administrativa con confirmación explícita y nota opcional u
 * obligatoria. `accion` es una Server Action (normalmente `accion.bind(null, id)`)
 * que recibe la nota como último argumento.
 */
export function AccionConfirmar({
  accion,
  etiqueta,
  pregunta,
  variante = "outline",
  icono,
  nota,
  confirmar = "Confirmar",
  deshabilitado = false,
}: {
  accion: (nota: string) => Promise<AdminActionResult>;
  etiqueta: string;
  pregunta: string;
  variante?: Variante;
  icono?: keyof typeof ICONOS;
  nota?: { label: string; placeholder?: string; obligatoria?: boolean };
  confirmar?: string;
  deshabilitado?: boolean;
}) {
  const router = useRouter();
  const idNota = useId();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const Icono = icono ? ICONOS[icono] : null;

  function ejecutar() {
    if (nota?.obligatoria && texto.trim().length < 5) {
      setError("Completa la nota (mínimo 5 caracteres).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await accion(texto.trim());
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setAbierto(false);
      setTexto("");
      router.refresh();
    });
  }

  if (!abierto) {
    return (
      <Button type="button" size="sm" variant={variante} disabled={deshabilitado} onClick={() => setAbierto(true)}>
        {Icono && <Icono className="h-4 w-4" />}
        {etiqueta}
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="w-full max-w-sm space-y-3 rounded-xl border-2 border-ink bg-canvas p-3 text-left shadow-[var(--shadow-sticker)]"
    >
      <p className="text-sm font-bold text-ink">{pregunta}</p>
      {nota && (
        <Field label={`${nota.label}${nota.obligatoria ? " (obligatorio)" : " (opcional)"}`} htmlFor={idNota}>
          <Textarea
            id={idNota}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={nota.placeholder}
            maxLength={2000}
            className="min-h-20 text-sm"
          />
        </Field>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={variante === "outline" ? "primary" : variante} disabled={pending} onClick={ejecutar}>
          {pending ? "Guardando…" : confirmar}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setAbierto(false);
            setError(null);
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
