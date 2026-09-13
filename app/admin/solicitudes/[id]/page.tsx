import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { AccionConfirmar } from "@/components/admin/accion-confirmar";
import { SolicitudEstadoForm } from "@/components/admin/solicitud-estado-form";
import {
  fechaCO,
  semaforoSolicitud,
  SEMAFORO_SOLICITUD,
  SOLICITUD_ESTADO_LABEL,
  SOLICITUD_ESTADO_TONO,
  SOLICITUD_TIPO_LABEL,
  tonoAccion,
  valorLegible,
} from "@/components/admin/labels";
import { getAuditoriaDeEntidad, getSolicitud } from "@/lib/data/admin";
import { prorrogarSolicitud } from "@/lib/actions/admin";
import { claseSolicitud, PLAZOS_HABEAS_DATA, sumarDiasHabiles } from "@/lib/legal/dias-habiles";
import { exigirPermiso } from "@/lib/roles";

export const metadata = { title: "Solicitud de titular · Administración" };

export default async function AdminSolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  await exigirPermiso("atender_solicitudes");
  const { id } = await params;
  const s = await getSolicitud(id);
  if (!s) notFound();

  const historial = await getAuditoriaDeEntidad("solicitudes_titular", s.id, 30);
  const sem = semaforoSolicitud(s.vence_en, s.estado);
  const clase = claseSolicitud(s.tipo);
  const plazo = PLAZOS_HABEAS_DATA[clase];
  const abierta = s.estado === "recibida" || s.estado === "en_tramite";
  const nuevoVence = sumarDiasHabiles(new Date(s.vence_en), plazo.prorroga).toISOString();

  return (
    <main className="space-y-6">
      <Link href="/admin/solicitudes" className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Solicitudes
      </Link>

      <PageHeader kicker={`Radicado ${s.radicado}`} titulo={SOLICITUD_TIPO_LABEL[s.tipo] ?? s.tipo}>
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={SOLICITUD_ESTADO_TONO[s.estado] ?? "neutral"}>{SOLICITUD_ESTADO_LABEL[s.estado] ?? s.estado}</Badge>
          <Badge tone={SEMAFORO_SOLICITUD[sem].tone}>{SEMAFORO_SOLICITUD[sem].label}</Badge>
          {s.prorrogada && <Badge tone="outline">Prorrogada</Badge>}
          <span>
            Se tramita como <strong>{clase}</strong> ({plazo.dias} días hábiles).
          </span>
        </span>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card>
            <CardBody className="space-y-4">
              <h2 className="text-lg font-bold text-ink">Solicitud</h2>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted">Titular</dt>
                  <dd className="font-semibold text-ink">{s.nombre}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Documento</dt>
                  <dd className="text-ink tabular-nums">
                    {s.tipo_documento} {s.numero_documento}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Correo</dt>
                  <dd className="break-all text-ink">{s.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Teléfono</dt>
                  <dd className="text-ink">{s.telefono ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Recibida</dt>
                  <dd className="text-ink">{fechaCO(s.creado_en, true)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Vence</dt>
                  <dd className="font-semibold text-ink">{fechaCO(s.vence_en, true)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Cuenta asociada</dt>
                  <dd className="break-all font-mono text-xs text-ink">{s.titular_id ?? "Sin cuenta"}</dd>
                </div>
              </dl>
              <div>
                <p className="text-xs text-muted">Descripción</p>
                <p className="mt-1 whitespace-pre-wrap rounded-xl border-2 border-line bg-canvas p-3 text-sm text-ink">{s.descripcion}</p>
              </div>
              {s.respuesta && (
                <div>
                  <p className="text-xs text-muted">Respuesta ({fechaCO(s.respondida_en, true)})</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-xl border-2 border-ink bg-success-50 p-3 text-sm text-ink">{s.respuesta}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3">
              <h2 className="text-lg font-bold text-ink">Historial</h2>
              {historial.length === 0 ? (
                <p className="text-sm text-muted">Sin cambios registrados.</p>
              ) : (
                <ol className="space-y-3">
                  {historial.map((h) => (
                    <li key={h.id} className="rounded-xl border-2 border-line p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={tonoAccion(h.accion)} className="font-mono">
                          {h.accion}
                        </Badge>
                        <span className="text-ink-soft">{h.actor_email ?? h.actor_tipo}</span>
                        <span className="ml-auto text-xs text-muted">{fechaCO(h.creado_en, true)}</span>
                      </div>
                      <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
                        {Object.keys(h.despues ?? {}).map((k) => (
                          <li key={k}>
                            <span className="font-mono">{k}</span>: {valorLegible(h.antes?.[k])} →{" "}
                            <strong className="text-ink">{valorLegible(h.despues?.[k])}</strong>
                          </li>
                        ))}
                        {typeof (h.metadata?.prorroga as { motivo?: string } | undefined)?.motivo === "string" && (
                          <li>Motivo de prórroga: {(h.metadata.prorroga as { motivo: string }).motivo}</li>
                        )}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </CardBody>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card pop>
            <CardBody className="space-y-3">
              <h2 className="text-lg font-bold text-ink">Atender</h2>
              <SolicitudEstadoForm solicitudId={s.id} estado={s.estado} tieneRespuesta={Boolean(s.respuesta)} />
            </CardBody>
          </Card>

          {abierta && (
            <Card>
              <CardBody className="space-y-3">
                <h2 className="text-lg font-bold text-ink">Prórroga</h2>
                {s.prorrogada ? (
                  <p className="text-sm text-ink-soft">Ya se usó la única prórroga permitida.</p>
                ) : (
                  <>
                    <p className="text-sm text-ink-soft">
                      Suma {plazo.prorroga} días hábiles: vencería el <strong className="text-ink">{fechaCO(nuevoVence, true)}</strong>.
                      Informa al titular el motivo antes del vencimiento actual.
                    </p>
                    <AccionConfirmar
                      accion={prorrogarSolicitud.bind(null, s.id)}
                      etiqueta="Prorrogar"
                      icono="clock"
                      variante="accent"
                      pregunta="¿Prorrogar la solicitud? Solo se permite una vez."
                      nota={{ label: "Motivo de la prórroga", obligatoria: true }}
                      confirmar="Prorrogar"
                    />
                  </>
                )}
              </CardBody>
            </Card>
          )}
        </aside>
      </div>
    </main>
  );
}
