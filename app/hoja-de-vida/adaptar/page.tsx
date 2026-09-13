import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, Lock, Shuffle } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getBeneficiosCandidato } from "@/lib/billing/suscripciones";
import { getHojasAprobadas } from "@/lib/data/hoja-de-vida";
import { getVacanteSinContar } from "@/lib/data/vacantes";
import { registrarEvento } from "@/lib/eventos";
import { labelArea } from "@/lib/ia/perfil";
import { coincidenciasConVacante, reordenarHV } from "@/lib/ia/reordenar";
import { PLAN_NOMBRE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CvDocument } from "@/components/hv/cv-document";
import { GuardarVersionVacanteButton, ImprimirButton } from "@/components/hv/hv-acciones";
import { PrintStyles } from "@/components/hv/print-styles";

export const metadata: Metadata = { title: "Adapta tu hoja de vida a la vacante", robots: { index: false } };

const UUID = /^[0-9a-f-]{36}$/i;

/* HV dinámica opción A: reordena (sin IA y sin cambiar texto) según la vacante. */
export default async function AdaptarHojaDeVidaPage({
  searchParams,
}: {
  searchParams: Promise<{ vacante?: string; hv?: string }>;
}) {
  const sp = await searchParams;
  const vacanteId = sp.vacante && UUID.test(sp.vacante) ? sp.vacante : null;
  if (!vacanteId) notFound();

  const candidato = await getCandidato();
  if (!candidato) {
    const sesion = await getUsuario();
    if (sesion?.tipo === "empresa") redirect(`/v/${vacanteId}`);
    redirect(`/login?next=${encodeURIComponent(`/hoja-de-vida/adaptar?vacante=${vacanteId}`)}`);
  }

  const [vacante, { beneficios }] = await Promise.all([getVacanteSinContar(vacanteId), getBeneficiosCandidato(candidato.id)]);
  if (!vacante) notFound();

  const volver = (
    <Link href={`/v/${vacante.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
      <ArrowLeft className="h-4 w-4" /> Volver a la vacante
    </Link>
  );

  if (beneficios.cvDinamico === "no") {
    return (
      <div className="container-page py-10 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-4">
          {volver}
          <div className="card-pop overflow-hidden">
            <div className="border-b-2 border-ink bg-sol-300 px-6 py-8 text-center sm:px-10">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-surface">
                <Lock className="h-7 w-7 text-ink" />
              </span>
              <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Adapta tu hoja de vida a cada vacante
              </h1>
            </div>
            <div className="space-y-4 p-6 sm:p-8">
              <p className="text-ink-soft">
                Ponemos primero las habilidades, experiencias y logros que más se relacionan con{" "}
                <span className="font-bold text-ink">{vacante.titulo}</span>. No cambiamos ni agregamos texto: solo el orden, para
                que la empresa vea de una lo que busca.
              </p>
              <p className="text-sm text-muted">
                Incluido en {PLAN_NOMBRE.camelleitor} (ver e imprimir) y {PLAN_NOMBRE.berraco_pro} (además, guardar una versión por vacante).
              </p>
              <Link href="/planes" className={buttonVariants({ variant: "accent", size: "lg", block: true })}>
                Ver planes <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const aprobadas = await getHojasAprobadas(candidato.id);
  if (aprobadas.length === 0) {
    return (
      <div className="container-page space-y-4 py-8">
        {volver}
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Necesitas una hoja de vida aprobada"
          description="Crea tu hoja de vida, revísala y apruébala. Después vuelve aquí para adaptarla a esta vacante."
          action={
            <Link href="/hoja-de-vida" className={buttonVariants({ variant: "accent", size: "md" })}>
              Ir a mi hoja de vida
            </Link>
          }
        />
      </div>
    );
  }

  const elegida = aprobadas.find((h) => h.id === sp.hv) ?? aprobadas[0];
  const relevancia = {
    titulo: vacante.titulo,
    descripcion: vacante.descripcion,
    requisitos: vacante.requisitos,
    area: labelArea(vacante.area),
  };
  const contenido = reordenarHV(elegida.contenido, relevancia);
  const coincidencias = coincidenciasConVacante(elegida.contenido, relevancia);

  await registrarEvento({
    tipo: "hv_adaptada",
    actor_id: candidato.id,
    actor_tipo: "candidato",
    entidad: "hojas_de_vida",
    entidad_id: elegida.id,
    meta: { vacante_id: vacante.id, guardada: false },
  });

  return (
    <div className="container-page print-hoja space-y-6 py-8">
      <PrintStyles />
      <div className="no-print space-y-5">
        {volver}
        <header className="space-y-2">
          <span className="kicker">
            <Shuffle className="h-4 w-4" /> Adaptada a la vacante
          </span>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {vacante.titulo} · {vacante.empresa?.nombre_negocio}
          </h1>
          <p className="max-w-2xl text-ink-soft">
            Reordenamos tu hoja de vida para poner primero lo que pide esta vacante. El texto es exactamente el que aprobaste.
          </p>
        </header>

        {aprobadas.length > 1 && (
          <nav aria-label="Elegir hoja de vida" className="flex flex-wrap gap-2">
            {aprobadas.map((h) => (
              <Link
                key={h.id}
                href={`/hoja-de-vida/adaptar?vacante=${vacante.id}&hv=${h.id}`}
                className={cn("chip", h.id === elegida.id ? "bg-ink text-canvas" : "hover:bg-sol-200")}
                aria-current={h.id === elegida.id ? "true" : undefined}
              >
                {h.titulo}
              </Link>
            ))}
          </nav>
        )}

        {coincidencias.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <span className="font-bold text-ink">Coincidencias con la vacante:</span>
            {coincidencias.map((c) => (
              <span key={c} className="chip bg-brand-100 text-xs">
                {c}
              </span>
            ))}
          </p>
        )}

        <div className="flex flex-wrap items-start gap-3">
          <ImprimirButton hvId={elegida.id} via="imprimir_adaptada" />
          {beneficios.cvDinamico === "reordenar_versiones" ? (
            <GuardarVersionVacanteButton hvId={elegida.id} vacanteId={vacante.id} />
          ) : (
            <p className="max-w-xs text-sm text-muted">
              Con {PLAN_NOMBRE.berraco_pro} puedes guardar esta versión para la vacante.
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-3xl">
        <CvDocument
          nombre={candidato.nombre}
          ciudad={candidato.ciudad}
          whatsapp={candidato.whatsapp}
          email={candidato.email}
          contenido={contenido}
        />
      </div>
    </div>
  );
}
