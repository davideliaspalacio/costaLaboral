import Link from "next/link";
import { Activity, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { FiltroTabs, type FiltroOpcion } from "@/components/admin/filtro-tabs";
import { PageHeader } from "@/components/admin/page-header";
import { ACTOR_LABEL, ENTIDAD_LABEL, EVENTO_LABEL, EVENTO_TONO, fechaCO, labelEvento, resumenMeta } from "@/components/admin/labels";
import { getEventosRecientes } from "@/lib/data/admin";
import { exigirPermiso, puede } from "@/lib/roles";

export const metadata = { title: "Actividad · Administración" };

const COLUMNAS: Columna[] = [
  { key: "tipo", label: "Evento" },
  { key: "actor", label: "Actor" },
  { key: "entidad", label: "Entidad" },
  { key: "meta", label: "Detalle" },
  { key: "cuando", label: "Cuándo", align: "right" },
];

/** Tipos con pestaña (los más útiles); el resto se filtra por ?tipo= igualmente. */
const TIPOS_TAB = [
  "vacante_vista",
  "postulacion",
  "registro_candidato",
  "registro_empresa",
  "vacante_publicada",
  "recomendaciones_mostradas",
  "reporte_vacante",
  "pago_aprobado",
  "hv_generada",
  "vacante_moderada",
];

export default async function AdminActividadPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; antes?: string }>;
}) {
  const staff = await exigirPermiso("ver");
  const { tipo: tipoRaw, antes } = await searchParams;
  const tipo = tipoRaw && tipoRaw in EVENTO_LABEL ? tipoRaw : undefined;
  const { items, siguiente } = await getEventosRecientes(100, tipo, antes);

  const opciones: FiltroOpcion[] = [
    { value: "", label: "Todos" },
    ...[...new Set([...TIPOS_TAB, ...(tipo ? [tipo] : [])])].map((t) => ({ value: t, label: EVENTO_LABEL[t] })),
  ];
  const qs = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ tipo, ...extra }).filter((e): e is [string, string] => Boolean(e[1])));
    const s = p.toString();
    return s ? `/admin/actividad?${s}` : "/admin/actividad";
  };

  return (
    <main className="space-y-6">
      <PageHeader kicker="Analítica de producto" titulo="Actividad">
        Eventos que alimentan los KPIs. Para saber quién cambió qué, usa{" "}
        {puede(staff.rol, "ver_auditoria") ? (
          <Link href="/admin/auditoria" className="font-bold text-brand-700 hover:underline">
            Auditoría
          </Link>
        ) : (
          "Auditoría"
        )}
        .
      </PageHeader>

      <FiltroTabs param="tipo" opciones={opciones} activo={tipo ?? ""} />

      <DataTable
        columnas={COLUMNAS}
        hayFilas={items.length > 0}
        vacio={
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="Sin eventos"
            description="No hay eventos de este tipo todavía."
            className="border-0 bg-transparent py-8 shadow-none"
          />
        }
      >
        {items.map((e) => (
          <tr key={e.id} className="hover:bg-canvas">
            <td className="px-4 py-3">
              <Badge tone={EVENTO_TONO[e.tipo] ?? "neutral"}>{labelEvento(e.tipo)}</Badge>
            </td>
            <td className="px-4 py-3 text-ink-soft">{ACTOR_LABEL[e.actor_tipo ?? ""] ?? "—"}</td>
            <td className="px-4 py-3 text-ink-soft">{e.entidad ? (ENTIDAD_LABEL[e.entidad] ?? e.entidad) : "—"}</td>
            <td className="px-4 py-3 text-ink-soft">
              <span className="line-clamp-1 max-w-xs">{resumenMeta(e.meta)}</span>
            </td>
            <td className="px-4 py-3 text-right text-xs text-muted tabular-nums">{fechaCO(e.creado_en, true)}</td>
          </tr>
        ))}
      </DataTable>

      <nav className="flex items-center justify-between gap-3" aria-label="Paginación">
        {antes ? (
          <Link href={qs({})} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Volver a lo más reciente
          </Link>
        ) : (
          <span />
        )}
        {siguiente && (
          <Link href={qs({ antes: siguiente })} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Más antiguos <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </nav>
    </main>
  );
}
