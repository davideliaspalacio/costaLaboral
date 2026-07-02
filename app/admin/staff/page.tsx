import { redirect } from "next/navigation";
import { ShieldCheck, Users } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { StaffRolSelect } from "@/components/admin/staff-rol-select";
import { getStaff, puede, ROL_LABEL, type StaffRol } from "@/lib/roles";
import { getStaffList } from "@/lib/data/admin";
import { tiempoRelativo } from "@/lib/utils";

export const metadata = { title: "Staff · Administración" };

const COLUMNAS: Columna[] = [
  { key: "nombre", label: "Miembro" },
  { key: "creado", label: "Desde", align: "left" },
  { key: "rol", label: "Rol", align: "right" },
];

const ROLES_INFO: { rol: StaffRol; permisos: string }[] = [
  { rol: "super_admin", permisos: "Todo, incluida la gestión del equipo y los roles." },
  { rol: "admin", permisos: "Ver, moderar, verificar empresas, gestionar usuarios y planes." },
  { rol: "moderador", permisos: "Ver el panel y moderar vacantes." },
];

export default async function AdminStaffPage() {
  const staff = await getStaff();
  if (!staff || !puede(staff.rol, "gestionar_staff")) {
    // El enlace no aparece sin permiso; si llega directo, lo devolvemos al resumen.
    redirect("/admin");
  }

  const equipo = await getStaffList();

  return (
    <main className="space-y-6">
      <header>
        <span className="kicker">Equipo</span>
        <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Staff y roles
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Solo un <strong>super admin</strong> puede cambiar roles. Los super admin bootstrap por
          variable de entorno no aparecen en esta tabla.
        </p>
      </header>

      {/* ---------- Explicación de roles ---------- */}
      <section className="grid gap-3 sm:grid-cols-3">
        {ROLES_INFO.map((r) => (
          <Card key={r.rol}>
            <CardBody className="space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-600" />
                <Badge tone="brand">{ROL_LABEL[r.rol]}</Badge>
              </div>
              <p className="text-sm text-ink-soft">{r.permisos}</p>
            </CardBody>
          </Card>
        ))}
      </section>

      {/* ---------- Tabla de staff ---------- */}
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
                {m.user_id}
              </span>
            </td>
            <td className="px-4 py-3 text-muted tabular-nums">{tiempoRelativo(m.creado_en)}</td>
            <td className="px-4 py-3 text-right">
              <div className="flex justify-end">
                <StaffRolSelect
                  userId={m.user_id}
                  rol={m.rol as StaffRol}
                  esYo={m.user_id === staff.userId}
                />
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </main>
  );
}
