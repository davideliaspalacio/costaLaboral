import Link from "next/link";
import { ArrowUpRight, Flag, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { AccionConfirmar } from "@/components/admin/accion-confirmar";
import { labelMotivoReporte, MODERACION_LABEL, MODERACION_TONO, labelEstadoVacante } from "@/components/admin/labels";
import { listarReportesAbiertos } from "@/lib/data/admin";
import { confirmarReportes, descartarReportes } from "@/lib/actions/admin";
import { exigirPermiso } from "@/lib/roles";
import { tiempoRelativo } from "@/lib/utils";
import { REPORTES_PARA_OCULTAR } from "@/lib/constants";

export const metadata = { title: "Reportes · Administración" };

export default async function AdminReportesPage() {
  await exigirPermiso("moderar");
  const { grupos, truncado } = await listarReportesAbiertos();
  const totalReportes = grupos.reduce((s, g) => s + g.total, 0);

  return (
    <main className="space-y-6">
      <PageHeader kicker="Moderación" titulo="Reportes de usuarios">
        <strong className="tabular-nums">{totalReportes}</strong> reportes abiertos en{" "}
        <strong className="tabular-nums">{grupos.length}</strong> vacantes. Con {REPORTES_PARA_OCULTAR} reportes de usuarios
        distintos la vacante se oculta hasta revisión.
        {truncado && " Se muestran los 1.000 reportes más recientes."}
      </PageHeader>

      {grupos.length === 0 ? (
        <EmptyState icon={<Flag className="h-6 w-6" />} title="Sin reportes abiertos" description="Nadie ha reportado vacantes pendientes de revisión." />
      ) : (
        <ul className="space-y-4">
          {grupos.map((g) => (
            <li key={g.vacante.id}>
              <Card pop={g.vacante.estado_moderacion === "reportada"}>
                <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-9 min-w-9 place-items-center rounded-xl border-2 border-ink bg-accent-500 px-2 font-display text-lg font-extrabold text-white tabular-nums">
                        {g.total}
                      </span>
                      <h2 className="text-base font-bold text-ink">{g.vacante.titulo}</h2>
                      <Badge tone={MODERACION_TONO[g.vacante.estado_moderacion] ?? "neutral"}>
                        {MODERACION_LABEL[g.vacante.estado_moderacion] ?? g.vacante.estado_moderacion}
                      </Badge>
                      <Badge tone="outline">{labelEstadoVacante(g.vacante.estado)}</Badge>
                    </div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                      <span className="font-semibold text-ink">{g.vacante.empresa_nombre}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted" /> {g.vacante.ciudad}
                      </span>
                      <span className="text-muted">Último reporte {tiempoRelativo(g.ultimo)}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {g.motivos.map((m) => (
                        <span key={m.motivo} className="chip text-xs">
                          {labelMotivoReporte(m.motivo)} <span className="tabular-nums text-muted">×{m.total}</span>
                        </span>
                      ))}
                    </div>
                    {g.reportes.some((r) => r.detalle) && (
                      <ul className="space-y-1 rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm text-ink-soft">
                        {g.reportes
                          .filter((r) => r.detalle)
                          .slice(0, 5)
                          .map((r) => (
                            <li key={r.id}>
                              <strong className="text-ink">{labelMotivoReporte(r.motivo)}:</strong> “{r.detalle}”
                            </li>
                          ))}
                      </ul>
                    )}
                    <Link
                      href={`/v/${g.vacante.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline"
                    >
                      Ver ficha <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-start gap-2 lg:max-w-sm lg:justify-end">
                    <AccionConfirmar
                      accion={descartarReportes.bind(null, g.vacante.id)}
                      etiqueta="Descartar reportes"
                      icono="undo"
                      variante="outline"
                      pregunta={
                        g.vacante.estado_moderacion === "reportada"
                          ? "¿Descartar los reportes? La vacante volverá a estar aprobada."
                          : "¿Descartar los reportes?"
                      }
                      nota={{ label: "Nota interna", placeholder: "Ej: revisada con la empresa, la oferta es legítima." }}
                      confirmar="Descartar"
                    />
                    <AccionConfirmar
                      accion={confirmarReportes.bind(null, g.vacante.id)}
                      etiqueta="Confirmar y rechazar vacante"
                      icono="ban"
                      variante="danger"
                      pregunta="¿Confirmar los reportes y rechazar la vacante?"
                      nota={{ label: "Motivo del rechazo (lo verá la empresa)", obligatoria: true }}
                      confirmar="Rechazar vacante"
                    />
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
