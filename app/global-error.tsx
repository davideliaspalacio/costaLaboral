"use client";

import "./globals.css";

/* Reemplaza el layout raíz cuando este falla: debe traer su propio <html>/<body>
   y no puede depender de Header/Footer ni de next/font. */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink antialiased">
        <title>Error · CostaLaboral</title>
        <main className="card w-full max-w-lg p-8 text-center shadow-[var(--shadow-sticker-lg)]">
          <p className="kicker">CostaLaboral</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight">No pudimos cargar el sitio</h1>
          <p className="mt-3 text-ink-soft">
            Tuvimos un problema de nuestro lado. Ya quedó registrado. Intenta de nuevo en unos segundos.
          </p>
          {error.digest && (
            <p className="mt-4 text-xs text-muted">
              Código de referencia: <code className="font-mono font-bold text-ink">{error.digest}</code>
            </p>
          )}
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-ink bg-ink px-5 text-sm font-bold text-canvas shadow-[var(--shadow-sticker)]"
            >
              Reintentar
            </button>
            {/* <a> y no <Link>: el router puede ser justo lo que falló. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- navegación completa a propósito */}
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-ink bg-surface px-5 text-sm font-bold text-ink shadow-[var(--shadow-sticker)]"
            >
              Ir al inicio
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
