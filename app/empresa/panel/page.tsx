import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuario, getEmpresa } from "@/lib/auth";
import { getVacantesDeEmpresa, getCandidatosDeVacante } from "@/lib/data/vacantes";
import { NIVELES_EDUCATIVOS } from "@/lib/constants";
import { waLink } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreBadge } from "@/components/vacante/score-badge";
import {
  MapPin,
  Users,
  Briefcase,
  GraduationCap,
  MessageCircle,
  Inbox,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { VacanteToggle } from "./vacante-toggle";
import { VacanteCierre } from "./vacante-cierre";
import { SeguimientoSelect } from "./seguimiento-select";
import { SummaryActions } from "./summary-actions";
import { getCierreDeVacantes, estadoDeVacante } from "./estado-vacante";

export const metadata: Metadata = { title: "Panel de empresa" };

function nivelLabel(value: string) {
  return NIVELES_EDUCATIVOS.find((n) => n.value === value)?.label ?? value;
}

export default async function PanelEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<{ publicada?: string; editada?: string }>;
}) {
  const empresa = await getEmpresa();
  if (!empresa) {
    const sesion = await getUsuario();
    if (sesion?.tipo === "candidato") redirect("/mis-vacantes");
    redirect("/registro-empresa");
  }

  const { publicada, editada } = await searchParams;
  const vacantes = await getVacantesDeEmpresa(empresa.id);
  const candidatosPorVacante = await Promise.all(vacantes.map((v) => getCandidatosDeVacante(v)));
  const cierrePorVacante = await getCierreDeVacantes(
    vacantes.filter((v) => !v.activa).map((v) => v.id),
  );

  return (
    <div className="container-page py-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Panel de empresa</p>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{empresa.nombre_negocio}</h1>
        </div>
        <Link href="/registro-empresa" className={buttonVariants({ variant: "primary", size: "lg" })}>
          Publicar otra vacante
        </Link>
      </header>

      {publicada && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-ink bg-success-50 px-5 py-4 text-sm text-success-600">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>¡Vacante publicada!</strong> Ya avisamos por WhatsApp a los candidatos que encajan con el cargo.
          </p>
        </div>
      )}

      {editada && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-ink bg-success-50 px-5 py-4 text-sm text-success-600">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>¡Cambios guardados!</strong> La vacante se actualizó y ya se ve así en la ficha pública.
          </p>
        </div>
      )}

      {vacantes.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="Aún no has publicado vacantes"
          description="Publica tu primera vacante gratis y te conectamos con candidatos que encajan."
          action={
            <Link href="/registro-empresa" className={buttonVariants({ variant: "accent", size: "lg" })}>
              Publicar vacante gratis
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {vacantes.map((v, i) => {
            const candidatos = candidatosPorVacante[i];
            const cierre = cierrePorVacante.get(v.id);
            const estado = estadoDeVacante(v.activa, cierre);
            return (
              <details
                key={v.id}
                open={i === 0}
                className="card group overflow-hidden [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-bold text-ink">{v.titulo}</h2>
                      {estado === "activa" && <Badge tone="success">Activa</Badge>}
                      {estado === "pausada" && <Badge tone="neutral">Pausada</Badge>}
                      {estado === "cerrada" && (
                        <Badge tone={cierre?.motivo === "contratado" ? "brand" : "danger"}>
                          {cierre?.motivo === "contratado" ? "Ya contratada" : "Cerrada"}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                      <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-muted" /> {v.ciudad}</span>
                      <span className="flex items-center gap-1"><Users className="h-4 w-4 text-muted" /> {v.total_postulaciones} postulados</span>
                    </p>
                  </div>
                  <SummaryActions className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Link href={`/v/${v.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Ver ficha
                    </Link>
                    <Link
                      href={`/empresa/vacante/${v.id}/editar`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <Pencil className="h-4 w-4" /> Editar
                    </Link>
                    {estado !== "cerrada" && <VacanteToggle vacanteId={v.id} activa={v.activa} />}
                    <VacanteCierre
                      vacanteId={v.id}
                      activa={v.activa}
                      cerrada={estado === "cerrada"}
                    />
                  </SummaryActions>
                </summary>

                <div className="border-t-2 border-ink bg-canvas p-4 sm:p-6">
                  {candidatos.length === 0 ? (
                    <EmptyState
                      icon={<Inbox className="h-6 w-6" />}
                      title="Aún nadie se ha postulado"
                      description="Compartimos tu vacante por WhatsApp con las personas que encajan; llegarán pronto."
                      className="border-dashed bg-transparent shadow-none"
                    />
                  ) : (
                    <ul className="space-y-3">
                      {candidatos.map((c) => (
                        <li key={c.postulacion.id}>
                          <Card className="bg-surface">
                            <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-bold text-ink">{c.candidato.nombre}</p>
                                  <ScoreBadge score={c.score} />
                                </div>
                                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-muted" /> {c.candidato.ciudad}</span>
                                  <span className="flex items-center gap-1"><GraduationCap className="h-4 w-4 text-muted" /> {nivelLabel(c.candidato.nivel_educativo)}</span>
                                </p>
                                <p className="text-sm text-ink-soft">
                                  {c.candidato.experiencia?.trim()
                                    ? c.candidato.experiencia
                                    : <span className="italic text-muted">Sin experiencia registrada</span>}
                                </p>
                                {c.postulacion.mensaje && (
                                  <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700">
                                    “{c.postulacion.mensaje}”
                                  </p>
                                )}
                              </div>

                              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                                <a
                                  href={waLink(
                                    c.candidato.whatsapp,
                                    `Hola ${c.candidato.nombre}, vi tu perfil en CostaLaboral para la vacante de ${v.titulo}...`,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={buttonVariants({ variant: "wsp", size: "sm" })}
                                >
                                  <MessageCircle className="h-4 w-4" /> WhatsApp
                                </a>
                                <SeguimientoSelect
                                  postulacionId={c.postulacion.id}
                                  estado={c.postulacion.estado_seguimiento}
                                />
                              </div>
                            </CardBody>
                          </Card>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
