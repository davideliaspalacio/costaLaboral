"use server";

import { getRandomValues } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUsuario } from "@/lib/auth";
import { limitar, mensajeLimite } from "@/lib/rate-limit";
import { registrarAuditoria } from "@/lib/audit";
import { registrarEvento } from "@/lib/eventos";
import { log } from "@/lib/log";
import { sumarDiasHabiles } from "@/lib/legal/dias-habiles";
import { generarRadicado } from "@/lib/legal/radicado";
import { formatearFechaBogota, plazoDe, validarSolicitud, type ErroresSolicitud } from "@/lib/legal/solicitudes";

export type EstadoSolicitud =
  | null
  | { ok: false; errores: ErroresSolicitud }
  | { ok: true; radicado: string; venceEn: string; venceTexto: string; clase: "consulta" | "reclamo"; dias: number };

const INTENTOS_RADICADO = 3;

/** Radica una consulta o reclamo de un titular (Ley 1581/2012, arts. 14 y 15). Pública: no exige sesión. */
export async function crearSolicitudTitular(_prev: EstadoSolicitud, formData: FormData): Promise<EstadoSolicitud> {
  const v = validarSolicitud(Object.fromEntries(formData));
  if (!v.ok) return { ok: false, errores: v.errores };
  const datos = v.datos;

  const limite = await limitar("solicitud_titular");
  if (!limite.permitido) return { ok: false, errores: { general: mensajeLimite(limite) } };

  const sesion = await getUsuario().catch(() => null);
  const titularId = sesion?.user.id ?? null;
  const ahora = new Date();
  const plazo = plazoDe(datos.tipo);
  const venceEn = sumarDiasHabiles(ahora, plazo.dias);

  const admin = createAdminClient();
  let fila: { id: string; radicado: string } | null = null;

  for (let intento = 0; intento < INTENTOS_RADICADO && !fila; intento++) {
    const radicado = generarRadicado(ahora, getRandomValues(new Uint8Array(6)));
    const { data, error } = await admin
      .from("solicitudes_titular")
      .insert({
        radicado,
        titular_id: titularId,
        nombre: datos.nombre,
        tipo_documento: datos.tipo_documento,
        numero_documento: datos.numero_documento,
        email: datos.email,
        telefono: datos.telefono,
        tipo: datos.tipo,
        descripcion: datos.descripcion,
        vence_en: venceEn.toISOString(),
      })
      .select("id, radicado")
      .single();

    if (!error) {
      fila = data;
    } else if (error.code !== "23505") {
      // 23505 = radicado repetido: se reintenta con otro. Cualquier otro error corta.
      log.error("solicitud_titular_fallo", { tipo: datos.tipo, err: error.message });
      return { ok: false, errores: { general: "No pudimos radicar tu solicitud. Intenta de nuevo o escríbenos al correo de protección de datos." } };
    }
  }

  if (!fila) {
    log.error("solicitud_titular_radicado_agotado", { tipo: datos.tipo });
    return { ok: false, errores: { general: "No pudimos radicar tu solicitud. Intenta de nuevo en un momento." } };
  }

  const actorTipo = sesion?.tipo === "empresa" ? "empresa" : sesion?.tipo === "admin" ? "admin" : "candidato";

  // Sin documento, correo, teléfono ni descripción en la auditoría ni en los eventos.
  await Promise.all([
    registrarAuditoria({
      actor: titularId ? { id: titularId, tipo: actorTipo } : { id: null, tipo: "sistema" },
      accion: "solicitud_titular.creada",
      entidad: "solicitudes_titular",
      entidadId: fila.id,
      despues: { radicado: fila.radicado, tipo: datos.tipo, estado: "recibida", vence_en: venceEn.toISOString() },
      metadata: { clase: plazo.clase, con_sesion: Boolean(titularId), origen: "formulario_publico" },
    }),
    registrarEvento({
      tipo: "solicitud_titular",
      actor_id: titularId,
      actor_tipo: titularId ? actorTipo : "visitante",
      entidad: "solicitudes_titular",
      entidad_id: fila.id,
      meta: { tipo: datos.tipo, clase: plazo.clase },
    }),
  ]);

  return {
    ok: true,
    radicado: fila.radicado,
    venceEn: venceEn.toISOString(),
    venceTexto: formatearFechaBogota(venceEn),
    clase: plazo.clase,
    dias: plazo.dias,
  };
}
