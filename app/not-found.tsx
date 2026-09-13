import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: true },
};

const ENLACES = [
  { href: "/ofertas", titulo: "Ver ofertas", texto: "Todas las vacantes abiertas de la Costa." },
  { href: "/registro-candidato", titulo: "Crear mi cuenta", texto: "Recibe vacantes que encajan contigo." },
  { href: "/registro-empresa", titulo: "Publicar una vacante", texto: "Para negocios y empresas de la región." },
  { href: "/datos-personales", titulo: "Mis datos personales", texto: "Consultas y reclamos (Habeas Data)." },
];

export default function NotFound() {
  return (
    <div className="container-page py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-sol-300 text-ink">
          <Compass className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="kicker mt-5">Error 404</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Por aquí no es
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          La página que buscas no existe o la vacante ya no está publicada.
        </p>
        <div className="mt-7 flex justify-center">
          <Link href="/" className={buttonVariants({ size: "lg" })}>
            Volver al inicio
          </Link>
        </div>
      </div>

      <ul className="mx-auto mt-12 grid max-w-3xl gap-4 sm:grid-cols-2">
        {ENLACES.map((e) => (
          <li key={e.href}>
            <Link
              href={e.href}
              className="card block p-5 transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker)]"
            >
              <span className="font-display text-lg font-extrabold text-ink">{e.titulo}</span>
              <span className="mt-1 block text-sm text-muted">{e.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
