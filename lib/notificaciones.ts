import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluarMatch, esRecomendable, perfilDe } from "@/lib/matching";
import { registrarEvento } from "@/lib/eventos";
import { log } from "@/lib/log";
import { formatSalario } from "@/lib/utils";
import type { Candidato, Vacante } from "@/lib/types";

/* ============================================================
   Notificaciones WhatsApp — INTERINO.
   Hoy solo se registran en `notificaciones_wsp` y el envío es
   manual. El diseño definitivo (proveedor, plantillas aprobadas por
   Meta, ventanas de envío, frecuencia, bajas) está en
   docs/PLAN-WHATSAPP.md (sección 9 de la spec). Reglas vigentes:
     - Solo candidatos con wsp_opt_in = true (autorización separada).
     - Una sola plantilla de vacante: todo es gratis, no hay límites.
   ============================================================ */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const templates = {
  bienvenida: (nombre: string, ciudad: string, urlRecomendadas: string, urlCuenta: string) =>
    `Hola ${nombre}, bienvenido a CostaLaboral. Te avisaremos por aquí de vacantes en ${ciudad} que encajan con tu perfil. Tus recomendadas: ${urlRecomendadas}. Si no quieres recibir mensajes, desactívalo en ${urlCuenta}`,
  vacante: (nombre: string, cargo: string, ciudad: string, salario: string, url: string) =>
    `Hola ${nombre}, hay una vacante que encaja con tu perfil en CostaLaboral. Cargo: ${cargo}. Ciudad: ${ciudad}. Salario: ${salario}. Mira los detalles y postúlate gratis: ${url}`,
};

/** Registra la bienvenida. Llamar SOLO si el candidato aceptó recibir WhatsApp. */
export async function enviarBienvenida(c: Pick<Candidato, "id" | "nombre" | "ciudad">): Promise<void> {
  const admin = createAdminClient();
  const mensaje = templates.bienvenida(c.nombre, c.ciudad, `${SITE}/mis-vacantes`, `${SITE}/cuenta`);
  const { error } = await admin.from("notificaciones_wsp").insert({ candidato_id: c.id, tipo: "enlace_real", mensaje });
  if (error) log.warn("notif_bienvenida_fallo", { candidatoId: c.id, err: error });
}

/**
 * Al publicar una vacante: candidatos activos con opt-in de WhatsApp, de la
 * misma área (y misma ciudad salvo remoto) con score recomendable.
 * Registra las notificaciones (envío manual por ahora). Devuelve cuántas.
 */
export async function dispararMatchingVacante(vacante: Vacante): Promise<number> {
  const admin = createAdminClient();

  let query = admin
    .from("candidatos")
    .select("id, nombre, ciudad, area_interes, nivel_educativo, disponibilidad")
    .eq("activo", true)
    .eq("wsp_opt_in", true)
    .eq("area_interes", vacante.area);
  if (vacante.modalidad !== "remoto") query = query.eq("ciudad", vacante.ciudad);

  const { data: candidatos, error } = await query;
  if (error) {
    log.error("matching_vacante_fallo", { vacanteId: vacante.id, err: error });
    return 0;
  }
  if (!candidatos?.length) return 0;

  const url = `${SITE}/v/${vacante.id}?src=whatsapp`;
  const salario = formatSalario(vacante.salario_min, vacante.salario_max);
  const filas = candidatos
    .filter((c) => esRecomendable(evaluarMatch(perfilDe(c), vacante)))
    .map((c) => ({
      candidato_id: c.id as string,
      vacante_id: vacante.id,
      tipo: "enlace_real" as const,
      mensaje: templates.vacante(c.nombre, vacante.titulo, vacante.ciudad, salario, url),
    }));

  if (!filas.length) return 0;
  const { error: insErr } = await admin.from("notificaciones_wsp").insert(filas);
  if (insErr) {
    log.error("notif_vacante_fallo", { vacanteId: vacante.id, err: insErr });
    return 0;
  }
  await registrarEvento({
    tipo: "notif_enviada",
    actor_tipo: "sistema",
    entidad: "vacantes",
    entidad_id: vacante.id,
    meta: { total: filas.length },
  });
  return filas.length;
}
