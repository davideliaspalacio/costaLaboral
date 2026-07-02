import { MessageCircle, Send } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, waLink } from "@/lib/utils";

type NotifItem = {
  id: string;
  mensaje: string;
  leido?: boolean;
  candidato?: { nombre?: string | null; whatsapp?: string | null } | null;
};

/** Lista de notificaciones WhatsApp pendientes de envío manual (Fase 1, hipótesis H3). */
export function NotifList({ notifs }: { notifs: NotifItem[] }) {
  if (notifs.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-ink">Sin notificaciones por ahora</h3>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Cuando el matching genere avisos para candidatos, aparecerán aquí para enviarlos por
          WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {notifs.map((n) => {
        const whatsapp = n.candidato?.whatsapp ?? "";
        return (
          <li key={n.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">
                  {n.candidato?.nombre ?? "Candidato sin nombre"}
                </span>
                {n.leido ? (
                  <Badge tone="success">Leído</Badge>
                ) : (
                  <Badge tone="warn">Por enviar</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{n.mensaje}</p>
            </div>
            <a
              href={waLink(whatsapp, n.mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!whatsapp}
              className={cn(
                buttonVariants({ variant: "wsp", size: "sm" }),
                "shrink-0",
                !whatsapp && "pointer-events-none opacity-50",
              )}
            >
              <Send className="h-4 w-4" />
              Enviar por WhatsApp
            </a>
          </li>
        );
      })}
    </ul>
  );
}
