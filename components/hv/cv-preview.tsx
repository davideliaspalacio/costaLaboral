import Link from "next/link";
import { Lock, MapPin, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { PreviewHV } from "@/lib/ia/preview";

/* ============================================================
   Vista previa del plan Gratis: resumen y primera experiencia
   completos; el resto se dibuja como bloques atenuados (el texto
   nunca llega al navegador) con CTA a /planes.
   ============================================================ */

function Barras({ n, anchoBase = 70 }: { n: number; anchoBase?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: Math.max(1, n) }).map((_, i) => (
        <div key={i} className="h-3 rounded-full bg-line" style={{ width: `${anchoBase - ((i * 13) % 30)}%` }} />
      ))}
    </div>
  );
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 border-b-2 border-ink pb-1.5 font-display text-sm font-extrabold uppercase tracking-wide text-ink">
      {children}
    </h3>
  );
}

export function CvPreview({ nombre, ciudad, preview }: { nombre: string; ciudad: string; preview: PreviewHV }) {
  const { bloqueado } = preview;
  const hayBloqueado =
    bloqueado.habilidades + bloqueado.experiencias.length + bloqueado.educacion + bloqueado.logros > 0;

  return (
    <article className="rounded-2xl border-2 border-ink bg-surface p-6 sm:p-8">
      <header className="border-b-2 border-ink pb-5">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{nombre}</h2>
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft">
          <MapPin className="h-4 w-4 text-brand-600" /> {ciudad}
        </p>
      </header>

      {preview.resumen && (
        <section className="mt-6">
          <Titulo>Perfil profesional</Titulo>
          <p className="text-[15px] leading-relaxed text-ink-soft">{preview.resumen}</p>
        </section>
      )}

      {preview.primeraExperiencia && (
        <section className="mt-6">
          <Titulo>Experiencia</Titulo>
          <div className="border-l-2 border-line pl-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-display font-extrabold text-ink">{preview.primeraExperiencia.cargo}</p>
              {preview.primeraExperiencia.periodo && (
                <span className="text-xs font-bold uppercase tracking-wide text-muted">{preview.primeraExperiencia.periodo}</span>
              )}
            </div>
            <p className="text-sm font-semibold text-brand-700">{preview.primeraExperiencia.empresa}</p>
            <ul className="mt-2 space-y-1.5">
              {preview.primeraExperiencia.logros.map((lg, j) => (
                <li key={j} className="flex gap-2 text-[15px] leading-relaxed text-ink-soft">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
                  <span>{lg}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {hayBloqueado && (
        <div className="relative mt-6">
          <div className="pointer-events-none select-none space-y-6 opacity-40" aria-hidden>
            {bloqueado.experiencias.map((n, i) => (
              <div key={i} className="border-l-2 border-line pl-4">
                <div className="mb-2 h-4 w-1/3 rounded-full bg-ink-soft" />
                <Barras n={n} />
              </div>
            ))}
            {bloqueado.habilidades > 0 && (
              <section>
                <Titulo>Habilidades</Titulo>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: bloqueado.habilidades }).map((_, i) => (
                    <span key={i} className="h-7 w-24 rounded-full border-2 border-line bg-canvas" />
                  ))}
                </div>
              </section>
            )}
            {bloqueado.educacion > 0 && (
              <section>
                <Titulo>Educación</Titulo>
                <Barras n={bloqueado.educacion} anchoBase={60} />
              </section>
            )}
            {bloqueado.logros > 0 && (
              <section>
                <Titulo>Logros y fortalezas</Titulo>
                <Barras n={bloqueado.logros} />
              </section>
            )}
          </div>

          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="card-pop max-w-sm p-5 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl border-2 border-ink bg-sol-300">
                <Lock className="h-6 w-6 text-ink" />
              </span>
              <p className="mt-3 font-display text-lg font-extrabold text-ink">El resto de tu hoja de vida está listo</p>
              <p className="mt-1 text-sm text-ink-soft">
                Con un plan pago la ves completa, la editas, la apruebas y la descargas en PDF.
              </p>
              <Link href="/planes" className={`${buttonVariants({ variant: "accent", size: "md" })} mt-4`}>
                Ver planes <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
