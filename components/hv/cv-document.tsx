import { MapPin, Phone, Mail } from "lucide-react";
import type { ContenidoHV } from "@/lib/ai";

/* ============================================================
   Vista "documento" de una hoja de vida. Estilo sticker limpio,
   pensado para leer/imprimir. Sin interacción (server-safe).
   ============================================================ */

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="mb-3 border-b-2 border-ink pb-1.5 font-display text-sm font-extrabold uppercase tracking-wide text-ink">
        {titulo}
      </h3>
      {children}
    </section>
  );
}

export function CvDocument({
  nombre,
  ciudad,
  whatsapp,
  email,
  contenido,
}: {
  nombre: string;
  ciudad: string;
  whatsapp?: string | null;
  email?: string | null;
  contenido: ContenidoHV;
}) {
  return (
    <article className="rounded-2xl border-2 border-ink bg-surface p-6 sm:p-8">
      {/* Cabecera del documento */}
      <header className="border-b-2 border-ink pb-5">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{nombre}</h2>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm font-medium text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-brand-600" /> {ciudad}
          </span>
          {whatsapp && (
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-brand-600" /> {whatsapp}
            </span>
          )}
          {email && (
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-brand-600" /> {email}
            </span>
          )}
        </div>
      </header>

      {contenido.resumen && (
        <Seccion titulo="Perfil profesional">
          <p className="text-[15px] leading-relaxed text-ink-soft">{contenido.resumen}</p>
        </Seccion>
      )}

      {contenido.habilidades?.length > 0 && (
        <Seccion titulo="Habilidades">
          <ul className="flex flex-wrap gap-2">
            {contenido.habilidades.map((h, i) => (
              <li key={i} className="chip">
                {h}
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {contenido.experiencia?.length > 0 && (
        <Seccion titulo="Experiencia">
          <div className="space-y-5">
            {contenido.experiencia.map((e, i) => (
              <div key={i} className="border-l-2 border-line pl-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="font-display font-extrabold text-ink">{e.cargo}</p>
                  {e.periodo && e.periodo !== "—" && (
                    <span className="text-xs font-bold uppercase tracking-wide text-muted">{e.periodo}</span>
                  )}
                </div>
                {e.empresa && <p className="text-sm font-semibold text-brand-700">{e.empresa}</p>}
                {e.logros?.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {e.logros.map((lg, j) => (
                      <li key={j} className="flex gap-2 text-[15px] leading-relaxed text-ink-soft">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
                        <span>{lg}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Seccion>
      )}

      {contenido.educacion?.length > 0 && (
        <Seccion titulo="Educación">
          <ul className="space-y-1.5">
            {contenido.educacion.map((ed, i) => (
              <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-ink-soft">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                <span>{ed}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      {contenido.logros?.length > 0 && (
        <Seccion titulo="Logros y fortalezas">
          <ul className="space-y-1.5">
            {contenido.logros.map((lg, i) => (
              <li key={i} className="flex gap-2 text-[15px] leading-relaxed text-ink-soft">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sol-400" aria-hidden />
                <span>{lg}</span>
              </li>
            ))}
          </ul>
        </Seccion>
      )}
    </article>
  );
}
