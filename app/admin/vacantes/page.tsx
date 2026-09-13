import Link from "next/link";
import { Briefcase, MapPin, ArrowUpRight, AlertTriangle, Flag, ScrollText } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FiltroTabs, type FiltroOpcion } from "@/components/admin/filtro-tabs";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/page-header";
import { AccionConfirmar } from "@/components/admin/accion-confirmar";
import {
  labelArea,
  labelEstadoVacante,
  labelMotivoReporte,
  MODERACION_LABEL,
  MODERACION_TONO,
  VERIFICACION_LABEL,
  VERIFICACION_TONO,
} from "@/components/admin/labels";
import { listarVacantes, getConteosModeracion, ESTADOS_MODERACION_FILTRO } from "@/lib/data/admin";
import { moderarVacante } from "@/lib/actions/admin";
import { exigirPermiso, puede } from "@/lib/roles";
import { tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Moderación de vacantes · Administración" };

export default async function AdminVacantesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; page?: string }>;
}) {
  const staff = await exigirPermiso("moderar");
  const sp = await searchParams;
  // Sin parámetro = cola de revisión (pendiente).
  const filtro =
    sp.estado === "todas" || (ESTADOS_MODERACION_FILTRO as readonly string[]).includes(sp.estado ?? "") ? sp.estado! : "";
  const estado = filtro === "" ? "pendiente" : filtro === "todas" ? undefined : filtro;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const [{ items, total, totalPaginas }, conteos] = await Promise.all([
    listarVacantes({ estado, page }),
    getConteosModeracion(),
  ]);
  const puedeAuditar = puede(staff.rol, "ver_auditoria");

  const opciones: FiltroOpcion[] = [
    { value: "", label: "En revisión", total: conteos.pendiente },
    { value: "reportada", label: "Reportadas", total: conteos.reportada },
    { value: "rechazada", label: "Rechazadas", total: conteos.rechazada },
    { value: "aprobada", label: "Aprobadas", total: conteos.aprobada },
    { value: "todas", label: "Todas", total: conteos.todas },
  ];

  return (
    <main className="space-y-6">
      <PageHeader
        kicker="Moderación"
        titulo="Vacantes"
        acciones={
          conteos.reportada > 0 ? (
            <Link href="/admin/reportes" className="chip hover:bg-sol-100">
              <Flag className="h-4 w-4" /> {conteos.reportada} reportadas
            </Link>
          ) : undefined
        }
      >
        <strong className="tabular-nums">{total.toLocaleString("es-CO")}</strong> en este filtro. El motivo de un rechazo
        lo ve la empresa. Aprobar una vacante publicada avisa a los candidatos compatibles.
      </PageHeader>

      <FiltroTabs param="estado" opciones={opciones} activo={filtro} />

      {items.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title={filtro === "" ? "Nada por revisar" : "Sin vacantes en este estado"}
          description={filtro === "" ? "La cola de moderación está al día." : "Cambia el filtro para ver otras publicaciones."}
        />
      ) : (
        <ul className="space-y-4">
          {items.map((v) => (
            <li key={v.id}>
              <Card>
                <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-ink">{v.titulo}</h2>
                      <Badge tone={MODERACION_TONO[v.estado_moderacion] ?? "neutral"}>
                        {MODERACION_LABEL[v.estado_moderacion] ?? v.estado_moderacion}
                      </Badge>
                      <Badge tone={v.es_publica ? "success" : "outline"}>
                        {labelEstadoVacante(v.estado)}
                        {v.es_publica ? " · visible" : ""}
                      </Badge>
                    </div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                      <span className="font-semibold text-ink">{v.empresa_nombre}</span>
                      <Badge tone={VERIFICACION_TONO[v.empresa_verificacion] ?? "neutral"}>
                        {VERIFICACION_LABEL[v.empresa_verificacion] ?? v.empresa_verificacion}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted" /> {v.ciudad}
                      </span>
                      <span>{labelArea(v.area)}</span>
                      <span className="text-muted tabular-nums">Creada {tiempoRelativo(v.creado_en)}</span>
                    </p>

                    {v.motivo_moderacion && (
                      <p className="flex items-start gap-2 rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm text-ink-soft">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-500" />
                        <span>
                          <strong className="text-ink">
                            {v.estado_moderacion === "rechazada" ? "Motivo del rechazo:" : "Motivos de revisión:"}
                          </strong>{" "}
                          {v.motivo_moderacion}
                        </span>
                      </p>
                    )}

                    {v.reportes.length > 0 && (
                      <div className="rounded-xl border-2 border-ink bg-accent-50 px-3 py-2 text-sm">
                        <p className="flex items-center gap-2 font-bold text-ink">
                          <Flag className="h-4 w-4 text-accent-600" /> {v.reportes.length} reportes abiertos
                        </p>
                        <ul className="mt-1 space-y-0.5 text-ink-soft">
                          {v.reportes.slice(0, 4).map((r) => (
                            <li key={r.id}>
                              <strong className="text-ink">{labelMotivoReporte(r.motivo)}</strong>
                              {r.detalle ? ` — ${r.detalle}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-4">
                      <Link
                        href={`/v/${v.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline"
                      >
                        Ver ficha <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                      {puedeAuditar && (
                        <Link
                          href={`/admin/auditoria?entidad=vacantes&entidadId=${v.id}`}
                          className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline"
                        >
                          <ScrollText className="h-3.5 w-3.5" /> Auditoría
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-start gap-2 lg:max-w-sm lg:justify-end lg:pt-1">
                    {v.estado_moderacion !== "aprobada" && (
                      <AccionConfirmar
                        accion={moderarVacante.bind(null, v.id, "aprobada")}
                        etiqueta="Aprobar"
                        icono="check"
                        variante="success"
                        pregunta={
                          v.estado === "publicada" && v.estado_moderacion !== "reportada"
                            ? "¿Aprobar? La vacante quedará visible y se avisará a los candidatos compatibles."
                            : "¿Aprobar la vacante?"
                        }
                        confirmar="Sí, aprobar"
                      />
                    )}
                    <AccionConfirmar
                      accion={moderarVacante.bind(null, v.id, "rechazada")}
                      etiqueta={v.estado_moderacion === "rechazada" ? "Cambiar motivo" : "Rechazar"}
                      icono="x"
                      variante="danger"
                      pregunta="¿Rechazar la vacante? Dejará de estar visible."
                      nota={{
                        label: "Motivo (lo verá la empresa)",
                        placeholder: "Ej: la oferta cobra al candidato por el proceso.",
                        obligatoria: true,
                      }}
                      confirmar="Rechazar"
                    />
                  </div>
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPaginas={totalPaginas} basePath="/admin/vacantes" baseParams={{ estado: filtro || undefined }} />
    </main>
  );
}
