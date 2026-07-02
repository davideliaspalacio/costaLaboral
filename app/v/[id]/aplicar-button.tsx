"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { postularse } from "@/lib/actions/postulacion";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import { CheckCircle2, AlertTriangle, Lock } from "lucide-react";

type Resultado =
  | { tipo: "ok" }
  | { tipo: "limite" }
  | { tipo: "ya_postulado" }
  | { tipo: "cerrada" }
  | { tipo: "generico" }
  | null;

export function AplicarButton({
  vacanteId,
  puedeAplicar,
  yaPostulado,
  activo,
}: {
  vacanteId: string;
  puedeAplicar: boolean;
  yaPostulado: boolean;
  activo: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState("");
  const [resultado, setResultado] = useState<Resultado>(null);

  // Ya se postuló antes: estado bloqueado.
  if (yaPostulado || resultado?.tipo === "ok") {
    return (
      <div className="rounded-xl bg-success-50 px-4 py-3 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-semibold text-success-600">
          <CheckCircle2 className="h-4 w-4" />
          {resultado?.tipo === "ok" ? "¡Postulación enviada! 🎉" : "Ya aplicaste"}
        </p>
        <p className="mt-1 text-xs text-ink-soft">Te avisaremos por WhatsApp si la empresa te contacta.</p>
      </div>
    );
  }

  function aplicar() {
    setResultado(null);
    startTransition(async () => {
      const r = await postularse(vacanteId, mensaje);
      if ("ok" in r) {
        setResultado({ tipo: "ok" });
        router.refresh();
      } else {
        setResultado({ tipo: r.error });
      }
    });
  }

  const bloqueado = !activo || !puedeAplicar;

  return (
    <div className="space-y-3">
      {activo && puedeAplicar && (
        <Field label="Mensaje para la empresa (opcional)" htmlFor="mensaje-aplicar">
          <Textarea
            id="mensaje-aplicar"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Cuéntale por qué eres la persona ideal para el cargo…"
            className="min-h-20"
            maxLength={500}
          />
        </Field>
      )}

      <Button
        type="button"
        size="lg"
        block
        variant="accent"
        disabled={bloqueado || pending}
        onClick={aplicar}
      >
        {pending ? "Enviando…" : bloqueado ? "Postulación no disponible" : "Aplicar ahora"}
      </Button>

      {resultado?.tipo === "limite" && (
        <div className="rounded-xl bg-accent-50 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-semibold text-accent-700">
            <Lock className="h-4 w-4" />
            Alcanzaste tu límite de postulaciones
          </p>
          <p className="mt-1 text-ink-soft">Mejora tu plan para seguir aplicando sin límites.</p>
          <Link href="/planes" className={buttonVariants({ variant: "accent", size: "sm", block: true, className: "mt-3" })}>
            Ver planes
          </Link>
        </div>
      )}
      {resultado?.tipo === "ya_postulado" && (
        <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700">Ya te postulaste a esta vacante.</p>
      )}
      {resultado?.tipo === "cerrada" && (
        <p className="flex items-center gap-2 rounded-xl bg-warn-50 px-4 py-2.5 text-sm font-medium text-warn-500">
          <AlertTriangle className="h-4 w-4" /> Esta vacante ya cerró.
        </p>
      )}
      {resultado?.tipo === "generico" && (
        <p className="rounded-xl bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-500">
          No pudimos enviar tu postulación. Intenta de nuevo.
        </p>
      )}
    </div>
  );
}
