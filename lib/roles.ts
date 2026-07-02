import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario, esAdmin } from "@/lib/auth";
import { type StaffRol } from "@/lib/roles-shared";

export { PERMISOS, puede, ROL_LABEL, type StaffRol } from "@/lib/roles-shared";

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
