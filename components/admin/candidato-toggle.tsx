"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { alternarCandidatoActivo } from "@/lib/actions/admin";

/** Botón para activar/desactivar un candidato desde el listado de admin. */
export function CandidatoToggle({ candidatoId, activo }: { candidatoId: string; activo: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await alternarCandidatoActivo(candidatoId, !activo);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={activo ? "outline" : "success"}
        disabled={pending}
        onClick={toggle}
      >
        {activo ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        {pending ? "Guardando…" : activo ? "Desactivar" : "Activar"}
      </Button>
      {error && <span className="text-xs font-medium text-danger-500">{error}</span>}
    </div>
  );
}
