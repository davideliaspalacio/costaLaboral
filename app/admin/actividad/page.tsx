import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { FiltroTabs, type FiltroOpcion } from "@/components/admin/filtro-tabs";
import { labelEvento, EVENTO_TONO, EVENTO_LABEL, resumenMeta } from "@/components/admin/labels";
import { getEventosRecientes } from "@/lib/data/admin";
import { tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Actividad · Administración" };

const COLUMNAS: Columna[] = [
  { key: "tipo", label: "Tipo" },
  { key: "actor", label: "Actor" },
  { key: "entidad", label: "Entidad" },
  { key: "meta", label: "Detalle" },
  { key: "cuando", label: "Cuándo", align: "right" },
];

const TIPOS = Object.keys(EVENTO_LABEL);

const ACTOR_LABEL: Record<string, string> = {
  candidato: "Candidato",
  empresa: "Empresa",
  admin: "Admin",
  sistema: "Sistema",
};

export default async function AdminActividadPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo: tipoRaw } = await searchParams;
  const tipo = TIPOS.includes(tipoRaw ?? "") ? tipoRaw : undefined;
  const eventos = await getEventosRecientes(100, tipo);

  const opciones: FiltroOpcion[] = [
    { value: "", label: "Todos" },
    ...TIPOS.map((t) => ({ value: t, label: EVENTO_LABEL[t] })),
  ];

  return (
    <main className="space-y-6">
      <header>
        <span className="kicker">Tracking de uso</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Actividad
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Registro de eventos de toda la plataforma. Mostrando los{" "}
          <strong className="tabular-nums">{eventos.length}</strong> más recientes.
        </p>
      </header>

      <FiltroTabs param="tipo" opciones={opciones} activo={tipo ?? ""} />

      <DataTable
        columnas={COLUMNAS}
        hayFilas={eventos.length > 0}
        vacio={
          <EmptyState
            icon={<Activity className="h-6 w-6" />}
            title="Sin eventos"
            description="No hay eventos de este tipo todavía."
            className="border-0 bg-transparent py-8 shadow-none"
          />
        }
      >
        {eventos.map((e) => (
          <tr key={e.id} className="hover:bg-canvas">
            <td className="px-4 py-3">
              <Badge tone={EVENTO_TONO[e.tipo] ?? "neutral"}>{labelEvento(e.tipo)}</Badge>
            </td>
            <td className="px-4 py-3 text-ink-soft">{ACTOR_LABEL[e.actor_tipo ?? ""] ?? "—"}</td>
            <td className="px-4 py-3 text-ink-soft">{e.entidad ?? "—"}</td>
            <td className="px-4 py-3 text-ink-soft">
              <span className="line-clamp-1 max-w-xs">{resumenMeta(e.meta)}</span>
            </td>
            <td className="px-4 py-3 text-right text-muted tabular-nums">
              {tiempoRelativo(e.creado_en)}
            </td>
          </tr>
        ))}
      </DataTable>
    </main>
  );
}
