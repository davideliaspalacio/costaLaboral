import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Briefcase, Award, Crown, Sparkles, ArrowUpRight } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { estadoPlanDeCandidato, getPostulacionesDeCandidato } from "@/lib/data/postulaciones";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { iniciales, formatSalario, tiempoRelativo } from "@/lib/utils";
import { AREAS, NIVELES_EDUCATIVOS, ESTADOS_POSTULACION, PLANES } from "@/lib/constants";
import { PerfilForm } from "./perfil-form";

export const metadata: Metadata = { title: "Mi perfil" };

const labelArea = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;
const labelNivel = (v: string) => NIVELES_EDUCATIVOS.find((n) => n.value === v)?.label ?? v;
const estadoPost = (v: string) => ESTADOS_POSTULACION.find((e) => e.value === v);

const fmtFecha = (d: Date) => d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

export default async function PerfilPage() {
  const candidato = await getCandidato();
  if (!candidato) {
    const sesion = await getUsuario();
    if (sesion?.tipo === "empresa") redirect("/empresa/panel");
    redirect("/registro-candidato");
  }

  const [estado, posts] = await Promise.all([
    estadoPlanDeCandidato(candidato),
    getPostulacionesDeCandidato(candidato.id),
  ]);

  const planNombre = PLANES[estado.plan].nombre;
  const esGratis = estado.plan === "gratis";
  const pocasRestantes = estado.restantes != null && estado.restantes <= 1;

  return (
    <main className="container-page space-y-8 py-8">
      {/* Cabecera */}
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-brand-600 text-2xl font-extrabold text-white shadow-[var(--shadow-sticker)]">
          {iniciales(candidato.nombre)}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{candidato.nombre}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-ink-soft sm:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted" /> {candidato.ciudad}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-muted" /> {labelArea(candidato.area_interes)}
            </span>
          </div>
          <div className="mt-3 flex justify-center sm:justify-start">
            <Badge tone="brand">
              <Award className="h-3 w-3" /> {labelNivel(candidato.nivel_educativo)}
            </Badge>
          </div>
        </div>
      </header>

      {/* Plan */}
      <section aria-labelledby="plan-title">
        <Card>
          <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-brand-600" />
                <h2 id="plan-title" className="font-display text-lg font-extrabold text-ink">
                  Plan {planNombre}
                </h2>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Postulaciones</p>
                  <p className="font-semibold text-ink">
                    {estado.limite == null ? "Ilimitadas" : `${estado.usadas} / ${estado.limite}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Te quedan</p>
                  <p className="font-semibold text-ink">
                    {estado.restantes == null ? "Ilimitadas" : estado.restantes}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">Ciclo termina</p>
                  <p className="font-semibold text-ink">{fmtFecha(estado.ventanaFin)}</p>
                </div>
              </div>
            </div>
            {(esGratis || pocasRestantes) && (
              <Link href="/planes" className={buttonVariants({ variant: "accent", size: "lg" })}>
                {esGratis ? "Mejora tu plan" : "Sube de plan"}
              </Link>
            )}
          </CardBody>
        </Card>
      </section>

      {/* Mis postulaciones */}
      <section aria-labelledby="posts-title" className="space-y-4">
        <h2 id="posts-title" className="font-display text-lg font-extrabold text-ink">
          Mis postulaciones
        </h2>
        {posts.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-6 w-6" />}
            title="Aún no te has postulado"
            description="Explora las vacantes que encajan con tu perfil y postúlate al camello que te guste."
            action={
              <Link href="/mis-vacantes" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Ver mis vacantes
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => {
              const est = estadoPost(p.estado);
              const vac = p.vacante;
              return (
                <li key={p.id}>
                  <Link
                    href={vac ? `/v/${vac.id}` : "/mis-vacantes"}
                    className="group flex items-start justify-between gap-3 rounded-2xl border-2 border-ink bg-surface p-4 transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker)] sm:p-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink group-hover:text-brand-700">
                        {vac?.titulo ?? "Vacante"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                        {vac?.ciudad && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-muted" /> {vac.ciudad}
                          </span>
                        )}
                        {vac && <span className="font-semibold text-brand-700">{formatSalario(vac.salario_min, vac.salario_max)}</span>}
                      </div>
                      <p className="mt-2 text-xs text-muted">Postulado {tiempoRelativo(p.creado_en)}</p>
                    </div>
                    {est && (
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${est.color}`}>
                        {est.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Insignias (Fase 2) */}
      <section aria-labelledby="insignias-title" className="space-y-4">
        <h2 id="insignias-title" className="font-display text-lg font-extrabold text-ink">
          Insignias
        </h2>
        <div className="rounded-2xl border-2 border-dashed border-ink bg-canvas p-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border-2 border-ink bg-sol-300 text-ink">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="font-semibold text-ink-soft">Pronto: cursos con insignias verificables</p>
          <p className="mt-1 text-sm text-muted">Completa cursos cortos y destaca ante las empresas de la costa.</p>
        </div>
      </section>

      {/* Editar perfil */}
      <section aria-labelledby="editar-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-brand-600" />
          <h2 id="editar-title" className="font-display text-lg font-extrabold text-ink">
            Editar mi perfil
          </h2>
        </div>
        <Card>
          <CardBody>
            <PerfilForm candidato={candidato} />
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
