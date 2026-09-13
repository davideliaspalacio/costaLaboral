// Piezas de roles seguras para cliente (sin server-only). Reutilizadas por
// componentes cliente y re-exportadas por lib/roles.ts (server).

export type StaffRol = "super_admin" | "admin" | "moderador";

export const PERMISOS_TODOS = [
  "ver",
  "moderar",
  "verificar",
  "gestionar_usuarios",
  "gestionar_staff",
  "reembolsar",
  "ver_auditoria",
  "ver_pagos",
  "ver_ia",
  "atender_solicitudes",
  "ver_kpis",
] as const;
export type Permiso = (typeof PERMISOS_TODOS)[number];

const PERMISOS_ADMIN: Permiso[] = [
  "ver",
  "moderar",
  "verificar",
  "gestionar_usuarios",
  "ver_auditoria",
  "ver_pagos",
  "ver_ia",
  "atender_solicitudes",
  "ver_kpis",
];

export const PERMISOS: Record<StaffRol, readonly Permiso[]> = {
  super_admin: PERMISOS_TODOS,
  admin: PERMISOS_ADMIN,
  moderador: ["ver", "moderar"],
};

export function puede(rol: StaffRol | null | undefined, permiso: Permiso): boolean {
  if (!rol || !(rol in PERMISOS)) return false;
  return PERMISOS[rol].includes(permiso);
}

export const ROL_LABEL: Record<StaffRol, string> = {
  super_admin: "Super admin",
  admin: "Administrador",
  moderador: "Moderador",
};

export const ROL_DESCRIPCION: Record<StaffRol, string> = {
  super_admin: "Todo, incluidos el equipo, los roles y los reembolsos.",
  admin: "Moderar, verificar, usuarios, auditoría, pagos, IA, KPIs y solicitudes de titulares.",
  moderador: "Ver el panel y moderar vacantes y reportes.",
};
