import { IdCard } from "lucide-react";
import { CopyButton } from "./copy-button";
import { linkedInATexto } from "@/lib/hv-texto";

/* ============================================================
   Bloque de optimización de LinkedIn (titular + acerca de) con
   botones para copiar cada parte. Estilo sticker.
   ============================================================ */

export function LinkedInBlock({ titular, acerca }: { titular: string; acerca: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-brand-50 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-ink bg-brand-500 text-white">
            <IdCard className="h-5 w-5" />
          </span>
          <h3 className="font-display text-lg font-extrabold text-ink">Optimiza tu LinkedIn</h3>
        </div>
        <CopyButton text={linkedInATexto({ titular, acerca })} label="Copiar todo" variant="brand" />
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-xl border-2 border-ink bg-surface p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="label-base mb-0">Titular</p>
            <CopyButton text={titular} />
          </div>
          <p className="font-semibold text-ink">{titular}</p>
        </div>

        <div className="rounded-xl border-2 border-ink bg-surface p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="label-base mb-0">Acerca de</p>
            <CopyButton text={acerca} />
          </div>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{acerca}</p>
        </div>
      </div>
    </div>
  );
}
