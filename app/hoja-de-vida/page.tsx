import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock, Eye, FileText, IdCard, Pencil, Sparkles, Target } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getBeneficiosCandidato } from "@/lib/billing/suscripciones";
import { getHojasDeVida } from "@/lib/data/hoja-de-vida";
import { cuotaUsadaMes } from "@/lib/ia/uso";
import { resumenCuota } from "@/lib/ia/cuota";
import { labelArea, labelNivel } from "@/lib/ia/perfil";
import { PLAN_NOMBRE } from "@/lib/constants";
import { tiempoRelativo } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteHvButton } from "@/components/hv/delete-hv-button";
import { EstadoContenidoBadge } from "@/components/hv/estado-badge";
import { HvClientPanel } from "./hv-panel";

export const metadata: Metadata = {
  title: "Hoja de vida con IA",
  description: "Arma tu hoja de vida con IA a partir de tus respuestas, revísala, apruébala y descárgala en PDF.",
};

// Las server actions de generación corren desde esta ruta y pueden tardar.
export const maxDuration = 300;

export default async function HojaDeVidaPage() {
  const candidato = await getCandidato();
  if (!candidato) {
    const sesion = await getUsuario();
    if (sesion?.tipo === "empresa") redirect("/empresa/panel");
    redirect("/login?next=/hoja-de-vida");
  }

  const [{ plan, beneficios }, hojas, usadas] = await Promise.all([
    getBeneficiosCandidato(candidato.id),
    getHojasDeVida(candidato.id),
    cuotaUsadaMes(candidato.id, "hv_generar"),
  ]);
  const cuota = resumenCuota(usadas, beneficios.generacionesCvMes);
  const esPreview = beneficios.cvIa === "preview";
  const lleno = hojas.length >= beneficios.maxVersionesCv;
  const motivoBloqueo = cuota.agotada
    ? `Ya usaste tus ${cuota.limite} generación(es) de este mes.`
    : lleno
      ? `Tu plan guarda hasta ${beneficios.maxVersionesCv} hoja(s) de vida. Elimina una para crear otra.`
      : null;

  return (
    <div className="container-page space-y-8 py-8">
      <header className="space-y-3">
        <span className="kicker">
          <Sparkles className="h-4 w-4" /> Plan {PLAN_NOMBRE[plan]}
        </span>
        <h1 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Tu hoja de vida, bien contada
        </h1>
        <p className="max-w-2xl text-lg text-ink-soft">
          Respondes unas preguntas y la IA redacta tu hoja de vida solo con lo que tú contaste. Tú la revisas y la apruebas.
        </p>
        <dl className="flex flex-wrap gap-3 pt-1">
          <div className="chip">
            <dt className="sr-only">Generaciones</dt>
            <dd>
              {cuota.restantes} de {cuota.limite} generación(es) disponibles este mes
            </dd>
          </div>
          <div className="chip">
            <dt className="sr-only">Hojas de vida guardadas</dt>
            <dd>
              {hojas.length} de {beneficios.maxVersionesCv} guardada(s)
            </dd>
          </div>
        </dl>
      </header>

      {esPreview && (
        <div className="card-pop flex flex-col gap-4 bg-sol-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-display text-lg font-extrabold text-ink">Con el plan Gratis ves una vista previa</p>
            <p className="mt-1 text-sm text-ink-soft">
              Generas tu hoja de vida y ves el perfil y tu primera experiencia. Para verla completa, editarla, aprobarla y
              descargarla, pásate a un plan pago.
            </p>
          </div>
          <Link href="/planes" className={buttonVariants({ variant: "accent", size: "md" })}>
            Ver planes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <HvClientPanel
        sugerencia={{
          cargoObjetivo: labelArea(candidato.area_interes),
          experienciaTexto: candidato.experiencia ?? "",
          nivel: labelNivel(candidato.nivel_educativo),
        }}
        motivoBloqueo={motivoBloqueo}
      >
        {hojas.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Aún no tienes hojas de vida"
            description="Dale a “Crear hoja de vida”, responde unas preguntas y en un momentico la tienes lista para revisar."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {hojas.map((hv) => (
              <li key={hv.id}>
                <Card className="h-full">
                  <CardBody className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-sol-300 text-ink">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <EstadoContenidoBadge estado={hv.estado} />
                        {hv.tipo === "vacante" && (
                          <Badge tone="accent">
                            <Target className="h-3 w-3" /> Para una vacante
                          </Badge>
                        )}
                        {hv.generada_por_ia ? (
                          <Badge tone="brand">
                            <Sparkles className="h-3 w-3" /> IA
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Tus respuestas</Badge>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-lg font-extrabold text-ink">{hv.titulo}</h2>
                      {hv.cargo_objetivo && <p className="mt-0.5 truncate text-sm text-ink-soft">{hv.cargo_objetivo}</p>}
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
                        <Clock className="h-3.5 w-3.5" /> Creada {tiempoRelativo(hv.creado_en)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t-2 border-line pt-3">
                      <Link href={`/hoja-de-vida/${hv.id}`} className={buttonVariants({ variant: "primary", size: "sm" })}>
                        <Eye className="h-4 w-4" /> Ver
                      </Link>
                      {!esPreview && (
                        <Link
                          href={`/hoja-de-vida/${hv.id}?editar=1`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          <Pencil className="h-4 w-4" /> Editar
                        </Link>
                      )}
                      <div className="ml-auto">
                        <DeleteHvButton id={hv.id} titulo={hv.titulo} />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </HvClientPanel>

      {beneficios.linkedin !== "no" && (
        <Link
          href="/linkedin"
          className="card flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-brand-500 text-white">
            <IdCard className="h-5 w-5" />
          </span>
          <span className="flex-1">
            <span className="block font-display text-lg font-extrabold text-ink">Optimiza tu LinkedIn</span>
            <span className="block text-sm text-ink-soft">Usa una hoja de vida aprobada como base.</span>
          </span>
          <ArrowRight className="h-5 w-5 text-ink" />
        </Link>
      )}
    </div>
  );
}
