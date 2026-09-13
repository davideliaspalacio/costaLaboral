import Link from "next/link";
import { ArrowUpRight, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { FiltroTabs, type FiltroOpcion } from "@/components/admin/filtro-tabs";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/page-header";
import {
  fechaCO,
  semaforoSolicitud,
  SEMAFORO_SOLICITUD,
  SOLICITUD_ESTADO_LABEL,
  SOLICITUD_ESTADO_TONO,
  SOLICITUD_TIPO_LABEL,
} from "@/components/admin/labels";
import { ESTADOS_SOLICITUD, listarSolicitudes } from "@/lib/data/admin";
import { exigirPermiso } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Solicitudes de titulares · Administración" };

const COLUMNAS: Columna[] = [
  { key: "plazo", label: "Plazo" },
  { key: "radicado", label: "Radicado" },
  { key: "titular", label: "Titular" },
  { key: "tipo", label: "Tipo" },
  { key: "estado", label: "Estado" },
  { key: "vence", label: "Vence", align: "right" },
  { key: "ver", label: "", align: "right" },
];

export default async function AdminSolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; page?: string }>;
}) {
  await exigirPermiso("atender_solicitudes");
  const sp = await searchParams;
  const filtro = sp.estado === "todas" || (ESTADOS_SOLICITUD as readonly string[]).includes(sp.estado ?? "") ? sp.estado! : "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { items, total, totalPaginas } = await listarSolicitudes({ estado: filtro || undefined, page });
  const ahora = new Date();

  const opciones: FiltroOpcion[] = [
    { value: "", label: "Abiertas" },
    ...ESTADOS_SOLICITUD.map((e) => ({ value: e, label: SOLICITUD_ESTADO_LABEL[e] })),
    { value: "todas", label: "Todas" },
  ];

  return (
    <main className="space-y-6">
      <PageHeader kicker="Ley 1581 de 2012" titulo="Solicitudes de titulares">
        <strong className="tabular-nums">{total}</strong> en este filtro, por vencimiento. Consultas: 10 días hábiles
        (+5 de prórroga). Reclamos: 15 días hábiles (+8). La prórroga se permite una vez.
      </PageHeader>

      <FiltroTabs param="estado" opciones={opciones} activo={filtro} />

      <DataTable
        columnas={COLUMNAS}
        hayFilas={items.length > 0}
        vacio={
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            title="Sin solicitudes"
            description={filtro === "" ? "No hay solicitudes abiertas." : "No hay solicitudes en este estado."}
            className="border-0 bg-transparent py-8 shadow-none"
          />
        }
      >
        {items.map((s) => {
          const sem = semaforoSolicitud(s.vence_en, s.estado, ahora);
          return (
            <tr
              key={s.id}
              className={cn("hover:bg-canvas", sem === "vencida" && "bg-danger-50", sem === "por_vencer" && "bg-sol-100")}
            >
              <td className="px-4 py-3">
                <Badge tone={SEMAFORO_SOLICITUD[sem].tone}>{SEMAFORO_SOLICITUD[sem].label}</Badge>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-ink">{s.radicado}</td>
              <td className="px-4 py-3 font-semibold text-ink">{s.nombre}</td>
              <td className="px-4 py-3 text-ink-soft">{SOLICITUD_TIPO_LABEL[s.tipo] ?? s.tipo}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  <Badge tone={SOLICITUD_ESTADO_TONO[s.estado] ?? "neutral"}>{SOLICITUD_ESTADO_LABEL[s.estado] ?? s.estado}</Badge>
                  {s.prorrogada && <Badge tone="outline">Prorrogada</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 text-right text-xs text-ink-soft tabular-nums">{fechaCO(s.vence_en, true)}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/solicitudes/${s.id}`}
                  className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:underline"
                >
                  Atender <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </td>
            </tr>
          );
        })}
      </DataTable>

      <Pagination page={page} totalPaginas={totalPaginas} basePath="/admin/solicitudes" baseParams={{ estado: filtro || undefined }} />
    </main>
  );
}
