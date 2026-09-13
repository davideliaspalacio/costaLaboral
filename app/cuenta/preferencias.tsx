"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Eye } from "lucide-react";
import { actualizarPreferencia, type PreferenciaCandidato } from "@/lib/actions/cuenta";
import { cn } from "@/lib/utils";

type Props = { wspOptIn: boolean; perfilVisible: boolean };

const OPCIONES: { id: PreferenciaCandidato; titulo: string; detalle: string; icono: typeof Eye }[] = [
  {
    id: "whatsapp",
    titulo: "Recibir vacantes por WhatsApp",
    detalle:
      "Te escribimos solo para avisarte de vacantes que encajan con tu perfil. Si lo desactivas, dejamos de enviarte mensajes de inmediato.",
    icono: MessageCircle,
  },
  {
    id: "perfil_visible_empresas",
    titulo: "Permitir que empresas Pro vean mi perfil anonimizado e invitarme a postular",
    detalle:
      "Las empresas ven tu ciudad, área, estudios y disponibilidad, sin tu nombre ni contacto. Tus datos solo se comparten cuando tú te postulas.",
    icono: Eye,
  },
];

export function Preferencias({ wspOptIn, perfilVisible }: Props) {
  const [valores, setValores] = useState<Record<PreferenciaCandidato, boolean>>({
    whatsapp: wspOptIn,
    perfil_visible_empresas: perfilVisible,
  });
  const [error, setError] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<PreferenciaCandidato | null>(null);
  const [, startTransition] = useTransition();

  function cambiar(id: PreferenciaCandidato) {
    const nuevo = !valores[id];
    setError(null);
    setPendiente(id);
    startTransition(async () => {
      const r = await actualizarPreferencia(id, nuevo);
      if ("error" in r) setError(r.error);
      else setValores((v) => ({ ...v, [id]: nuevo }));
      setPendiente(null);
    });
  }

  return (
    <div className="space-y-3">
      {OPCIONES.map(({ id, titulo, detalle, icono: Icono }) => {
        const activo = valores[id];
        const cargando = pendiente === id;
        return (
          <div key={id} className="flex items-start gap-4 rounded-xl border-2 border-ink bg-surface p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-brand-50 text-brand-600">
              <Icono className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p id={`pref-${id}`} className="font-bold text-ink">
                {titulo}
              </p>
              <p className="mt-0.5 text-sm text-muted">{detalle}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={activo}
              aria-labelledby={`pref-${id}`}
              disabled={pendiente !== null}
              onClick={() => cambiar(id)}
              className={cn(
                "relative mt-1 h-7 w-12 shrink-0 rounded-full border-2 border-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-60",
                activo ? "bg-brand-500" : "bg-line",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full border-2 border-ink bg-surface transition-transform",
                  activo ? "translate-x-5" : "translate-x-0.5",
                  cargando && "animate-pulse",
                )}
              />
              <span className="sr-only">{activo ? "Activado" : "Desactivado"}</span>
            </button>
          </div>
        );
      })}
      {error && (
        <p role="alert" className="rounded-xl border-2 border-danger-500 bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
