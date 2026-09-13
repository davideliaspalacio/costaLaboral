"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelarSuscripcion } from "@/lib/actions/pagos";
import { Button } from "@/components/ui/button";

export function CancelarRenovacion({ hasta }: { hasta: string }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!confirmando) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmando(true)}>
        Cancelar renovación
      </Button>
    );
  }

  function onConfirmar() {
    setError(null);
    startTransition(async () => {
      const res = await cancelarSuscripcion();
      if ("error" in res) setError(res.error);
      else {
        setConfirmando(false);
        router.refresh();
      }
    });
  }

  return (
    <div role="group" aria-label="Confirmar cancelación" className="space-y-3 rounded-xl border-2 border-ink bg-sol-100 p-4">
      <p className="text-sm text-ink">
        Tu plan no se renovará. Conservas todos los beneficios hasta el <strong>{hasta}</strong>.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="danger" size="sm" onClick={onConfirmar} disabled={pending} aria-busy={pending}>
          {pending ? "Cancelando…" : "Sí, cancelar renovación"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmando(false)} disabled={pending}>
          Mantener mi plan
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
