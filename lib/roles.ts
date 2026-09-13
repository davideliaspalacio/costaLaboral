import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario, esAdmin } from "@/lib/auth";
import { puede, type Permiso, type StaffRol } from "@/lib/roles-shared";
import type { ActorAuditoria } from "@/lib/audit";

export {
  PERMISOS,
  PERMISOS_TODOS,
  puede,
  ROL_LABEL,
  ROL_DESCRIPCION,
  type Permiso,
  type StaffRol,
} from "@/lib/roles-shared";

export type StaffSesion = { userId: string; email: string; rol: StaffRol; nombre: string };

/** Sesión de staff (admin) o null. Los correos en ADMIN_EMAILS son super_admin bootstrap. */
export async function getStaff(): Promise<StaffSesion | null> {
  const sesion = await getUsuario();
  if (!sesion) return null;
  if (esAdmin(sesion.email)) {
    return { userId: sesion.user.id, email: sesion.email, rol: "super_admin", nombre: "Super admin" };
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff")
    .select("rol, nombre")
    .eq("user_id", sesion.user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    userId: sesion.user.id,
    email: sesion.email,
    rol: data.rol as StaffRol,
    nombre: (data.nombre as string) ?? sesion.email,
  };
}

/** Staff con el permiso, o null. */
export async function getStaffConPermiso(permiso: Permiso): Promise<StaffSesion | null> {
  const staff = await getStaff();
  return staff && puede(staff.rol, permiso) ? staff : null;
}

/** Para páginas: sin el permiso, vuelve al resumen del panel (el layout ya exige sesión de staff). */
export async function exigirPermiso(permiso: Permiso): Promise<StaffSesion> {
  const staff = await getStaffConPermiso(permiso);
  if (!staff) redirect("/admin");
  return staff;
}

/** Actor de auditoría para acciones de staff. */
export function actorDeStaff(staff: StaffSesion): ActorAuditoria {
  return { id: staff.userId, tipo: "admin", email: staff.email };
}
