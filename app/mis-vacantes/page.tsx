import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SlidersHorizontal, Compass, AlertTriangle, Wand2 } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getMisMatches } from "@/lib/data/vacantes";
import { estadoPlanDeCandidato, idsPostulados } from "@/lib/data/postulaciones";
import { VacanteCard } from "@/components/vacante/vacante-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { AREAS } from "@/lib/constants";
import { BienvenidaBanner } from "./bienvenida-banner";

export const metadata: Metadata = { title: "Tus vacantes" };

const labelArea = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;

export default async function MisVacantesPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const candidato = await getCandidato();
  if (!candidato) {
    const sesion = await getUsuario();
    if (sesion?.tipo === "empresa") redirect("/empresa/panel");
    redirect("/registro-candidato");
  }

  const [{ bienvenida }, [matches, estado, aplicados]] = await Promise.all([
    searchParams,
    Promise.all([
      getMisMatches(candidato),
      estadoPlanDeCandidato(candidato),
      idsPostulados(candidato.id),
    ]),
  ]);

  const sinCupo = estado.restantes === 0;

  return (
    <main className="container-page space-y-6 py-8">
      {bienvenida === "1" && <BienvenidaBanner nombre={candidato.nombre} />}

      {/* Cabecera */}
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Tus vacantes</h1>
        <p className="text-sm text-muted">
          {matches.length} {matches.length === 1 ? "coincidencia" : "coincidencias"} para tu perfil de{" "}
          {labelArea(candidato.area_interes)} en {candidato.ciudad}
        </p>
      </header>

      {/* Barra de estado del plan */}
      {sinCupo ? (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-warn-50 p-4 text-warn-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm font-medium text-ink-soft">
              Se te acabaron las postulaciones de este ciclo. Sube de plan para seguir aplicando.
            </p>
          </div>
          <Link href="/planes" className={buttonVariants({ variant: "accent", size: "md" })}>
            Ver planes
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-ink bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          {estado.restantes == null
            ? "Tienes postulaciones ilimitadas ✨"
            : `Te quedan ${estado.restantes} ${estado.restantes === 1 ? "postulación" : "postulaciones"} este ciclo`}
        </div>
      )}

      {/* Promo destacada: Hoja de vida con IA */}
      <Link
        href="/hoja-de-vida"
        className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-sol-300 p-4 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker-lg)]"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-surface">
          <Wand2 className="h-5 w-5 text-ink" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold text-ink">Arma tu hoja de vida con IA</p>
          <p className="text-sm font-medium text-ink-soft">
            Responde unas preguntas y ten tu HV y tu LinkedIn listos en minutos.
          </p>
        </div>
        <span className="hidden shrink-0 font-bold text-ink sm:inline">Empezar →</span>
      </Link>

      {/* Grid de vacantes */}
      {matches.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title="Aún no hay vacantes que encajen"
          description="Te avisaremos por WhatsApp apenas llegue una. Mientras tanto, amplía tu perfil o revisa los planes para ver más."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/perfil" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Ampliar mi perfil
              </Link>
              <Link href="/planes" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Ver planes
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((v) => (
              <VacanteCard key={v.id} vacante={v} score={v.score} yaPostulado={aplicados.has(v.id)} />
            ))}
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/perfil"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              <SlidersHorizontal className="h-4 w-4" />
              ¿Pocas vacantes? Ajusta tu perfil
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
