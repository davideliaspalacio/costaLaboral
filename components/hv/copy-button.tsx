"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { registrarExportacionHV } from "@/lib/actions/hoja-de-vida";
import { registrarExportacionLinkedIn, type BloqueLinkedIn } from "@/lib/actions/linkedin";

/** Qué registrar después de copiar (serializable: se puede pasar desde un Server Component). */
export type RegistroCopia = { tipo: "hv"; id: string } | { tipo: "linkedin"; bloque: BloqueLinkedIn };

/** Botón que copia texto al portapapeles, muestra confirmación y registra la exportación. */
export function CopyButton({
  text,
  label = "Copiar",
  labelOk = "¡Copiado!",
  variant = "outline",
  size = "sm",
  className,
  registro,
}: {
  text: string;
  label?: string;
  labelOk?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  registro?: RegistroCopia;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Respaldo para navegadores sin permiso de portapapeles.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* noop */
      }
      document.body.removeChild(ta);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);

    if (registro?.tipo === "hv") void registrarExportacionHV(registro.id, "copiar").catch(() => undefined);
    if (registro?.tipo === "linkedin") void registrarExportacionLinkedIn(registro.bloque).catch(() => undefined);
  }

  return (
    <Button type="button" variant={copiado ? "success" : variant} size={size} className={className} onClick={copiar}>
      {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copiado ? labelOk : label}
    </Button>
  );
}
