import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Building2,
  Eye,
  GraduationCap,
  FileCheck2,
  Briefcase,
  Clock,
  CalendarClock,
  BadgeCheck,
  Star,
  Wand2,
  Flag,
  Info,
  AlertTriangle,
} from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getVacantePublica, getVacanteSinContar } from "@/lib/data/vacantes";
import { getPostulacionPropia } from "@/lib/data/ofertas";
import { evaluarMatch, perfilDe } from "@/lib/matching";
import { esVisibleEnPortal, estaDestacada } from "@/lib/vacante";
import { registrarEvento } from "@/lib/eventos";
import {
  AREAS,
  DISPONIBILIDAD,
  MODALIDADES,
  NIVELES_EDUCATIVOS,
  SECTORES,
  TIPOS_EMPLEO,
  estadoPostulacionInfo,
  normalizarFuente,
} from "@/lib/constants";
import { cn, formatSalario, tiempoRelativo } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { ScoreBadge } from "@/components/vacante/score-badge";
import { accesoFicha, estadoNoPublico } from "@/components/vacante/ficha";
import { JsonLd } from "@/components/seo/json-ld";
import { ShareButtons } from "@/components/seo/share-buttons";
import { buildMetadata, absUrl, jobPostingJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { AplicarButton } from "./aplicar-button";
import { ReportarVacante } from "./reportar-vacante";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ src?: string | string[] }>;

function labelDe(lista: readonly { value: string; label: string }[], value: string) {
  return lista.find((x) => x.value === value)?.label ?? value;
}

const NOMBRE_FACTOR: Record<string, string> = {
  ciudad: "Ciudad",
  area: "Área",
  educacion: "Educación",
  disponibilidad: "Disponibilidad",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const v = await getVacanteSinContar(id);
  // No públicas: título genérico y noindex (no se expone su contenido en metadatos).
  if (!v || !esVisibleEnPortal(v)) return buildMetadata({ title: "Vacante", path: `/v/${id}`, noindex: true });
  const area = labelDe(AREAS, v.area);
  const salario = formatSalario(v.salario_min, v.salario_max);
  return buildMetadata({
    title: `${v.titulo} en ${v.ciudad} · ${v.empresa?.nombre_negocio ?? "CostaLaboral"}`,
    description:
      `${v.titulo} en ${v.ciudad} · ${v.empresa?.nombre_negocio ?? ""} · ${salario} · ${area}. Postúlate gratis en CostaLaboral.`.slice(
        0,
        160,
      ),
    path: `/v/${id}`,
    type: "article",
    keywords: [v.titulo, `empleo ${v.ciudad}`, `trabajo ${v.ciudad}`, area, "CostaLaboral"],
    noindex: !esVisibleEnPortal(v),
  });
}

export default async function VacantePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const fuente = normalizarFuente(Array.isArray(sp.src) ? sp.src[0] : sp.src);

  const inicial = await getVacanteSinContar(id);
  if (!inicial) notFound();

  const sesion = await getUsuario();
  const esDuena = sesion?.tipo === "empresa" && inicial.empresa_id === sesion.user.id;
  const candidato = sesion?.tipo === "candidato" ? await getCandidato() : null;
  const postulacion = candidato ? await getPostulacionPropia(candidato.id, inicial.id) : null;

  const acceso = accesoFicha(inicial, { esDuena, yaPostulado: !!postulacion });
  if (acceso === "oculta") notFound();
  const publica = acceso === "publica";

  // Vistas y KPI solo para vacantes públicas vistas por alguien distinto a la empresa dueña.
  let vacante = inicial;
  if (publica && !esDuena) {
    vacante = (await getVacantePublica(id)) ?? inicial;
    await registrarEvento({
      tipo: "vacante_vista",
      actor_id: sesion?.user.id ?? null,
      actor_tipo: sesion ? (sesion.tipo === "empresa" ? "empresa" : "candidato") : "visitante",
      entidad: "vacantes",
      entidad_id: vacante.id,
      meta: { fuente },
    });
  }

  const banner = esDuena ? estadoNoPublico(vacante) : null;
  const detalle = candidato ? evaluarMatch(perfilDe(candidato), vacante) : null;
  const destacada = estaDestacada(vacante);

  const areaLabel = labelDe(AREAS, vacante.area);
  const modalidadLabel = labelDe(MODALIDADES, vacante.modalidad);
  const tipoLabel = labelDe(TIPOS_EMPLEO, vacante.tipo);
  const nivelLabel = labelDe(NIVELES_EDUCATIVOS, vacante.nivel_educativo_min);
  const disponibilidadLabel = labelDe(DISPONIBILIDAD, vacante.disponibilidad_requerida);
  const sectorLabel = vacante.empresa ? labelDe(SECTORES, vacante.empresa.sector) : "";
  const empresaNombre = vacante.empresa?.nombre_negocio ?? "Empresa";

  return (
    <div className="container-page py-6 sm:py-10">
      {publica && (
        <JsonLd
          data={[
            jobPostingJsonLd({
              id: vacante.id,
              titulo: vacante.titulo,
              descripcion: vacante.descripcion,
              requisitos: vacante.requisitos,
              ciudad: vacante.ciudad,
              modalidad: vacante.modalidad,
              tipo: vacante.tipo,
              salario_min: vacante.salario_min,
              salario_max: vacante.salario_max,
              publicada_en: vacante.publicada_en,
              creado_en: vacante.creado_en,
              expira_en: vacante.expira_en,
              empresaNombre,
            }),
            breadcrumbJsonLd([
              { name: "Inicio", path: "/" },
              { name: "Ofertas", path: "/ofertas" },
              { name: vacante.titulo, path: `/v/${vacante.id}` },
            ]),
          ]}
        />
      )}

      <Link
        href="/ofertas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline"
      >
        ← Ver todas las ofertas
      </Link>

      {banner && (
        <div
          role="status"
          className={cn(
            "mb-6 flex items-start gap-3 rounded-2xl border-2 border-ink p-4",
            banner.tono === "danger" && "bg-danger-50",
            banner.tono === "sol" && "bg-sol-100",
            banner.tono === "warn" && "bg-warn-50",
            banner.tono === "neutral" && "bg-surface",
          )}
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
          <div>
            <p className="font-display font-extrabold text-ink">
              Estado de tu vacante: {banner.titulo}
            </p>
            <p className="text-sm text-ink-soft">{banner.detalle}</p>
          </div>
        </div>
      )}
      {!publica && !esDuena && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-ink bg-warn-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-ink" />
          <p className="font-bold text-ink">Esta vacante ya no recibe postulaciones.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* ---------------- Contenido principal ---------------- */}
        <div className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {destacada && (
                <Badge tone="sol">
                  <Star className="h-3 w-3" /> Destacada
                </Badge>
              )}
              <Badge tone="brand">{areaLabel}</Badge>
              <Badge tone="outline">{tipoLabel}</Badge>
              <Badge tone="outline">{modalidadLabel}</Badge>
              {vacante.tiene_contrato && <Badge tone="success">Con contrato</Badge>}
            </div>
            <h1 className="font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">
              {vacante.titulo}
            </h1>
            <p className="flex flex-wrap items-center gap-x-1.5 text-base font-semibold text-ink-soft">
              <span>{empresaNombre}</span>
              {vacante.empresa?.verificada && (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-700">
                  <BadgeCheck className="h-4 w-4" /> Verificada
                </span>
              )}
              <span aria-hidden>·</span>
              <MapPin className="h-4 w-4 text-brand-600" />
              {vacante.ciudad}
            </p>
          </header>

          {/* Match explicable (candidato logueado) */}
          {detalle ? (
            <Card pop>
              <CardBody>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="kicker">Tu match</span>
                    <h2 className="mt-2 font-display text-xl font-extrabold text-ink">Cómo encaja con tu perfil</h2>
                  </div>
                  <ScoreBadge score={detalle.score} className="px-3.5 py-1.5 text-sm" />
                </div>
                <ul className="mt-4 divide-y-2 divide-line">
                  {detalle.factores.map((f) => (
                    <li key={f.factor} className="flex items-start justify-between gap-4 py-3">
                      <div>
                        <p className="font-bold text-ink">
                          {NOMBRE_FACTOR[f.factor] ?? f.factor}{" "}
                          <span className="text-xs font-semibold text-muted">· peso {f.peso}</span>
                        </p>
                        <p className="text-sm text-ink-soft">{f.explicacion}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-extrabold tabular-nums",
                          f.compatibilidad === 1 && "bg-success-50 text-success-600",
                          f.compatibilidad === 0.5 && "bg-sol-100 text-ink",
                          f.compatibilidad === 0 && "bg-surface text-muted",
                        )}
                      >
                        {f.puntos}/{f.peso}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs font-medium text-muted">
                  Es una orientación, no una probabilidad de contratación.
                </p>
              </CardBody>
            </Card>
          ) : (
            !sesion && (
              <div className="flex flex-col gap-3 rounded-2xl border-2 border-ink bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-bold text-ink">Regístrate gratis para ver tu match y postularte.</p>
                <Link
                  href="/registro-candidato"
                  className={buttonVariants({ variant: "brand", size: "sm", className: "shrink-0" })}
                >
                  Crear mi perfil gratis
                </Link>
              </div>
            )
          )}

          {/* Descripción */}
          <Card>
            <CardBody>
              <h2 className="mb-2 font-display text-lg font-extrabold text-ink">Descripción del cargo</h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{vacante.descripcion}</div>
            </CardBody>
          </Card>

          {/* Requisitos */}
          <Card>
            <CardBody>
              <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                <FileCheck2 className="h-5 w-5 text-brand-600" /> Requisitos
              </h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {vacante.requisitos || "La empresa no especificó requisitos adicionales."}
              </div>
            </CardBody>
          </Card>

          {/* Empresa */}
          {vacante.empresa && (
            <Card>
              <CardBody className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-brand-100 text-ink">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-muted">Empresa</p>
                  <p className="flex flex-wrap items-center gap-2 text-base font-bold text-ink">
                    {vacante.empresa.nombre_negocio}
                    {vacante.empresa.verificada && (
                      <Badge tone="brand">
                        <BadgeCheck className="h-3 w-3" /> Verificada
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-ink-soft">{sectorLabel}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ---------------- Sidebar ---------------- */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card pop>
            <CardBody className="space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Salario</p>
                <p className="font-display text-2xl font-extrabold text-ink">
                  {formatSalario(vacante.salario_min, vacante.salario_max)}
                </p>
              </div>

              {esDuena ? (
                <div className="rounded-xl border-2 border-ink bg-brand-50 px-4 py-3 text-sm">
                  <p className="font-bold text-brand-800">Esta es tu vacante</p>
                  <Link
                    href="/empresa/panel"
                    className={buttonVariants({ variant: "primary", size: "sm", block: true, className: "mt-3" })}
                  >
                    Ir a mi panel
                  </Link>
                </div>
              ) : candidato ? (
                <>
                  <AplicarButton
                    vacanteId={vacante.id}
                    fuente={fuente}
                    abierta={publica}
                    estadoPostulacion={postulacion ? estadoPostulacionInfo(postulacion.estado).labelCandidato : null}
                  />
                  <Link
                    href={`/hoja-de-vida/adaptar?vacante=${vacante.id}`}
                    className={buttonVariants({ variant: "outline", size: "sm", block: true })}
                  >
                    <Wand2 className="h-4 w-4" /> Adapta tu hoja de vida a esta vacante
                  </Link>
                </>
              ) : sesion?.tipo === "empresa" ? (
                <p className="rounded-xl border-2 border-line bg-canvas px-4 py-3 text-sm text-ink-soft">
                  Ingresaste como empresa. Para postularte necesitas una cuenta de candidato.
                </p>
              ) : !sesion ? (
                <div className="space-y-2">
                  <Link
                    href="/registro-candidato"
                    className={buttonVariants({ variant: "accent", size: "lg", block: true })}
                  >
                    Regístrate gratis para postularte
                  </Link>
                  <p className="text-center text-sm text-ink-soft">
                    ¿Ya tienes cuenta?{" "}
                    <Link href={`/login?next=/v/${vacante.id}`} className="font-bold text-brand-700 hover:underline">
                      Ingresa
                    </Link>
                  </p>
                </div>
              ) : null}

              <hr className="border-t-2 border-line" />

              <dl className="space-y-2.5 text-sm">
                <Dato icon={<MapPin className="h-4 w-4 text-muted" />} label="Ciudad" valor={vacante.ciudad} />
                <Dato icon={<Briefcase className="h-4 w-4 text-muted" />} label="Modalidad" valor={modalidadLabel} />
                <Dato icon={<Clock className="h-4 w-4 text-muted" />} label="Tipo de empleo" valor={tipoLabel} />
                <Dato icon={<GraduationCap className="h-4 w-4 text-muted" />} label="Nivel mínimo" valor={nivelLabel} />
                <Dato
                  icon={<CalendarClock className="h-4 w-4 text-muted" />}
                  label="Inicio"
                  valor={disponibilidadLabel}
                />
                <Dato
                  icon={<FileCheck2 className="h-4 w-4 text-muted" />}
                  label="Contrato"
                  valor={vacante.tiene_contrato ? "Sí" : "No especificado"}
                />
                <Dato
                  label="Publicada"
                  valor={vacante.publicada_en ? tiempoRelativo(vacante.publicada_en) : "Sin publicar"}
                />
                <Dato icon={<Eye className="h-4 w-4 text-muted" />} label="Vistas" valor={String(vacante.vistas)} />
              </dl>

              {publica && (
                <>
                  <hr className="border-t-2 border-line" />
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Compartir esta vacante</p>
                    <ShareButtons
                      url={absUrl(`/v/${vacante.id}?src=compartido`)}
                      titulo={`${vacante.titulo} en ${vacante.ciudad}`}
                    />
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          {!esDuena && (
            <div className="px-1">
              {sesion ? (
                <ReportarVacante vacanteId={vacante.id} />
              ) : (
                <Link
                  href={`/login?next=/v/${vacante.id}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-danger-600 hover:underline"
                >
                  <Flag className="h-4 w-4" /> Reportar vacante
                </Link>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Dato({ icon, label, valor }: { icon?: React.ReactNode; label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-ink-soft">
        {icon}
        {label}
      </dt>
      <dd className="text-right font-semibold text-ink">{valor}</dd>
    </div>
  );
}
