"use client";

import { useState } from "react";
import { Share2, Link2, Check, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Botones para compartir una vacante/artículo por WhatsApp, redes o copiando el enlace. */
export function ShareButtons({
  url,
  titulo,
  className,
}: {
  url: string;
  titulo: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const texto = `${titulo} · CostaLaboral`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`;
  const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const x = `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(url)}`;

  async function nativo() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: texto, url });
      } catch {
        /* cancelado */
      }
    } else {
      copiar();
    }
  }
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* noop */
    }
  }

  const chip =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border-2 border-ink bg-surface px-3.5 text-sm font-bold text-ink transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker)]";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <a href={wa} target="_blank" rel="noopener noreferrer" className={cn(chip, "bg-[#25D366]")}>
        <MessageCircle className="h-4 w-4" /> WhatsApp
      </a>
      <a href={fb} target="_blank" rel="noopener noreferrer" className={chip} aria-label="Compartir en Facebook">
        Facebook
      </a>
      <a href={x} target="_blank" rel="noopener noreferrer" className={chip} aria-label="Compartir en X">
        X
      </a>
      <button type="button" onClick={copiar} className={chip} aria-label="Copiar enlace">
        {copiado ? <Check className="h-4 w-4 text-success-600" /> : <Link2 className="h-4 w-4" />}
        {copiado ? "¡Copiado!" : "Copiar"}
      </button>
      <button type="button" onClick={nativo} className={cn(chip, "sm:hidden")} aria-label="Compartir">
        <Share2 className="h-4 w-4" /> Compartir
      </button>
    </div>
  );
}
