import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, UsersRound } from "lucide-react";
import {
  MAX_INVITACIONES_DIA,
  getCandidatosSugeridos,
  getInvitacionesVacante,
  getVacantePropia,
  requerirEmpresa,
} from "@/lib/data/empresa";
import { getBeneficiosEmpresa } from "@/lib/billing/suscripciones";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreBadge } from "@/components/vacante/score-badge";
import { UpsellPro } from "../../../_components/upsell-pro";
import { labelArea, labelDisponibilidad, labelNivel } from "../../../_components/etiquetas";
import { DetalleMatchLista } from "../detalle-match";
import { BotonInvitar } from "./boton-invitar";

export const metadata: Metadata = { title: "Candidatos sugeridos" };

export default async function SugeridosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const empresa = await requerirEmpresa(`/empresa/vacante/${id}/sugeridos`);
  const vacante = await getVacantePropia(empresa.id, id);
  if (!vacante) notFound();
  const { beneficios } = await getBeneficiosEmpresa(empresa.id);

  const volver = (
    <Link href={`/empresa/vacante/${vacante.id}`} className={`${buttonVariants({ variant: "ghost", size: "sm" })} -ml-3 mb-4`}>
      <ArrowLeft className="h-4 w-4" /> Volver a postulados
    </Link>
  );

  if (!beneficios.accesoAmpliado) {
    return (
      <div className="container-page max-w-3xl py-8 sm:py-12">
        {volver}
        <p className="kicker">Acceso ampliado</p>
        <h1 className="mt-3 mb-6 font-display text-3xl font-extrabold text-ink">Candidatos sugeridos</h1>
        <UpsellPro
          titulo="Función de Empresa Pro"
          descripcion="Ve personas que encajan con tu vacante y aceptaron ser visibles para empresas, e invítalas a postularse por WhatsApp."
        />
      </div>
    );
  }

  const [sugeridos, invitaciones] = await Promise.all([getCandidatosSugeridos(vacante), getInvitacionesVacante(vacante.id)]);
  const restantes = Math.max(0, MAX_INVITACIONES_DIA - invitaciones.hoy);

  return (
    <div className="container-page py-8 sm:py-12">
      {volver}
      <header className="mb-6 space-y-2">
        <p className="kicker">Acceso ampliado · Empresa Pro</p>
        <h1 className="font-display text-3xl font-extrabold text-ink">Sugeridos para {vacante.titulo}</h1>
        <p className="flex items-start gap-2 text-sm text-ink-soft">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          Personas que aceptaron ser visibles para empresas y encajan con la vacante. Sus datos de contacto se mantienen privados: si aceptan tu
          invitación y se postulan, aparecen en tu pipeline.
        </p>
        <p className="text-sm font-bold text-ink tabular-nums">
          Invitaciones disponibles hoy: {restantes} de {MAX_INVITACIONES_DIA}
        </p>
      </header>

      {!vacante.es_publica ? (
        <EmptyState
          icon={<UsersRound className="h-6 w-6" />}
          title="Tu vacante aún no está visible"
          description="Puedes invitar candidatos cuando la vacante esté publicada y aprobada."
        />
      ) : sugeridos.length === 0 ? (
        <EmptyState
          icon={<UsersRound className="h-6 w-6" />}
          title="Sin sugeridos por ahora"
          description="No hay perfiles visibles que encajen y no se hayan postulado. Vuelve en unos días."
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {sugeridos.map((c) => {
            const invitado = invitaciones.invitados.has(c.id);
            const bloqueo = !c.puedeInvitar
              ? "No aceptó recibir mensajes por WhatsApp."
              : restantes === 0 && !invitado
                ? "Llegaste al límite de invitaciones de hoy."
                : null;
            return (
              <li key={c.id} className="card-pop flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-label="Candidato anónimo"
                      className="grid h-12 w-12 place-items-center rounded-xl border-2 border-ink bg-brand-100 font-display text-lg font-extrabold text-brand-800"
                    >
                      {c.iniciales}
                    </span>
                    <div className="text-sm text-ink-soft">
                      <p className="font-bold text-ink">
                        {c.ciudad} · {labelNivel(c.nivel_educativo)}
                      </p>
                      <p>
                        {labelArea(c.area_interes)} · Inicio {labelDisponibilidad(c.disponibilidad).toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <ScoreBadge score={c.score} />
                </div>
                <DetalleMatchLista detalle={c.detalle} />
                <div className="mt-auto flex justify-end">
                  <BotonInvitar vacanteId={vacante.id} candidatoId={c.id} invitado={invitado} bloqueo={bloqueo} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
