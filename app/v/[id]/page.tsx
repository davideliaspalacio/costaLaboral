import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getVacantePublica, getVacanteSinContar } from "@/lib/data/vacantes";
import { estadoPlanDeCandidato, idsPostulados } from "@/lib/data/postulaciones";
import { visibilidadFicha } from "@/lib/plan";
import { calcularScore } from "@/lib/matching";
import {
  AREAS,
  MODALIDADES,
  NIVELES_EDUCATIVOS,
  SECTORES,
} from "@/lib/constants";
import { formatSalario, tiempoRelativo } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { ScoreBadge } from "@/components/vacante/score-badge";
import {
  MapPin,
  Building2,
  Lock,
  Eye,
  GraduationCap,
  FileCheck2,
  Briefcase,
  Zap,
} from "lucide-react";
import { AplicarButton } from "./aplicar-button";
import { JsonLd } from "@/components/seo/json-ld";
import { ShareButtons } from "@/components/seo/share-buttons";
import { buildMetadata, absUrl, jobPostingJsonLd, breadcrumbJsonLd } from "@/lib/seo";

function labelDe(lista: readonly { value: string; label: string }[], value: string) {
  return lista.find((x) => x.value === value)?.label ?? value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const v = await getVacanteSinContar(id);
  if (!v) return buildMetadata({ title: "Vacante no encontrada", path: `/v/${id}`, noindex: true });
  const area = labelDe(AREAS, v.area);
  const salario = formatSalario(v.salario_min, v.salario_max);
  return buildMetadata({
    title: `${v.titulo} en ${v.ciudad}`,
    description: `${v.titulo} en ${v.ciudad} · ${salario} · ${area}. Postúlate gratis por WhatsApp en CostaLaboral.`.slice(0, 160),
    path: `/v/${id}`,
    type: "article",
    keywords: [v.titulo, `empleo ${v.ciudad}`, `trabajo ${v.ciudad}`, area, "CostaLaboral"],
  });
}

export default async function VacantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vacante = await getVacantePublica(id);
  if (!vacante) notFound();

  const sesion = await getUsuario();
  const candidato = sesion?.tipo === "candidato" ? await getCandidato() : null;
  const esEmpresaDuena = sesion?.tipo === "empresa" && vacante.empresa_id === sesion.user.id;

  // Estado de plan / visibilidad para candidatos logueados.
  const estado = candidato ? await estadoPlanDeCandidato(candidato) : null;
  const vis = estado ? visibilidadFicha(estado.plan, estado.puedeAplicar) : null;

  // Sin sesión de candidato → visitante (visibilidad básica).
  const esVisitante = !candidato && !esEmpresaDuena;

  const yaPostulado = candidato ? (await idsPostulados(candidato.id)).has(vacante.id) : false;

  const score =
    candidato && vis?.verMatchIA
      ? calcularScore(
          {
            ciudad: candidato.ciudad,
            area_interes: candidato.area_interes,
            nivel_educativo: candidato.nivel_educativo,
            disponibilidad: candidato.disponibilidad,
          },
          vacante,
        )
      : null;

  const areaLabel = labelDe(AREAS, vacante.area);
  const modalidadLabel = labelDe(MODALIDADES, vacante.modalidad);
  const nivelLabel = labelDe(NIVELES_EDUCATIVOS, vacante.nivel_educativo_min);
  const sectorLabel = labelDe(SECTORES, vacante.empresa.sector);

  const descripcionLineas = vacante.descripcion.split(/\n+/).filter(Boolean);
  const descripcionCorta = descripcionLineas.slice(0, 2).join(" ");
  const verEmpresa = vis?.verEmpresa ?? false;
  const verRequisitos = vis?.verRequisitosCompletos ?? false;
  const verDescripcionCompleta = !!candidato;

  return (
    <div className="container-page py-6 sm:py-10">
      <JsonLd
        data={[
          jobPostingJsonLd({
            id: vacante.id,
            titulo: vacante.titulo,
            descripcion: vacante.descripcion,
            requisitos: vacante.requisitos,
            ciudad: vacante.ciudad,
            modalidad: vacante.modalidad,
            salario_min: vacante.salario_min,
            salario_max: vacante.salario_max,
            creado_en: vacante.creado_en,
            expira_en: vacante.expira_en,
            empresaNombre: vacante.empresa?.nombre_negocio,
          }),
          breadcrumbJsonLd([
            { name: "Inicio", path: "/" },
            { name: "Ofertas", path: "/ofertas" },
            { name: vacante.titulo, path: `/v/${vacante.id}` },
          ]),
        ]}
      />
      <Link href="/mis-vacantes" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        ← Volver
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ---------------- Contenido principal ---------------- */}
        <div className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">{areaLabel}</Badge>
              <Badge tone="outline">{modalidadLabel}</Badge>
              {vacante.tiene_contrato && <Badge tone="success">Con contrato</Badge>}
              {!vacante.activa && <Badge tone="neutral">Vacante cerrada</Badge>}
              {score != null && (
                <Badge tone="accent" className="gap-1">
                  <Zap className="h-3 w-3" /> Prioridad 2h
                </Badge>
              )}
            </div>
            <h1 className="font-display text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{vacante.titulo}</h1>
            <p className="flex items-center gap-1.5 text-sm text-ink-soft">
              <MapPin className="h-4 w-4 text-brand-600" />
              {vacante.ciudad} · {modalidadLabel}
            </p>
            {score != null && (
              <div className="pt-1">
                <ScoreBadge score={score} />
              </div>
            )}
          </header>

          {/* Empresa */}
          <Card>
            <CardBody className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Empresa</p>
                {verEmpresa ? (
                  <>
                    <p className="text-base font-bold text-ink">
                      {vacante.empresa.nombre_negocio}
                      {vacante.empresa.verificada && (
                        <span className="ml-2 align-middle text-xs font-semibold text-brand-700">✓ Verificada</span>
                      )}
                    </p>
                    <p className="text-sm text-ink-soft">{sectorLabel}</p>
                  </>
                ) : (
                  <>
                    <p className="flex items-center gap-1.5 text-base font-bold text-ink">
                      <Lock className="h-4 w-4 text-muted" /> Empresa confidencial
                    </p>
                    <Link href="/planes" className="text-sm font-semibold text-accent-600 hover:underline">
                      Mejora tu plan para verla
                    </Link>
                  </>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Descripción */}
          <Card>
            <CardBody>
              <h2 className="mb-2 text-lg font-bold text-ink">Descripción del cargo</h2>
              {verDescripcionCompleta ? (
                <div className="space-y-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                  {vacante.descripcion}
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-ink-soft">
                    {descripcionCorta || descripcionLineas[0]}
                  </p>
                  {esVisitante && (
                    <p className="mt-3 text-sm text-muted">
                      Regístrate para ver la descripción completa y postularte.
                    </p>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          {/* Requisitos */}
          <Card>
            <CardBody>
              <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-ink">
                <FileCheck2 className="h-5 w-5 text-brand-600" /> Requisitos
              </h2>
              {verRequisitos ? (
                <div className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{vacante.requisitos}</div>
              ) : (
                <div className="relative overflow-hidden rounded-xl border-2 border-ink bg-canvas p-4">
                  <div className="select-none space-y-2 text-sm text-ink-soft blur-sm" aria-hidden>
                    <p>• Experiencia mínima en el área solicitada.</p>
                    <p>• Manejo de herramientas propias del cargo.</p>
                    <p>• Disponibilidad según la modalidad.</p>
                  </div>
                  <div className="mt-3 flex flex-col items-start gap-2">
                    <p className="text-sm font-semibold text-ink">
                      {esVisitante
                        ? "Regístrate para ver los requisitos."
                        : "Los requisitos completos son de los planes pagos."}
                    </p>
                    <Link
                      href={esVisitante ? "/registro-candidato" : "/planes"}
                      className={buttonVariants({ variant: "subtle", size: "sm" })}
                    >
                      {esVisitante ? "Regístrate gratis" : "Ver planes"}
                    </Link>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ---------------- Sidebar sticky ---------------- */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Salario</p>
                <p className="font-display text-xl font-extrabold text-ink">{formatSalario(vacante.salario_min, vacante.salario_max)}</p>
              </div>

              {esEmpresaDuena ? (
                <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-brand-700">Esta es tu vacante</p>
                  <Link href="/empresa/panel" className={buttonVariants({ variant: "primary", size: "sm", block: true, className: "mt-3" })}>
                    Ir a mi panel
                  </Link>
                </div>
              ) : esVisitante ? (
                <Link href="/registro-candidato" className={buttonVariants({ variant: "accent", size: "lg", block: true })}>
                  Regístrate para aplicar
                </Link>
              ) : candidato ? (
                <>
                  {estado && vis?.muroPago && !yaPostulado && (
                    <div className="rounded-xl bg-accent-50 px-4 py-3 text-sm">
                      <p className="flex items-center gap-2 font-semibold text-accent-700">
                        <Lock className="h-4 w-4" /> Alcanzaste tu límite de postulaciones
                      </p>
                      <p className="mt-1 text-ink-soft">
                        Usaste {estado.usadas} de {estado.limite}. Mejora tu plan para seguir aplicando.
                      </p>
                      <Link href="/planes" className={buttonVariants({ variant: "accent", size: "sm", block: true, className: "mt-3" })}>
                        Ver planes
                      </Link>
                    </div>
                  )}
                  <AplicarButton
                    vacanteId={vacante.id}
                    puedeAplicar={!!vacante.activa && estado!.puedeAplicar}
                    yaPostulado={yaPostulado}
                    activo={!!vacante.activa}
                  />
                  {estado && estado.restantes != null && !yaPostulado && estado.puedeAplicar && (
                    <p className="text-center text-xs text-muted">
                      Te quedan {estado.restantes} postulaciones en tu plan.
                    </p>
                  )}
                </>
              ) : null}

              <hr className="border-line" />

              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-ink-soft"><MapPin className="h-4 w-4 text-muted" /> Ciudad</dt>
                  <dd className="font-semibold text-ink">{vacante.ciudad}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-ink-soft"><Briefcase className="h-4 w-4 text-muted" /> Modalidad</dt>
                  <dd className="font-semibold text-ink">{modalidadLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-ink-soft"><GraduationCap className="h-4 w-4 text-muted" /> Nivel mínimo</dt>
                  <dd className="font-semibold text-ink">{nivelLabel}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-ink-soft"><FileCheck2 className="h-4 w-4 text-muted" /> ¿Con contrato?</dt>
                  <dd className="font-semibold text-ink">{vacante.tiene_contrato ? "Sí" : "No especificado"}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-ink-soft"><Eye className="h-4 w-4 text-muted" /> Vistas</dt>
                  <dd className="font-semibold text-ink">{vacante.vistas}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-soft">Publicado</dt>
                  <dd className="font-semibold text-ink">{tiempoRelativo(vacante.creado_en)}</dd>
                </div>
              </dl>

              <hr className="border-line" />

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Compartir esta vacante</p>
                <ShareButtons url={absUrl(`/v/${vacante.id}`)} titulo={`${vacante.titulo} en ${vacante.ciudad}`} />
              </div>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
