import { Building2, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { EmpresaVerify } from "@/components/admin/empresa-verify";
import { labelSector } from "@/components/admin/labels";
import { listarEmpresas } from "@/lib/data/admin";
import { tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Empresas · Administración" };

const COLUMNAS: Columna[] = [
  { key: "empresa", label: "Empresa" },
  { key: "sector", label: "Sector" },
  { key: "ciudad", label: "Ciudad" },
  { key: "vacantes", label: "Vacantes", align: "right" },
  { key: "fecha", label: "Registro", align: "right" },
  { key: "accion", label: "Verificación", align: "right" },
];

export default async function AdminEmpresasPage() {
  const empresas = await listarEmpresas();
  const pendientes = empresas.filter((e) => !e.verificada).length;

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="kicker">Gestión de empresas</span>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Empresas
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            <strong className="tabular-nums">{empresas.length.toLocaleString("es-CO")}</strong>{" "}
            registradas · las no verificadas van primero.
          </p>
        </div>
        {pendientes > 0 && (
          <Badge tone="warn" className="tabular-nums">
            <BadgeCheck className="h-3.5 w-3.5" /> {pendientes} en cola de verificación
          </Badge>
        )}
      </header>

      <DataTable
        columnas={COLUMNAS}
        hayFilas={empresas.length > 0}
        vacio={
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="Aún no hay empresas"
            description="Cuando una empresa publique su primera vacante aparecerá aquí."
            className="border-0 bg-transparent py-8 shadow-none"
          />
        }
      >
        {empresas.map((e) => (
          <tr key={e.id} className={e.verificada ? "hover:bg-canvas" : "bg-warn-50/40 hover:bg-warn-50/70"}>
            <td className="px-4 py-3">
              <span className="font-semibold text-ink">{e.nombre_negocio}</span>
            </td>
            <td className="px-4 py-3 text-ink-soft">{labelSector(e.sector)}</td>
            <td className="px-4 py-3 text-ink-soft">{e.ciudad}</td>
            <td className="px-4 py-3 text-right text-ink-soft tabular-nums">{e.total_vacantes}</td>
            <td className="px-4 py-3 text-right text-muted tabular-nums">{tiempoRelativo(e.creado_en)}</td>
            <td className="px-4 py-3 text-right">
              <div className="flex justify-end">
                <EmpresaVerify empresaId={e.id} verificada={e.verificada} />
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </main>
  );
}
