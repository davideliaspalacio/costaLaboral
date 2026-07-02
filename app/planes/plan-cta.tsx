"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { activarPlan } from "@/lib/actions/candidato";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlanId } from "@/lib/constants";

/**
 * Botón de acción de cada tarjeta de plan.
 * - Plan gratis: enlaza al registro (no activa nada).
 * - Planes pagos: simula la activación (Fase 2 usará Wompi) con estado en vivo.
 */
export function PlanCta({
  plan,
  destacado,
}: {
  plan: PlanId;
  destacado?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan === "gratis") {
    return (
      <Link
        href="/registro-candidato"
        className={cn(buttonVariants({ variant: "outline", size: "lg", block: true }))}
      >
        Empezar gratis
      </Link>
    );
  }

  function onActivar() {
    setError(null);
    startTransition(async () => {
      const res = await activarPlan(plan);
      if (res?.ok) {
        setOk(true);
        router.refresh();
      } else if (res?.error) {
        setError(res.error);
      }
    });
  }

  if (ok) {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm font-semibold text-success-600"
      >
        <CheckCircle2 className="h-5 w-5" />
        ¡Plan activado!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={destacado ? "accent" : "primary"}
        size="lg"
        block
        onClick={onActivar}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Activando…" : "Activar plan de prueba"}
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm font-medium text-danger-500">
          {error}
        </p>
      )}
    </div>
  );
}
