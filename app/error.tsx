"use client";

import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function ErrorPagina({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="container-page py-16 sm:py-24">
      <div className="card mx-auto max-w-xl p-8 text-center shadow-[var(--shadow-sticker-lg)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-accent-100 text-accent-700">
          <TriangleAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="kicker mt-5">Error inesperado</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Se nos enredó la pita
        </h1>
        <p className="mt-3 text-ink-soft">
          Algo falló al cargar esta página. Ya quedó registrado. Intenta de nuevo en unos segundos.
        </p>
        {error.digest && (
          <p className="mt-4 text-xs text-muted">
            Código de referencia: <code className="font-mono font-bold text-ink">{error.digest}</code>
          </p>
        )}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={() => unstable_retry()}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
