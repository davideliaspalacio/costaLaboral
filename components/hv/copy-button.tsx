"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Botón que copia texto al portapapeles y muestra confirmación. */
export function CopyButton({
  text,
  label = "Copiar",
  labelOk = "¡Copiado!",
  variant = "outline",
  size = "sm",
  className,
}: {
  text: string;
  label?: string;
  labelOk?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback para navegadores sin permiso de clipboard.
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
  }

  return (
    <Button type="button" variant={copiado ? "success" : variant} size={size} className={className} onClick={copiar}>
      {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copiado ? labelOk : label}
    </Button>
  );
}
