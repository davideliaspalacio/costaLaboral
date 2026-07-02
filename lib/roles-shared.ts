// Piezas de roles seguras para cliente (sin server-only). Reutilizadas por
// componentes cliente y re-exportadas por lib/roles.ts (server).

export type StaffRol = "super_admin" | "admin" | "moderador";

export const PERMISOS: Record<StaffRol, string[]> = {
  super_admin: ["ver", "moderar", "verificar", "gestionar_usuarios", "gestionar_staff", "gestionar_planes"],
  admin: ["ver", "moderar", "verificar", "gestionar_usuarios", "gestionar_planes"],
  moderador: ["ver", "moderar"],
};

export function puede(rol: StaffRol, permiso: string): boolean {
  return PERMISOS[rol].includes(permiso);
}

export const ROL_LABEL: Record<StaffRol, string> = {
  super_admin: "Super admin",
  admin: "Administrador",
  moderador: "Moderador",
};
