"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarSeguimiento } from "@/lib/actions/empresa";
import { Select } from "@/components/ui/input";
import { ESTADOS_SEGUIMIENTO } from "@/lib/constants";

export function SeguimientoSelect({
  postulacionId,
  estado,
}: {
  postulacionId: string;
  estado: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(valor: string) {
    startTransition(async () => {
      await actualizarSeguimiento(postulacionId, valor);
      router.refresh();
    });
  }

  return (
    <Select
      aria-label="Estado de seguimiento"
      defaultValue={estado || "nuevo"}
      disabled={pending}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 py-0 text-sm sm:w-44"
    >
      {ESTADOS_SEGUIMIENTO.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </Select>
  );
}
