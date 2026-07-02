"use client";

import { useState } from "react";
import { PartyPopper, X } from "lucide-react";

export function BienvenidaBanner({ nombre }: { nombre: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="relative flex items-start gap-3 rounded-2xl border-2 border-ink bg-brand-50 p-4 pr-10 text-brand-700">
      <PartyPopper className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">
        ¡Bienvenido {nombre}! Estas son las vacantes que encajan contigo.
      </p>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-brand-600 transition hover:bg-brand-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
