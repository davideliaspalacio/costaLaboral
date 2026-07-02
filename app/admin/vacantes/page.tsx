import Link from "next/link";
import { Briefcase, MapPin, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { FiltroTabs, type FiltroOpcion } from "@/components/admin/filtro-tabs";
import { VacanteModerar } from "@/components/admin/vacante-moderar";
import { labelArea, MODERACION_LABEL, MODERACION_TONO } from "@/components/admin/labels";
import { listarVacantes, getConteosModeracion } from "@/lib/data/admin";
import { tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Vacantes · Administración" };

const ESTADOS = ["aprobada", "pendiente", "rechazada", "reportada"] as const;

export default async function AdminVacantesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado: estadoRaw } = await searchParams;
  const estado = (ESTADOS as readonly string[]).includes(estadoRaw ?? "") ? estadoRaw : undefined;

  const [vacantes, conteos] = await Promise.all([
    listarVacantes({ estado }),
    getConteosModeracion(),
  ]);

  const opciones: FiltroOpcion[] = [
    { value: "", label: "Todas", total: conteos.todas },
    ...ESTADOS.map((e) => ({ value: e, label: MODERACION_LABEL[e], total: conteos[e] })),
  ];

  return (
    <main className="space-y-6">
      <header>
        <span className="kicker">Moderación</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Vacantes
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Aprueba, rechaza o reporta publicaciones. Rechazar despublica la vacante.
        </p>
      </header>

      <FiltroTabs param="estado" opciones={opciones} activo={estado ?? ""} />

      {vacantes.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="Sin vacantes en este estado"
          description="Cambia el filtro para ver otras publicaciones."
        />
      ) : (
        <ul className="space-y-4">
          {vacantes.map((v) => (
            <li key={v.id}>
              <Card>
                <CardBody className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-ink">{v.titulo}</h2>
                      <Badge tone={MODERACION_TONO[v.estado_moderacion] ?? "neutral"}>
                        {MODERACION_LABEL[v.estado_moderacion] ?? v.estado_moderacion}
                      </Badge>
                      {!v.activa && <Badge tone="neutral">Despublicada</Badge>}
                    </div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
                      <span className="font-semibold text-ink">{v.empresa_nombre}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted" /> {v.ciudad}
                      </span>
                      <span>{labelArea(v.area)}</span>
                      <span className="text-muted tabular-nums">{tiempoRelativo(v.creado_en)}</span>
                    </p>
                    {v.motivo_moderacion && (
                      <p className="flex items-start gap-2 rounded-xl border-2 border-line bg-canvas px-3 py-2 text-sm text-ink-soft">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn-500" />
                        <span>
                          <strong className="text-ink">Motivo:</strong> {v.motivo_moderacion}
                        </span>
                      </p>
                    )}
                    <Link
                      href={`/v/${v.id}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline"
                    >
                      Ver ficha <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="shrink-0 lg:pt-1">
                    <VacanteModerar vacanteId={v.id} estado={v.estado_moderacion} />
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
