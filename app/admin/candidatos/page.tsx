import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/admin/search-box";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { CandidatoToggle } from "@/components/admin/candidato-toggle";
import { labelArea, labelNivel, planInfo } from "@/components/admin/labels";
import { listarCandidatos } from "@/lib/data/admin";
import { tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Candidatos · Administración" };

const COLUMNAS: Columna[] = [
  { key: "nombre", label: "Nombre" },
  { key: "ciudad", label: "Ciudad" },
  { key: "area", label: "Área" },
  { key: "nivel", label: "Nivel" },
  { key: "plan", label: "Plan" },
  { key: "estado", label: "Estado" },
  { key: "fecha", label: "Registro", align: "right" },
  { key: "accion", label: "", align: "right" },
];

export default async function AdminCandidatosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const { items, total, totalPaginas } = await listarCandidatos({ q, page });

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="kicker">Gestión de usuarios</span>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Candidatos
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            <strong className="tabular-nums">{total.toLocaleString("es-CO")}</strong> registrados
            {q ? ` · resultados para “${q}”` : ""}.
          </p>
        </div>
      </header>

      <SearchBox action="/admin/candidatos" defaultValue={q ?? ""} placeholder="Buscar por nombre o ciudad" />

      <DataTable
        columnas={COLUMNAS}
        hayFilas={items.length > 0}
        vacio={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={q ? "Sin coincidencias" : "Aún no hay candidatos"}
            description={
              q
                ? "Prueba con otro nombre o ciudad."
                : "Cuando alguien se registre aparecerá en esta lista."
            }
            className="border-0 bg-transparent py-8 shadow-none"
          />
        }
      >
        {items.map((c) => {
          const plan = planInfo(c.plan);
          return (
            <tr key={c.id} className="hover:bg-canvas">
              <td className="px-4 py-3 font-semibold text-ink">{c.nombre}</td>
              <td className="px-4 py-3 text-ink-soft">{c.ciudad}</td>
              <td className="px-4 py-3 text-ink-soft">{labelArea(c.area_interes)}</td>
              <td className="px-4 py-3 text-ink-soft">{labelNivel(c.nivel_educativo)}</td>
              <td className="px-4 py-3">
                <Badge tone={plan.tone}>{plan.label}</Badge>
              </td>
              <td className="px-4 py-3">
                {c.activo ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}
              </td>
              <td className="px-4 py-3 text-right text-muted tabular-nums">
                {tiempoRelativo(c.creado_en)}
              </td>
              <td className="px-4 py-3 text-right">
                <CandidatoToggle candidatoId={c.id} activo={c.activo} />
              </td>
            </tr>
          );
        })}
      </DataTable>

      <Pagination
        page={page}
        totalPaginas={totalPaginas}
        basePath="/admin/candidatos"
        baseParams={{ q }}
      />
    </main>
  );
}
