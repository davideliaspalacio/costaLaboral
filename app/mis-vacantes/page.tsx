import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SlidersHorizontal, Compass, Wand2, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getRecomendaciones } from "@/lib/data/vacantes";
import { idsPostulados } from "@/lib/data/postulaciones";
import { registrarEvento } from "@/lib/eventos";
import { resumenMatch } from "@/lib/matching";
import { VacanteCard } from "@/components/vacante/vacante-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { AREAS } from "@/lib/constants";
import { BienvenidaBanner } from "./bienvenida-banner";

export const metadata: Metadata = { title: "Recomendadas para ti" };

const labelArea = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;

export default async function MisVacantesPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const candidato = await getCandidato();
  if (!candidato) {
    const sesion = await getUsuario();
    if (!sesion) redirect("/login?next=/mis-vacantes");
    if (sesion.tipo === "empresa") redirect("/empresa/panel");
    redirect("/registro-candidato");
  }

  const [{ bienvenida }, recomendadas, aplicados] = await Promise.all([
    searchParams,
    getRecomendaciones(candidato),
    idsPostulados(candidato.id),
  ]);

  await registrarEvento({
    tipo: "recomendaciones_mostradas",
    actor_id: candidato.id,
    actor_tipo: "candidato",
    meta: { cantidad: recomendadas.length, vacante_ids: recomendadas.map((v) => v.id) },
  });

  return (
    <main className="container-page space-y-6 py-8">
      {bienvenida === "1" && <BienvenidaBanner nombre={candidato.nombre} />}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="kicker">Tus recomendadas</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Vacantes que encajan contigo
          </h1>
          <p className="text-sm text-muted">
            {recomendadas.length} {recomendadas.length === 1 ? "recomendación" : "recomendaciones"} para tu perfil de{" "}
            {labelArea(candidato.area_interes)} en {candidato.ciudad}
          </p>
        </div>
        <Link href="/ofertas?src=busqueda" className={buttonVariants({ variant: "outline", size: "md" })}>
          Ver todas las vacantes <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border-2 border-ink bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          El % de match es una <strong className="font-bold">orientación</strong> según tu ciudad, área, estudios y
          disponibilidad; no es una probabilidad de contratación. Puedes postularte gratis a cualquier vacante del
          portal, aunque no aparezca aquí.
        </p>
      </div>

      {recomendadas.length === 0 ? (
        <EmptyState
          icon={<Compass className="h-6 w-6" />}
          title="Todavía no hay vacantes que encajen con tu perfil"
          description="Completa o ajusta tu perfil para mejorar las recomendaciones, o explora todas las vacantes del portal."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/perfil" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Completar mi perfil
              </Link>
              <Link href="/ofertas?src=busqueda" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Explorar vacantes
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recomendadas.map((v) => {
              const postulado = aplicados.has(v.id);
              return (
                <li key={v.id} className="flex flex-col gap-2">
                  <VacanteCard
                    vacante={v}
                    score={v.score}
                    empresaNombre={v.empresa?.nombre_negocio}
                    href={`/v/${v.id}?src=recomendacion`}
                    className="flex-1"
                  />
                  <div className="flex flex-wrap items-center gap-2 px-1 text-xs text-ink-soft">
                    {postulado && (
                      <span className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-2 py-0.5 font-bold text-canvas">
                        <CheckCircle2 className="h-3 w-3" /> Ya te postulaste
                      </span>
                    )}
                    <span className="first-letter:uppercase">{resumenMatch(v.detalle)}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="pt-2 text-center">
            <Link
              href="/perfil"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
            >
              <SlidersHorizontal className="h-4 w-4" />
              ¿Pocas recomendaciones? Ajusta tu perfil
            </Link>
          </div>
        </>
      )}

      {/* Servicio opcional: no condiciona ver ni postularse a vacantes. */}
      <aside className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-sol-300 p-4 sm:flex-row sm:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-surface">
          <Wand2 className="h-5 w-5 text-ink" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-extrabold text-ink">Servicio opcional: hoja de vida y LinkedIn con IA</p>
          <p className="text-sm font-medium text-ink-soft">
            Ordena tu experiencia y preséntala mejor. No lo necesitas para postularte.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/hoja-de-vida" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Hoja de vida
          </Link>
          <Link href="/linkedin" className={buttonVariants({ variant: "outline", size: "sm" })}>
            LinkedIn
          </Link>
        </div>
      </aside>
    </main>
  );
}
