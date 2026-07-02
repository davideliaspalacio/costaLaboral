"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { verificarEmpresa } from "@/lib/actions/admin";

/** Botón "Verificar" para la cola de verificación de empresas. */
export function EmpresaVerify({ empresaId, verificada }: { empresaId: string; verificada: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (verificada) {
    return (
      <Badge tone="success">
        <BadgeCheck className="h-3.5 w-3.5" /> Verificada
      </Badge>
    );
  }

  function verificar() {
    setError(null);
    startTransition(async () => {
      const res = await verificarEmpresa(empresaId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="success" disabled={pending} onClick={verificar}>
        <BadgeCheck className="h-4 w-4" />
        {pending ? "Verificando…" : "Verificar"}
      </Button>
      {error && <span className="text-xs font-medium text-danger-500">{error}</span>}
    </div>
  );
}
