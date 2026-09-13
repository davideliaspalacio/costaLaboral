import Link from "next/link";
import type { ReactNode } from "react";

/* ============================================================
   Piezas de presentación compartidas por /terminos, /privacidad y
   /datos-personales (Server Components, estilo "Caribe bravo").
   ============================================================ */

export type SeccionIndice = { id: string; titulo: string };

export function EncabezadoLegal({
  kicker,
  titulo,
  intro,
  version,
  vigencia,
  icono,
}: {
  kicker: string;
  titulo: string;
  intro: ReactNode;
  version?: string;
  vigencia?: string;
  icono: ReactNode;
}) {
  return (
    <header>
      <div className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-sol-300 text-ink shadow-[var(--shadow-sticker)]">
        {icono}
      </div>
      <p className="kicker mt-6">{kicker}</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{titulo}</h1>
      <div className="mt-4 text-lg leading-relaxed text-ink-soft">{intro}</div>
      {(version || vigencia) && (
        <dl className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
          {vigencia && (
            <div className="chip">
              <dt className="sr-only">Vigente desde</dt>
              <dd>Vigente desde {vigencia}</dd>
            </div>
          )}
          {version && (
            <div className="chip">
              <dt className="sr-only">Versión</dt>
              <dd>Versión {version}</dd>
            </div>
          )}
        </dl>
      )}
    </header>
  );
}

export function IndiceLegal({ secciones }: { secciones: SeccionIndice[] }) {
  return (
    <nav aria-label="Contenido" className="card mt-10 p-5 sm:p-6">
      <p className="font-display text-sm font-extrabold uppercase tracking-wide text-ink">Contenido</p>
      <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {secciones.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="font-medium text-ink-soft underline-offset-2 hover:text-brand-700 hover:underline">
              {i + 1}. {s.titulo}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SeccionLegal({
  id,
  numero,
  titulo,
  children,
}: {
  id: string;
  numero: number;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">
        <a href={`#${id}`} className="hover:text-brand-700">
          <span className="text-accent-600">{numero}.</span> {titulo}
        </a>
      </h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export function Lista({ children }: { children: ReactNode }) {
  return <ul className="space-y-2">{children}</ul>;
}

export function Punto({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-sm border border-ink bg-brand-400" />
      <span>{children}</span>
    </li>
  );
}

export function Destacado({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-ink bg-sol-100 p-4 font-medium text-ink shadow-[var(--shadow-sticker)]">
      {children}
    </div>
  );
}

export function Fuerte({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

export function EnlaceLegal({ href, children }: { href: string; children: ReactNode }) {
  const clase = "font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800";
  if (href.startsWith("http") || href.startsWith("mailto:")) {
    return (
      <a href={href} className={clase} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={clase}>
      {children}
    </Link>
  );
}

/** Tabla con scroll horizontal propio en pantallas pequeñas. */
export function TablaLegal({ columnas, filas }: { columnas: string[]; filas: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border-2 border-ink">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        <thead className="bg-ink text-canvas">
          <tr>
            {columnas.map((c) => (
              <th key={c} scope="col" className="px-4 py-2.5 font-bold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-surface">
          {filas.map((fila, i) => (
            <tr key={i} className="border-t-2 border-line align-top">
              {fila.map((celda, j) => (
                <td key={j} className={j === 0 ? "px-4 py-2.5 font-semibold text-ink" : "px-4 py-2.5"}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Si el dato del responsable sigue "[… POR DEFINIR]", lo resalta para que no pase desapercibido. */
export function DatoResponsable({ valor }: { valor: string }) {
  if (valor.includes("POR DEFINIR")) {
    return <mark className="rounded bg-sol-300 px-1 font-bold text-ink">{valor}</mark>;
  }
  return <Fuerte>{valor}</Fuerte>;
}

export const URL_SIC = "https://www.sic.gov.co";

/** "2026-09-14" → "14 de septiembre de 2026". */
export function fechaVersion(version: string): string {
  const [y, m, d] = version.split("-").map(Number);
  if (!y || !m || !d) return version;
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
