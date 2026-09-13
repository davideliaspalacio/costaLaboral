"use client";

import { MessageCircle } from "lucide-react";
import { registrarContactoWhatsapp } from "@/lib/actions/empresa";
import { buttonVariants } from "@/components/ui/button";

/** Abre WhatsApp y registra el evento `contacto_whatsapp` (sin bloquear la navegación). */
export function BotonWhatsapp({ href, postulacionId }: { href: string; postulacionId: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        void registrarContactoWhatsapp(postulacionId).catch(() => undefined);
      }}
      className={buttonVariants({ variant: "wsp", size: "sm" })}
    >
      <MessageCircle className="h-4 w-4" /> WhatsApp
    </a>
  );
}
