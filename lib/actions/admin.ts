"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaff, puede, type StaffRol } from "@/lib/roles";
import { registrarEvento } from "@/lib/eventos";

export type AdminActionResult = { ok: true } | { error: string };

const ESTADOS_MODERACION = ["aprobada", "pendiente", "rechazada", "reportada"] as const;
type EstadoModeracion = (typeof ESTADOS_MODERACION)[number];
const ROLES: StaffRol[] = ["super_admin", "admin", "moderador"];

/**
 * Verifica que exista sesión de staff con el permiso requerido.
 * Devuelve la sesión o un error tipado.
 */
async function autorizar(permiso: string): Promise<
  | { staff: NonNullable<Awaited<ReturnType<typeof getStaff>>> }
  | { error: string }
> {
  const staff = await getStaff();
  if (!staff) return { error: "No autorizado." };
  if (!puede(staff.rol, permiso)) return { error: "No tienes permiso para esta acción." };
  return { staff };
}

/* ---------------- Verificar empresa ---------------- */

export async function verificarEmpresa(empresaId: string): Promise<AdminActionResult> {
  const auth = await autorizar("verificar");
  if ("error" in auth) return auth;

  const admin = createAdminClient();
  const { data: empresa } = await admin
    .from("empresas")
    .select("id, nombre_negocio, verificada")
    .eq("id", empresaId)
    .maybeSingle();
  if (!empresa) return { error: "Empresa no encontrada." };

  const { error } = await admin.from("empresas").update({ verificada: true }).eq("id", empresaId);
  if (error) return { error: "No se pudo verificar la empresa." };

  await registrarEvento({
    tipo: "empresa_verificada",
    actor_id: auth.staff.userId,
    actor_tipo: "admin",
    entidad: "empresas",
    entidad_id: empresaId,
    meta: { nombre_negocio: empresa.nombre_negocio, por: auth.staff.email },
  });

  revalidatePath("/admin/empresas");
  revalidatePath("/admin");
  return { ok: true };
}

/* ---------------- Moderar vacante ---------------- */

export async function moderarVacante(
  vacanteId: string,
  estado: EstadoModeracion,
  motivo?: string,
): Promise<AdminActionResult> {
  const auth = await autorizar("moderar");
  if ("error" in auth) return auth;
  if (!ESTADOS_MODERACION.includes(estado)) return { error: "Estado de moderación inválido." };

  const admin = createAdminClient();
  const { data: vacante } = await admin
    .from("vacantes")
    .select("id, titulo, activa")
    .eq("id", vacanteId)
    .maybeSingle();
  if (!vacante) return { error: "Vacante no encontrada." };

  const motivoLimpio = motivo?.trim() || null;
  if (estado === "rechazada" && !motivoLimpio)
    return { error: "Indica un motivo para rechazar la vacante." };

  const patch: Record<string, unknown> = {
    estado_moderacion: estado,
    motivo_moderacion: motivoLimpio,
  };
  // Si se rechaza, se despublica también.
  if (estado === "rechazada") patch.activa = false;

  const { error } = await admin.from("vacantes").update(patch).eq("id", vacanteId);
  if (error) return { error: "No se pudo moderar la vacante." };

  await registrarEvento({
    tipo: "vacante_moderada",
    actor_id: auth.staff.userId,
    actor_tipo: "admin",
    entidad: "vacantes",
    entidad_id: vacanteId,
    meta: { titulo: vacante.titulo, estado, motivo: motivoLimpio, por: auth.staff.email },
  });

  revalidatePath("/admin/vacantes");
  revalidatePath("/admin");
  revalidatePath(`/v/${vacanteId}`);
  return { ok: true };
}

/* ---------------- Cambiar rol de staff (solo super_admin) ---------------- */

export async function cambiarRolStaff(userId: string, rol: StaffRol): Promise<AdminActionResult> {
  const auth = await autorizar("gestionar_staff");
  if ("error" in auth) return auth;
  if (!ROLES.includes(rol)) return { error: "Rol inválido." };
  if (userId === auth.staff.userId)
    return { error: "No puedes cambiar tu propio rol." };

  const admin = createAdminClient();
  const { data: fila } = await admin
    .from("staff")
    .select("user_id, nombre")
    .eq("user_id", userId)
    .maybeSingle();
  if (!fila) return { error: "Ese usuario no está en el equipo." };

  const { error } = await admin.from("staff").update({ rol }).eq("user_id", userId);
  if (error) return { error: "No se pudo actualizar el rol." };

  await registrarEvento({
    tipo: "vacante_moderada", // no hay tipo específico; se reutiliza el genérico admin
    actor_id: auth.staff.userId,
    actor_tipo: "admin",
    entidad: "staff",
    entidad_id: userId,
    meta: { accion: "cambio_rol", rol, nombre: fila.nombre, por: auth.staff.email },
  });

  revalidatePath("/admin/staff");
  return { ok: true };
}

/* ---------------- Activar/desactivar candidato ---------------- */

export async function alternarCandidatoActivo(
  candidatoId: string,
  activo: boolean,
): Promise<AdminActionResult> {
  const auth = await autorizar("gestionar_usuarios");
  if ("error" in auth) return auth;

  const admin = createAdminClient();
  const { data: candidato } = await admin
    .from("candidatos")
    .select("id, nombre")
    .eq("id", candidatoId)
    .maybeSingle();
  if (!candidato) return { error: "Candidato no encontrado." };

  const { error } = await admin.from("candidatos").update({ activo }).eq("id", candidatoId);
  if (error) return { error: "No se pudo actualizar el candidato." };

  await registrarEvento({
    tipo: "vacante_moderada",
    actor_id: auth.staff.userId,
    actor_tipo: "admin",
    entidad: "candidatos",
    entidad_id: candidatoId,
    meta: { accion: activo ? "activar_candidato" : "desactivar_candidato", nombre: candidato.nombre, por: auth.staff.email },
  });

  revalidatePath("/admin/candidatos");
  revalidatePath("/admin");
  return { ok: true };
}
