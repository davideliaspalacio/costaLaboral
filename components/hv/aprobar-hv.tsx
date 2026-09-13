"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aprobarHojaDeVida } from "@/lib/actions/hoja-de-vida";
import { aprobarLinkedIn } from "@/lib/actions/linkedin";

/** Casilla de confirmación + botón de aprobación (hoja de vida o perfil de LinkedIn). */
export function AprobarContenido({ tipo, id }: { tipo: "hv" | "linkedin"; id?: string }) {
  const router = useRouter();
  const [confirmo, setConfirmo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const texto =
    tipo === "hv"
      ? "Revisé mi hoja de vida y confirmo que toda la información es real"
      : "Revisé mi perfil de LinkedIn y confirmo que toda la información es real";

  function aprobar() {
    setError(null);
    start(async () => {
      const r = tipo === "hv" && id ? await aprobarHojaDeVida(id, confirmo) : await aprobarLinkedIn(confirmo);
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <div className="card-pop bg-sol-100 p-5 sm:p-6">
      <p className="font-display text-lg font-extrabold text-ink">Antes de usarla, apruébala</p>
      <p className="mt-1 text-sm text-ink-soft">
        La IA puede equivocarse. Lee todo con calma y corrige lo que no sea exacto. Solo lo aprobado se puede copiar{tipo === "hv" ? " o descargar" : ""}.
      </p>
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={confirmo}
          onChange={(e) => setConfirmo(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
        />
        <span className="text-sm font-semibold text-ink">{texto}</span>
      </label>
      {error && <p className="mt-3 text-sm font-semibold text-danger-600">{error}</p>}
      <Button type="button" variant="brand" className="mt-4" disabled={!confirmo || pending} onClick={aprobar}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
        Aprobar
      </Button>
    </div>
  );
}
