import Link from "next/link";
import { ShieldCheck, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/page-header";
import { StaffRolSelect } from "@/components/admin/staff-rol-select";
import { exigirPermiso, ROL_DESCRIPCION, ROL_LABEL, type StaffRol } from "@/lib/roles";
import { getStaffList } from "@/lib/data/admin";
import { tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Staff · Administración" };

const COLUMNAS: Columna[] = [
  { key: "nombre", label: "Miembro" },
  { key: "creado", label: "Desde" },
  { key: "rol", label: "Rol", align: "right" },
];

const ROLES: StaffRol[] = ["super_admin", "admin", "moderador"];

export default async function AdminStaffPage() {
  const staff = await exigirPermiso("gestionar_staff");
  const equipo = await getStaffList();

  return (
    <main className="space-y-6">
      <PageHeader kicker="Equipo" titulo="Staff y roles">
        Solo un <strong>super admin</strong> cambia roles; cada cambio queda en{" "}
        <Link href="/admin/auditoria?accion=staff.rol_cambiado" className="font-bold text-brand-700 hover:underline">
          auditoría
        </Link>
        . Los super admin definidos por variable de entorno no aparecen en esta tabla.
      </PageHeader>

      <section className="grid gap-3 sm:grid-cols-3">
        {ROLES.map((rol) => (
          <Card key={rol}>
            <CardBody className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                <Badge tone="brand">{ROL_LABEL[rol]}</Badge>
              </div>
              <p className="text-sm text-ink-soft">{ROL_DESCRIPCION[rol]}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      <DataTable
        columnas={COLUMNAS}
        hayFilas={equipo.length > 0}
        vacio={
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="No hay miembros en la tabla staff"
            description="Añade filas a la tabla staff (vía service-role) para dar acceso con roles no bootstrap."
            className="border-0 bg-transparent py-8 shadow-none"
          />
        }
      >
        {equipo.map((m) => (
          <tr key={m.user_id} className="hover:bg-canvas">
            <td className="px-4 py-3">
              <span className="font-semibold text-ink">{m.nombre ?? "Sin nombre"}</span>
              <span className="block truncate text-xs text-muted" title={m.user_id}>
                {m.email ?? m.user_id}
              </span>
            </td>
            <td className="px-4 py-3 text-muted tabular-nums">{tiempoRelativo(m.creado_en)}</td>
            <td className="px-4 py-3 text-right">
              <div className="flex justify-end">
                <StaffRolSelect userId={m.user_id} rol={m.rol as StaffRol} esYo={m.user_id === staff.userId} />
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </main>
  );
}
