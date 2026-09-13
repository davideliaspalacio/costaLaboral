import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/admin/search-box";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/admin/page-header";
import { CandidatoToggle } from "@/components/admin/candidato-toggle";
import { fechaCO, labelArea, labelNivel, planInfo, SUSCRIPCION_ESTADO_LABEL } from "@/components/admin/labels";
import { listarCandidatos } from "@/lib/data/admin";
import { exigirPermiso, puede } from "@/lib/roles";
import { tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Candidatos · Administración" };

export default async function AdminCandidatosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const staff = await exigirPermiso("ver");
  const { q, page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const { items, total, totalPaginas } = await listarCandidatos({ q, page });
  const puedeGestionar = puede(staff.rol, "gestionar_usuarios");

  const columnas: Columna[] = [
    { key: "nombre", label: "Nombre" },
    { key: "ciudad", label: "Ciudad" },
    { key: "area", label: "Área" },
    { key: "nivel", label: "Nivel" },
    { key: "plan", label: "Plan" },
    { key: "estado", label: "Estado" },
    { key: "fecha", label: "Registro", align: "right" },
    ...(puedeGestionar ? [{ key: "accion", label: "", align: "right" } as Columna] : []),
  ];

  return (
    <main className="space-y-6">
      <PageHeader kicker="Gestión de usuarios" titulo="Candidatos">
        <strong className="tabular-nums">{total.toLocaleString("es-CO")}</strong> registrados
        {q ? ` · resultados para “${q}”` : ""}. El plan sale de la suscripción vigente.
      </PageHeader>

      <SearchBox action="/admin/candidatos" defaultValue={q ?? ""} placeholder="Buscar por nombre o ciudad" />

      <DataTable
        columnas={columnas}
        hayFilas={items.length > 0}
        vacio={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={q ? "Sin coincidencias" : "Aún no hay candidatos"}
            description={q ? "Prueba con otro nombre o ciudad." : "Cuando alguien se registre aparecerá en esta lista."}
            className="border-0 bg-transparent py-8 shadow-none"
          />
        }
      >
        {items.map((c) => {
          const plan = planInfo(c.suscripcion?.plan ?? "gratis");
          return (
            <tr key={c.id} className="hover:bg-canvas">
              <td className="px-4 py-3 font-semibold text-ink">{c.nombre}</td>
              <td className="px-4 py-3 text-ink-soft">{c.ciudad}</td>
              <td className="px-4 py-3 text-ink-soft">{labelArea(c.area_interes)}</td>
              <td className="px-4 py-3 text-ink-soft">{labelNivel(c.nivel_educativo)}</td>
              <td className="px-4 py-3">
                <Badge tone={plan.tone}>{plan.label}</Badge>
                {c.suscripcion && (
                  <span className="mt-1 block text-xs text-muted">
                    {c.suscripcion.estado !== "active" && `${SUSCRIPCION_ESTADO_LABEL[c.suscripcion.estado]} · `}
                    hasta {fechaCO(c.suscripcion.periodo_fin)}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {c.activo ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}
                  {c.wsp_opt_in && <Badge tone="outline">WhatsApp</Badge>}
                </div>
              </td>
              <td className="px-4 py-3 text-right text-muted tabular-nums">{tiempoRelativo(c.creado_en)}</td>
              {puedeGestionar && (
                <td className="px-4 py-3 text-right">
                  <CandidatoToggle candidatoId={c.id} activo={c.activo} />
                </td>
              )}
            </tr>
          );
        })}
      </DataTable>

      <Pagination page={page} totalPaginas={totalPaginas} basePath="/admin/candidatos" baseParams={{ q }} />
    </main>
  );
}
