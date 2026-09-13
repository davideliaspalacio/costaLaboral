"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ActualizarEstado() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button type="button" variant="outline" onClick={() => startTransition(() => router.refresh())} disabled={pending} aria-busy={pending}>
      <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
      {pending ? "Actualizando…" : "Actualizar estado"}
    </Button>
  );
}
