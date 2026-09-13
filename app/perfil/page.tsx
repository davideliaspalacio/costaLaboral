import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MapPin, Briefcase, Award, Crown, PencilLine, Building2 } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getPostulacionesDeCandidato, type PostulacionDeCandidato } from "@/lib/data/postulaciones";
import { getBeneficiosCandidato } from "@/lib/billing/suscripciones";
import { ESTADOS_RETIRABLES } from "@/lib/postulaciones-reglas";
import { esVisibleEnPortal } from "@/lib/vacante";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { iniciales, formatSalario, tiempoRelativo } from "@/lib/utils";
import { AREAS, NIVELES_EDUCATIVOS, PLAN_NOMBRE, estadoPostulacionInfo } from "@/lib/constants";
import { PerfilForm } from "./perfil-form";
import { RetirarPostulacion } from "./retirar-postulacion";

export const metadata: Metadata = { title: "Mi perfil" };

const labelArea = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;
const labelNivel = (v: string) => NIVELES_EDUCATIVOS.find((n) => n.value === v)?.label ?? v;
const fmtFecha = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
const fmtFechaCorta = (d: string) =>
  new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function PerfilPage() {
  const candidato = await getCandidato();
  if (!candidato) {
    const sesion = await getUsuario();
    if (!sesion) redirect("/login?next=/perfil");
    if (sesion.tipo === "empresa") redirect("/empresa/panel");
    redirect("/registro-candidato");
  }

  const [{ plan, suscripcion }, posts] = await Promise.all([
    getBeneficiosCandidato(candidato.id),
    getPostulacionesDeCandidato(candidato.id),
  ]);
  const esGratis = plan === "gratis";

  return (
    <main className="container-page space-y-8 py-8">
      <header className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:text-left">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-brand-600 text-2xl font-extrabold text-white shadow-[var(--shadow-sticker)]">
          {iniciales(candidato.nombre)}
        </div>
        <div className="min-w-0">
          <p className="kicker">Mi perfil</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{candidato.nombre}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-ink-soft sm:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted" /> {candidato.ciudad}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-muted" /> {labelArea(candidato.area_interes)}
            </span>
            <Badge tone="brand">
              <Award className="h-3 w-3" /> {labelNivel(candidato.nivel_educativo)}
            </Badge>
          </div>
        </div>
      </header>

      {/* Plan: servicios opcionales, nunca limita postularse */}
      <section aria-labelledby="plan-title">
        <Card>
          <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-brand-600" />
                <h2 id="plan-title" className="font-display text-lg font-extrabold text-ink">
                  Plan {PLAN_NOMBRE[plan]}
                </h2>
              </div>
              {suscripcion && !esGratis ? (
                <p className="mt-2 text-sm text-ink-soft">
                  {suscripcion.cancelar_al_final ? "Se cancela" : "Vigente hasta"} el{" "}
                  <strong className="font-bold text-ink">{fmtFecha(suscripcion.periodo_fin)}</strong>
                  {suscripcion.cancelar_al_final
                    ? ". Conservas los beneficios hasta esa fecha."
                    : suscripcion.estado === "past_due"
                      ? ". Hay un pago pendiente: revisa tu medio de pago."
                      : "."}
                </p>
              ) : (
                <p className="mt-2 text-sm text-ink-soft">
                  Ver vacantes, postularte y ver tu match es gratis. Los planes suman servicios opcionales como hoja de
                  vida y LinkedIn con IA.
                </p>
              )}
            </div>
            <Link href="/planes" className={buttonVariants({ variant: esGratis ? "accent" : "outline", size: "md" })}>
              {esGratis ? "Conocer los planes" : "Gestionar plan"}
            </Link>
          </CardBody>
        </Card>
      </section>

      <section aria-labelledby="posts-title" className="space-y-4">
        <h2 id="posts-title" className="font-display text-lg font-extrabold text-ink">
          Mis postulaciones
        </h2>
        {posts.length === 0 ? (
          <EmptyState
            icon={<Briefcase className="h-6 w-6" />}
            title="Aún no te has postulado"
            description="Mira tus vacantes recomendadas o explora todo el portal y postúlate gratis."
            action={
              <Link href="/mis-vacantes" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Ver mis recomendadas
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {posts.map((p) => (
              <PostulacionItem key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="editar-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <PencilLine className="h-5 w-5 text-brand-600" />
          <h2 id="editar-title" className="font-display text-lg font-extrabold text-ink">
            Editar mi perfil
          </h2>
        </div>
        <Card>
          <CardBody>
            <PerfilForm candidato={candidato} />
          </CardBody>
        </Card>
        <p className="text-sm text-muted">
          Tus autorizaciones (WhatsApp, visibilidad del perfil) y la eliminación de tu cuenta están en{" "}
          <Link href="/cuenta" className="font-semibold text-brand-700 hover:underline">
            Mi cuenta
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

function PostulacionItem({ p }: { p: PostulacionDeCandidato }) {
  const est = estadoPostulacionInfo(p.estado);
  const vac = p.vacante;
  const visible = vac ? esVisibleEnPortal(vac) : false;
  const titulo = vac?.titulo ?? "Vacante eliminada";
  const retirable = ESTADOS_RETIRABLES.includes(p.estado);

  return (
    <li className="rounded-2xl border-2 border-ink bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {vac && visible ? (
            <Link href={`/v/${vac.id}`} className="font-display text-base font-extrabold text-ink hover:text-brand-700 hover:underline">
              {titulo}
            </Link>
          ) : (
            <p className="font-display text-base font-extrabold text-ink">{titulo}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
            {vac?.empresa?.nombre_negocio && (
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-muted" /> {vac.empresa.nombre_negocio}
              </span>
            )}
            {vac?.ciudad && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-muted" /> {vac.ciudad}
              </span>
            )}
            {vac && <span className="font-semibold text-brand-700">{formatSalario(vac.salario_min, vac.salario_max)}</span>}
          </div>
          <p className="mt-1 text-xs text-muted">
            Te postulaste {tiempoRelativo(p.creado_en)}
            {typeof p.score_match === "number" && ` · ${p.score_match}% match`}
            {vac && !visible && " · La vacante ya no está publicada"}
          </p>
        </div>
        <Badge tone={est.tono} className="shrink-0 self-start">
          {est.labelCandidato}
        </Badge>
      </div>

      {p.historial.length > 0 && (
        <ol className="mt-4 space-y-2 border-l-2 border-line pl-4" aria-label="Historial de la postulación">
          {p.historial.map((h) => (
            <li key={h.id} className="relative text-xs text-ink-soft">
              <span className="absolute -left-[1.4rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-ink bg-sol-300" aria-hidden />
              <span className="font-bold text-ink">{estadoPostulacionInfo(h.estado_nuevo).labelCandidato}</span>
              <span className="text-muted"> · {fmtFechaCorta(h.creado_en)}</span>
            </li>
          ))}
        </ol>
      )}

      {retirable && (
        <div className="mt-3 border-t-2 border-line pt-3">
          <RetirarPostulacion postulacionId={p.id} titulo={titulo} />
        </div>
      )}
    </li>
  );
}
