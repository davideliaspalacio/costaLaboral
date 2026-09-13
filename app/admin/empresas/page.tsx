import Link from "next/link";
import { Building2, ExternalLink, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FiltroTabs, type FiltroOpcion } from "@/components/admin/filtro-tabs";
import { SearchBox } from "@/components/admin/search-box";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/page-header";
import { AccionConfirmar } from "@/components/admin/accion-confirmar";
import { fechaCO, labelSector, planInfo, VERIFICACION_LABEL, VERIFICACION_TONO } from "@/components/admin/labels";
import { ESTADOS_VERIFICACION, getConteosVerificacion, listarEmpresas } from "@/lib/data/admin";
import { rechazarVerificacion, revocarVerificacion, verificarEmpresa } from "@/lib/actions/admin";
import { exigirPermiso, puede } from "@/lib/roles";
import { tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Empresas · Administración" };

/** Solo enlaces http(s) se muestran como enlace (evita javascript: y similares). */
function urlSegura(url: string | null): string | null {
  if (!url) return null;
  const conEsquema = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const u = new URL(conEsquema);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export default async function AdminEmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ verificacion?: string; q?: string; page?: string }>;
}) {
  const staff = await exigirPermiso("ver");
  const sp = await searchParams;
  // Por defecto, la cola de verificación.
  const filtro = sp.verificacion === "todas" ? "todas" : (ESTADOS_VERIFICACION as readonly string[]).includes(sp.verificacion ?? "") ? sp.verificacion! : "";
  const verificacion = filtro === "" ? "en_revision" : filtro === "todas" ? undefined : filtro;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [{ items, total, totalPaginas }, conteos] = await Promise.all([
    listarEmpresas({ verificacion, q: sp.q, page }),
    getConteosVerificacion(),
  ]);
  const puedeVerificar = puede(staff.rol, "verificar");
  const puedeAuditar = puede(staff.rol, "ver_auditoria");

  const opciones: FiltroOpcion[] = [
    { value: "", label: "En revisión", total: conteos.en_revision },
    { value: "sin_verificar", label: "Sin verificar", total: conteos.sin_verificar },
    { value: "verificada", label: "Verificadas", total: conteos.verificada },
    { value: "rechazada", label: "Rechazadas", total: conteos.rechazada },
    { value: "todas", label: "Todas", total: conteos.todas },
  ];

  return (
    <main className="space-y-6">
      <PageHeader kicker="Verificación progresiva" titulo="Empresas">
        <strong className="tabular-nums">{total.toLocaleString("es-CO")}</strong> en este filtro. La cola se atiende por
        orden de solicitud; las vacantes de empresas sin verificar pasan por moderación.
      </PageHeader>

      <FiltroTabs param="verificacion" opciones={opciones} activo={filtro} />
      <SearchBox action="/admin/empresas" defaultValue={sp.q ?? ""} placeholder="Buscar por nombre, razón social o NIT" />

      {items.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" />}
          title={filtro === "" ? "Cola de verificación vacía" : "Sin empresas en este filtro"}
          description={filtro === "" ? "No hay empresas esperando verificación." : "Prueba con otro estado o búsqueda."}
        />
      ) : (
        <ul className="space-y-4">
          {items.map((e) => {
            const sitio = urlSegura(e.sitio_web);
            const plan = planInfo(e.plan);
            return (
              <li key={e.id}>
                <Card>
                  <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-ink">{e.nombre_negocio}</h2>
                        <Badge tone={VERIFICACION_TONO[e.verificacion] ?? "neutral"}>
                          {VERIFICACION_LABEL[e.verificacion] ?? e.verificacion}
                        </Badge>
                        <Badge tone={plan.tone}>{plan.label}</Badge>
                      </div>
                      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                        <div className="flex gap-2">
                          <dt className="text-muted">Razón social</dt>
                          <dd className="font-semibold text-ink">{e.razon_social ?? "—"}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted">NIT</dt>
                          <dd className="font-semibold text-ink tabular-nums">{e.nit ?? "—"}</dd>
                        </div>
                        <div className="flex min-w-0 gap-2">
                          <dt className="text-muted">Sitio</dt>
                          <dd className="min-w-0 truncate">
                            {sitio ? (
                              <a
                                href={sitio}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                              >
                                {e.sitio_web} <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-ink">{e.sitio_web ?? "—"}</span>
                            )}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="text-muted">Sector · ciudad</dt>
                          <dd className="text-ink">
                            {labelSector(e.sector)} · {e.ciudad}
                          </dd>
                        </div>
                      </dl>
                      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        <span>Registro {tiempoRelativo(e.creado_en)}</span>
                        <span className="tabular-nums">{e.total_vacantes} vacantes</span>
                        {e.verificacion_solicitada_en && <span>Solicitó verificación: {fechaCO(e.verificacion_solicitada_en, true)}</span>}
                        {e.verificada_en && <span>Verificada: {fechaCO(e.verificada_en)}</span>}
                      </p>
                      {e.verificacion_nota && (
                        <p className="rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm text-ink-soft">
                          <strong className="text-ink">Nota para la empresa:</strong> {e.verificacion_nota}
                        </p>
                      )}
                      {puedeAuditar && (
                        <Link
                          href={`/admin/auditoria?entidad=empresas&entidadId=${e.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
                        >
                          <ScrollText className="h-3.5 w-3.5" /> Historial de auditoría
                        </Link>
                      )}
                    </div>

                    {puedeVerificar && (
                      <div className="flex shrink-0 flex-wrap items-start gap-2 lg:max-w-sm lg:justify-end">
                        {e.verificacion !== "verificada" && (
                          <AccionConfirmar
                            accion={verificarEmpresa.bind(null, e.id)}
                            etiqueta={e.verificacion === "en_revision" ? "Aprobar" : "Verificar"}
                            icono="shield"
                            variante="success"
                            pregunta={`¿Verificar a ${e.nombre_negocio}? Sus vacantes dejarán de requerir moderación previa.`}
                            confirmar="Sí, verificar"
                          />
                        )}
                        {e.verificacion === "en_revision" && (
                          <AccionConfirmar
                            accion={rechazarVerificacion.bind(null, e.id)}
                            etiqueta="Rechazar"
                            icono="x"
                            variante="danger"
                            pregunta="¿Rechazar la verificación?"
                            nota={{ label: "Nota para la empresa", placeholder: "Ej: el NIT no coincide con la razón social.", obligatoria: true }}
                            confirmar="Rechazar"
                          />
                        )}
                        {e.verificacion === "verificada" && (
                          <AccionConfirmar
                            accion={revocarVerificacion.bind(null, e.id)}
                            etiqueta="Revocar verificación"
                            icono="revocar"
                            variante="danger"
                            pregunta="¿Revocar la verificación? Sus nuevas vacantes volverán a moderación."
                            nota={{ label: "Motivo (visible para la empresa)", obligatoria: true }}
                            confirmar="Revocar"
                          />
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        totalPaginas={totalPaginas}
        basePath="/admin/empresas"
        baseParams={{ verificacion: filtro || undefined, q: sp.q }}
      />
    </main>
  );
}
