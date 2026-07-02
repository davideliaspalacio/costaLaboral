"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { cambiarEstadoVacante } from "@/lib/actions/empresa";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

export function VacanteToggle({ vacanteId, activa }: { vacanteId: string; activa: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await cambiarEstadoVacante(vacanteId, !activa);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={activa ? "outline" : "success"}
      disabled={pending}
      onClick={toggle}
    >
      {activa ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {pending ? "Guardando…" : activa ? "Pausar" : "Reactivar"}
    </Button>
  );
}
