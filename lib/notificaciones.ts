import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { esElegible, calcularScore } from "@/lib/matching";
import { formatSalario } from "@/lib/utils";
import type { Candidato, Vacante } from "@/lib/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/* ---------- Plantillas WhatsApp aprobadas (sección 6.2) ---------- */
export const templates = {
  bienvenida: (nombre: string, ciudad: string, area: string, urlPerfil: string) =>
    `Bienvenido a CostaLaboral, ${nombre}. Ya estás registrado y empezarás a recibir vacantes en ${ciudad} que encajan con tu perfil de ${area}. Tu perfil: ${urlPerfil}`,
  nuevo_camello_real: (nombre: string, cargo: string, ciudad: string, salario: string, url: string) =>
    `Hola ${nombre}, encontramos un camello para ti en CostaLaboral. Cargo: ${cargo}. Ciudad: ${ciudad}. Salario: ${salario}. Entra a ver los detalles: ${url}`,
  coincidencia_gratis: (nombre: string, area: string, url: string) =>
    `Parcero ${nombre}, hay vacantes en la Costa que encajan con tu perfil en ${area}. Entra a verlas: ${url}`,
  limite_alcanzado: (nombre: string, cantidad: number, url: string) =>
    `${nombre}, ya usaste tus 3 postulaciones gratuitas este trimestre. Este mes van ${cantidad} vacantes en tu área que no pudiste tocar. Activa tu plan por $29.900: ${url}`,
};

/** Registra (y "envía" — manual en Fase 1) la bienvenida al candidato. */
export async function enviarBienvenida(c: Pick<Candidato, "id" | "nombre" | "ciudad" | "area_interes">) {
  const admin = createAdminClient();
  const mensaje = templates.bienvenida(c.nombre, c.ciudad, c.area_interes, `${SITE}/perfil`);
  await admin.from("notificaciones_wsp").insert({
    candidato_id: c.id,
    tipo: "enlace_real",
    mensaje,
  });
}

/**
 * Al publicar una vacante, busca candidatos que hacen match real y genera
 * las notificaciones WhatsApp (registro en tabla; envío manual en Fase 1).
 * Sección 4.2 y 4.3.
 */
export async function dispararMatchingVacante(vacante: Vacante): Promise<number> {
  const admin = createAdminClient();

  // Candidatos activos de la misma ciudad (o cualquier ciudad si es remota) y misma área.
  let query = admin
    .from("candidatos")
    .select("id, nombre, ciudad, area_interes, nivel_educativo, disponibilidad, plan, plan_vence")
    .eq("activo", true)
    .eq("area_interes", vacante.area);
  if (vacante.modalidad !== "remoto") query = query.eq("ciudad", vacante.ciudad);

  const { data: candidatos } = await query;
  if (!candidatos?.length) return 0;

  const url = `${SITE}/v/${vacante.id}`;
  const filas = candidatos
    .filter((c) =>
      esElegible(
        {
          ciudad: c.ciudad,
          area_interes: c.area_interes,
          nivel_educativo: c.nivel_educativo,
          disponibilidad: c.disponibilidad,
        },
        vacante,
      ),
    )
    .map((c) => {
      const esPago =
        c.plan !== "gratis" && c.plan_vence != null && new Date(c.plan_vence).getTime() > Date.now();
      const mensaje = esPago
        ? templates.nuevo_camello_real(
            c.nombre,
            vacante.titulo,
            vacante.ciudad,
            formatSalario(vacante.salario_min, vacante.salario_max),
            url,
          )
        : templates.coincidencia_gratis(c.nombre, vacante.area, url);
      return {
        candidato_id: c.id,
        vacante_id: vacante.id,
        tipo: "enlace_real" as const,
        mensaje,
      };
    });

  if (!filas.length) return 0;
  await admin.from("notificaciones_wsp").insert(filas);
  await admin.from("eventos").insert({
    tipo: "notif_enviada",
    actor_tipo: "sistema",
    entidad: "vacantes",
    entidad_id: vacante.id,
    meta: { total: filas.length },
  });
  return filas.length;
}
