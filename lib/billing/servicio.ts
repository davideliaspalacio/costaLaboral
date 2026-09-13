import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria, ACTOR_SISTEMA, type ActorAuditoria } from "@/lib/audit";
import { registrarEvento } from "@/lib/eventos";
import { log } from "@/lib/log";
import { PRODUCTOS, esProductoCodigo, productoDePlan, type Audiencia } from "@/lib/billing/catalogo";
import { getSuscripcionVigente, sincronizarPlanCache, type Suscripcion } from "@/lib/billing/suscripciones";
import {
  accionCompraSuscripcion,
  calcularPeriodo,
  decidirVencimiento,
  estadoPagoDeEvento,
  extenderDestacada,
  generarReferencia,
  inicioMesBogota,
  montoCoincide,
  puedeTransicionarPago,
  type EstadoPago,
  type EstadoSuscripcion,
} from "@/lib/billing/estados";
import type { EventoPasarela } from "@/lib/billing/pasarela";

/* ============================================================
   Servicio de billing: customer → subscription → payment → entitlement.
   - Toda transición de pago es condicional (`where estado = <desde>`),
     así un mismo resultado aplicado dos veces no duplica beneficios
     aunque llegue con distinto id de evento.
   - La tabla `suscripciones` es la fuente de verdad del plan;
     tras cada cambio se llama sincronizarPlanCache.
   - MVP sin prorrateo: cambiar de plan cancela el anterior y el nuevo
     empieza desde hoy.
   - Sandbox sin cobro recurrente: al vencer, la suscripción pasa a
     past_due y se crea un pago de renovación pendiente que el usuario
     paga desde /pagos.
   ============================================================ */

export type Pago = {
  id: string;
  referencia: string;
  suscripcion_id: string | null;
  propietario_id: string;
  propietario_tipo: Audiencia;
  concepto: "suscripcion" | "renovacion" | "vacante_destacada" | "addon";
  producto: string;
  proveedor: string;
  external_id: string | null;
  monto: number;
  moneda: string;
  estado: EstadoPago;
  metadata: Record<string, unknown>;
  aprobado_en: string | null;
  creado_en: string;
  actualizado_en: string;
};

export const PROVEEDOR_INCLUIDA = "incluida";

type Resultado = { ok: true } | { error: string };

function actorPropietario(pago: Pick<Pago, "propietario_id" | "propietario_tipo">): ActorAuditoria {
  return { id: pago.propietario_id, tipo: pago.propietario_tipo };
}

export async function getPagoPorReferencia(referencia: string): Promise<Pago | null> {
  const { data } = await createAdminClient().from("pagos").select("*").eq("referencia", referencia).maybeSingle();
  return (data as Pago) ?? null;
}

/**
 * Transición condicional del pago. Devuelve la fila actualizada o null si
 * otro proceso ya la movió (o la transición no aplica).
 */
async function transicionarPago(
  pago: Pago,
  hacia: EstadoPago,
  cambios: Partial<Pago> = {},
): Promise<Pago | null> {
  if (!puedeTransicionarPago(pago.estado, hacia)) return null;
  const ahora = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("pagos")
    .update({
      ...cambios,
      estado: hacia,
      actualizado_en: ahora,
      ...(hacia === "aprobado" ? { aprobado_en: ahora } : {}),
    })
    .eq("id", pago.id)
    .eq("estado", pago.estado)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as Pago) ?? null;
}

async function actualizarMetadataPago(pago: Pago, extra: Record<string, unknown>): Promise<void> {
  const { error } = await createAdminClient()
    .from("pagos")
    .update({ metadata: { ...pago.metadata, ...extra }, actualizado_en: new Date().toISOString() })
    .eq("id", pago.id);
  if (error) log.error("pago_metadata_fallo", { pagoId: pago.id, err: error });
}

/* ---------------- Destacadas ---------------- */

/** Destacadas incluidas (Empresa Pro) usadas en el mes calendario actual (hora Colombia). */
export async function contarDestacadasIncluidasUsadasMes(empresaId: string): Promise<number> {
  const { count } = await createAdminClient()
    .from("pagos")
    .select("id", { count: "exact", head: true })
    .eq("propietario_id", empresaId)
    .eq("proveedor", PROVEEDOR_INCLUIDA)
    .eq("concepto", "vacante_destacada")
    .eq("estado", "aprobado")
    .gte("creado_en", inicioMesBogota().toISOString());
  return count ?? 0;
}

/**
 * Aplica la exposición de un pago de destacada ya aprobado. Vuelve a
 * verificar que la vacante sea de la empresa y esté pública; si no, el
 * pago queda aprobado con metadata.requiere_reembolso y alerta en logs.
 */
export async function aplicarDestacadaDePago(pago: Pago, actor: ActorAuditoria): Promise<Resultado> {
  const admin = createAdminClient();
  const vacanteId = typeof pago.metadata.vacanteId === "string" ? pago.metadata.vacanteId : null;
  const producto = esProductoCodigo(pago.producto) ? PRODUCTOS[pago.producto] : null;
  const duracionDias = producto?.duracionDias;
  if (!vacanteId || !duracionDias) {
    log.error("destacada_pago_invalido", { pagoId: pago.id, producto: pago.producto });
    await actualizarMetadataPago(pago, { requiere_reembolso: true, motivo_reembolso: "pago_sin_vacante" });
    return { error: "El pago no tiene una vacante válida asociada." };
  }

  const { data: vacante } = await admin
    .from("vacantes")
    .select("id, empresa_id, es_publica, destacada_hasta, titulo")
    .eq("id", vacanteId)
    .maybeSingle();

  if (!vacante || vacante.empresa_id !== pago.propietario_id || !vacante.es_publica) {
    log.error("alerta_destacada_no_elegible_requiere_reembolso", {
      pagoId: pago.id,
      vacanteId,
      existe: Boolean(vacante),
      esPublica: vacante?.es_publica ?? null,
    });
    await actualizarMetadataPago(pago, { requiere_reembolso: true, motivo_reembolso: "vacante_no_elegible" });
    return { error: "La vacante ya no está publicada; el pago quedó marcado para reembolso." };
  }

  const nuevoHasta = extenderDestacada(new Date(), vacante.destacada_hasta, duracionDias).toISOString();
  const { error } = await admin
    .from("vacantes")
    .update({ destacada_hasta: nuevoHasta, actualizada_en: new Date().toISOString() })
    .eq("id", vacante.id);
  if (error) throw error;

  await registrarAuditoria({
    actor,
    accion: "vacante.destacada",
    entidad: "vacantes",
    entidadId: vacante.id,
    antes: { destacada_hasta: vacante.destacada_hasta },
    despues: { destacada_hasta: nuevoHasta },
    metadata: { pagoId: pago.id, producto: pago.producto, duracionDias, incluida: pago.proveedor === PROVEEDOR_INCLUIDA },
  });
  await registrarEvento({
    tipo: "vacante_destacada",
    actor_id: pago.propietario_id,
    actor_tipo: "empresa",
    entidad: "vacantes",
    entidad_id: vacante.id,
    meta: { producto: pago.producto, duracionDias, monto: pago.monto, incluida: pago.proveedor === PROVEEDOR_INCLUIDA },
  });
  return { ok: true };
}

/* ---------------- Suscripciones ---------------- */

async function aplicarSuscripcionDePago(pago: Pago): Promise<void> {
  const admin = createAdminClient();
  const producto = esProductoCodigo(pago.producto) ? PRODUCTOS[pago.producto] : null;
  if (!producto?.plan || !producto.periodoDias) throw new Error(`Producto de suscripción inválido: ${pago.producto}`);
  const actor = actorPropietario(pago);
  const ahora = new Date();
  const vigente = await getSuscripcionVigente(pago.propietario_id);
  const accion = accionCompraSuscripcion(vigente, producto.plan);
  let suscripcionId: string;

  if (accion === "renovar" && vigente) {
    const { fin } = calcularPeriodo(ahora, producto.periodoDias, vigente.periodo_fin);
    const { error } = await admin
      .from("suscripciones")
      .update({
        estado: "active",
        periodo_fin: fin.toISOString(),
        cancelar_al_final: false,
        cancelada_en: null,
        actualizado_en: ahora.toISOString(),
      })
      .eq("id", vigente.id);
    if (error) throw error;
    suscripcionId = vigente.id;
    await registrarAuditoria({
      actor,
      accion: "suscripcion.renovada",
      entidad: "suscripciones",
      entidadId: vigente.id,
      antes: { estado: vigente.estado, periodo_fin: vigente.periodo_fin, cancelar_al_final: vigente.cancelar_al_final },
      despues: { estado: "active", periodo_fin: fin.toISOString(), cancelar_al_final: false },
      metadata: { pagoId: pago.id },
    });
  } else {
    if (accion === "cambiar" && vigente) {
      const { error } = await admin
        .from("suscripciones")
        .update({ estado: "canceled", cancelada_en: ahora.toISOString(), actualizado_en: ahora.toISOString() })
        .eq("id", vigente.id);
      if (error) throw error;
      await registrarAuditoria({
        actor,
        accion: "suscripcion.cancelada",
        entidad: "suscripciones",
        entidadId: vigente.id,
        antes: { estado: vigente.estado, plan: vigente.plan },
        despues: { estado: "canceled" },
        metadata: { motivo: "cambio_de_plan", planNuevo: producto.plan, pagoId: pago.id, prorrateo: false },
      });
    }
    const { inicio, fin } = calcularPeriodo(ahora, producto.periodoDias);
    const { data, error } = await admin
      .from("suscripciones")
      .insert({
        propietario_id: pago.propietario_id,
        propietario_tipo: pago.propietario_tipo,
        plan: producto.plan,
        proveedor: pago.proveedor,
        estado: "active",
        periodo_inicio: inicio.toISOString(),
        periodo_fin: fin.toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    suscripcionId = data.id as string;
    await registrarAuditoria({
      actor,
      accion: "suscripcion.activada",
      entidad: "suscripciones",
      entidadId: suscripcionId,
      despues: { plan: producto.plan, estado: "active", periodo_inicio: inicio.toISOString(), periodo_fin: fin.toISOString() },
      metadata: { pagoId: pago.id, reemplaza: vigente?.id ?? null },
    });
  }

  if (pago.suscripcion_id !== suscripcionId) {
    await admin.from("pagos").update({ suscripcion_id: suscripcionId }).eq("id", pago.id);
  }
  await sincronizarPlanCache(pago.propietario_id, pago.propietario_tipo);
  await registrarEvento({
    tipo: "plan_activado",
    actor_id: pago.propietario_id,
    actor_tipo: pago.propietario_tipo,
    entidad: "suscripciones",
    entidad_id: suscripcionId,
    meta: { plan: producto.plan, accion, producto: pago.producto },
  });
}

/* ---------------- Procesamiento de eventos de la pasarela ---------------- */

export type ResultadoEvento =
  | { ok: true; resultado: string }
  | { ok: false; resultado: string; error: string };

/**
 * Aplica un evento normalizado de la pasarela. Idempotente: si el pago ya
 * está en el estado destino (o la transición no aplica) no hace nada.
 * Errores inesperados (BD) se propagan para que el webhook responda 500 y
 * el proveedor reintente.
 */
export async function procesarEventoPasarela(proveedor: string, evento: EventoPasarela): Promise<ResultadoEvento> {
  const pago = await getPagoPorReferencia(evento.referencia);
  if (!pago) {
    log.error("webhook_pago_no_encontrado", { proveedor, referencia: evento.referencia, eventoId: evento.id });
    return { ok: false, resultado: "pago_no_encontrado", error: "No existe un pago con esa referencia." };
  }
  if (pago.proveedor !== proveedor) {
    log.error("webhook_proveedor_distinto", { proveedor, pagoProveedor: pago.proveedor, pagoId: pago.id });
    return { ok: false, resultado: "proveedor_distinto", error: "El pago pertenece a otro proveedor." };
  }

  const destino = estadoPagoDeEvento(evento.tipo);
  if (pago.estado === destino) return { ok: true, resultado: "sin_cambios" };
  if (!puedeTransicionarPago(pago.estado, destino)) {
    log.warn("webhook_transicion_invalida", { pagoId: pago.id, desde: pago.estado, hacia: destino });
    return { ok: true, resultado: `ignorado_${pago.estado}_a_${destino}` };
  }

  if (destino === "aprobado" && !montoCoincide(pago, evento)) {
    log.error("alerta_webhook_monto_no_coincide", {
      pagoId: pago.id,
      esperado: pago.monto,
      recibido: evento.montoCop,
      monedaEsperada: pago.moneda,
      monedaRecibida: evento.moneda,
    });
    return {
      ok: false,
      resultado: "monto_no_coincide",
      error: `Monto o moneda no coinciden: esperado ${pago.monto} ${pago.moneda}, recibido ${evento.montoCop} ${evento.moneda}.`,
    };
  }

  if (destino === "reembolsado") {
    const r = await aplicarReembolso(pago, ACTOR_SISTEMA, { eventoId: evento.id, proveedor });
    return "error" in r ? { ok: false, resultado: "reembolso_fallido", error: r.error } : { ok: true, resultado: "reembolsado" };
  }

  const actualizado = await transicionarPago(pago, destino, {
    external_id: pago.external_id ?? evento.externalId,
  });
  if (!actualizado) return { ok: true, resultado: "sin_cambios" };

  if (destino === "fallido" || destino === "anulado") {
    await registrarAuditoria({
      actor: ACTOR_SISTEMA,
      accion: destino === "fallido" ? "pago.fallido" : "pago.anulado",
      entidad: "pagos",
      entidadId: pago.id,
      antes: { estado: pago.estado },
      despues: { estado: destino },
      metadata: { proveedor, eventoId: evento.id, externalId: evento.externalId },
    });
    return { ok: true, resultado: destino };
  }

  // Aprobado
  await registrarAuditoria({
    actor: ACTOR_SISTEMA,
    accion: "pago.aprobado",
    entidad: "pagos",
    entidadId: pago.id,
    antes: { estado: pago.estado },
    despues: { estado: "aprobado" },
    metadata: { proveedor, eventoId: evento.id, externalId: evento.externalId, monto: pago.monto, producto: pago.producto },
  });
  await registrarEvento({
    tipo: "pago_aprobado",
    actor_id: pago.propietario_id,
    actor_tipo: pago.propietario_tipo,
    entidad: "pagos",
    entidad_id: pago.id,
    meta: { producto: pago.producto, concepto: pago.concepto, monto: pago.monto, proveedor },
  });

  try {
    if (actualizado.concepto === "vacante_destacada") {
      const r = await aplicarDestacadaDePago(actualizado, actorPropietario(actualizado));
      if ("error" in r) return { ok: true, resultado: "aprobado_requiere_reembolso" };
    } else if (actualizado.concepto === "suscripcion" || actualizado.concepto === "renovacion") {
      await aplicarSuscripcionDePago(actualizado);
    }
  } catch (err) {
    // El pago ya quedó aprobado: se marca para revisión manual en lugar de reintentar a ciegas.
    log.error("alerta_beneficios_no_aplicados", { pagoId: pago.id, err });
    await actualizarMetadataPago(actualizado, { beneficios_error: err instanceof Error ? err.message : String(err) });
    return { ok: false, resultado: "aprobado_sin_beneficios", error: "Pago aprobado pero no se pudieron aplicar los beneficios." };
  }
  return { ok: true, resultado: "aprobado" };
}

/* ---------------- Reembolsos y cancelaciones ---------------- */

async function aplicarReembolso(
  pago: Pago,
  actor: ActorAuditoria,
  metadata: Record<string, unknown>,
): Promise<Resultado> {
  const admin = createAdminClient();
  const actualizado = await transicionarPago(pago, "reembolsado", {
    metadata: { ...pago.metadata, reembolsado_en: new Date().toISOString() },
  });
  if (!actualizado) {
    return pago.estado === "reembolsado" ? { ok: true } : { error: "Solo se pueden reembolsar pagos aprobados." };
  }
  await registrarAuditoria({
    actor,
    accion: "pago.reembolsado",
    entidad: "pagos",
    entidadId: pago.id,
    antes: { estado: pago.estado },
    despues: { estado: "reembolsado" },
    metadata: { ...metadata, monto: pago.monto, producto: pago.producto },
  });

  if ((pago.concepto === "suscripcion" || pago.concepto === "renovacion") && pago.suscripcion_id) {
    const { data: sus } = await admin.from("suscripciones").select("*").eq("id", pago.suscripcion_id).maybeSingle();
    if (sus && (sus.estado === "active" || sus.estado === "past_due")) {
      await cancelarInmediata(sus as Suscripcion, actor, { motivo: "reembolso", pagoId: pago.id });
    }
  } else if (pago.concepto === "vacante_destacada" && typeof pago.metadata.vacanteId === "string") {
    const ahora = new Date().toISOString();
    const { data: vac } = await admin
      .from("vacantes")
      .select("id, destacada_hasta")
      .eq("id", pago.metadata.vacanteId)
      .maybeSingle();
    if (vac && vac.destacada_hasta && new Date(vac.destacada_hasta).getTime() > Date.now()) {
      await admin.from("vacantes").update({ destacada_hasta: ahora, actualizada_en: ahora }).eq("id", vac.id);
      await registrarAuditoria({
        actor,
        accion: "vacante.destacada",
        entidad: "vacantes",
        entidadId: vac.id,
        antes: { destacada_hasta: vac.destacada_hasta },
        despues: { destacada_hasta: ahora },
        metadata: { motivo: "reembolso", pagoId: pago.id },
      });
    }
  }
  return { ok: true };
}

async function cancelarInmediata(
  sus: Suscripcion,
  actor: ActorAuditoria,
  metadata: Record<string, unknown>,
): Promise<void> {
  const ahora = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("suscripciones")
    .update({ estado: "canceled", cancelada_en: ahora, actualizado_en: ahora })
    .eq("id", sus.id)
    .in("estado", ["active", "past_due"]);
  if (error) throw error;
  await anularRenovacionesPendientes(sus.id, actor);
  await sincronizarPlanCache(sus.propietario_id, sus.propietario_tipo);
  await registrarAuditoria({
    actor,
    accion: "suscripcion.cancelada",
    entidad: "suscripciones",
    entidadId: sus.id,
    antes: { estado: sus.estado },
    despues: { estado: "canceled" },
    metadata: { ...metadata, inmediata: true },
  });
}

/**
 * Reembolso manual (admin). En sandbox no hay dinero que devolver; con
 * Wompi el reembolso se ejecuta en su dashboard y aquí se refleja.
 */
export async function reembolsarPago(pagoId: string, actor: ActorAuditoria): Promise<{ ok: true } | { error: string }> {
  try {
    const { data } = await createAdminClient().from("pagos").select("*").eq("id", pagoId).maybeSingle();
    if (!data) return { error: "Pago no encontrado." };
    return await aplicarReembolso(data as Pago, actor, { origen: "manual" });
  } catch (err) {
    log.error("reembolso_fallo", { pagoId, err });
    return { error: "No se pudo reembolsar el pago." };
  }
}

/** Cancelación administrativa: inmediata (pierde beneficios ya) o al final del periodo. */
export async function cancelarSuscripcionAdmin(
  suscripcionId: string,
  actor: ActorAuditoria,
  inmediata: boolean,
): Promise<{ ok: true } | { error: string }> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("suscripciones").select("*").eq("id", suscripcionId).maybeSingle();
    const sus = data as Suscripcion | null;
    if (!sus) return { error: "Suscripción no encontrada." };
    if (sus.estado !== "active" && sus.estado !== "past_due") return { error: "La suscripción ya no está vigente." };

    if (inmediata) {
      await cancelarInmediata(sus, actor, { origen: actor.tipo });
      return { ok: true };
    }
    return await marcarCancelarAlFinal(sus, actor);
  } catch (err) {
    log.error("cancelar_suscripcion_admin_fallo", { suscripcionId, err });
    return { error: "No se pudo cancelar la suscripción." };
  }
}

/** Deja la suscripción sin renovar: conserva beneficios hasta periodo_fin. */
export async function marcarCancelarAlFinal(sus: Suscripcion, actor: ActorAuditoria): Promise<{ ok: true } | { error: string }> {
  if (sus.cancelar_al_final) return { ok: true };
  const ahora = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("suscripciones")
    .update({ cancelar_al_final: true, cancelada_en: ahora, actualizado_en: ahora })
    .eq("id", sus.id);
  if (error) throw error;
  // Si ya debía la renovación, no tiene sentido dejar el cobro pendiente.
  await anularRenovacionesPendientes(sus.id, actor);
  await registrarAuditoria({
    actor,
    accion: "suscripcion.cancelada",
    entidad: "suscripciones",
    entidadId: sus.id,
    antes: { cancelar_al_final: false },
    despues: { cancelar_al_final: true },
    metadata: { inmediata: false, beneficiosHasta: sus.periodo_fin },
  });
  return { ok: true };
}

async function anularRenovacionesPendientes(suscripcionId: string, actor: ActorAuditoria): Promise<void> {
  const ahora = new Date().toISOString();
  const { data } = await createAdminClient()
    .from("pagos")
    .update({ estado: "anulado", actualizado_en: ahora })
    .eq("suscripcion_id", suscripcionId)
    .eq("concepto", "renovacion")
    .eq("estado", "pendiente")
    .select("id");
  for (const p of data ?? []) {
    await registrarAuditoria({
      actor,
      accion: "pago.anulado",
      entidad: "pagos",
      entidadId: p.id as string,
      antes: { estado: "pendiente" },
      despues: { estado: "anulado" },
      metadata: { motivo: "suscripcion_no_se_renueva" },
    });
  }
}

/* ---------------- Tarea programada ---------------- */

/**
 * - active vencida + cancelar_al_final → expired
 * - active vencida → past_due + pago de renovación pendiente (el sandbox no guarda medio de pago)
 * - past_due fuera de la gracia (o con cancelar_al_final) → expired
 * `renovadas` = pagos de renovación creados.
 */
export async function procesarVencimientos(): Promise<{ past_due: number; expiradas: number; renovadas: number }> {
  const admin = createAdminClient();
  const ahora = new Date();
  const conteo = { past_due: 0, expiradas: 0, renovadas: 0 };

  const { data, error } = await admin
    .from("suscripciones")
    .select("*")
    .in("estado", ["active", "past_due"])
    .lt("periodo_fin", ahora.toISOString())
    .limit(1000);
  if (error) throw error;

  for (const sus of (data ?? []) as Suscripcion[]) {
    try {
      const decision = decidirVencimiento(sus, ahora);
      if (decision === "nada") continue;

      const producto = productoDePlan(sus.plan as never, sus.propietario_tipo);
      const destino: EstadoSuscripcion = decision === "past_due" && producto ? "past_due" : "expired";

      const { data: fila, error: errUpd } = await admin
        .from("suscripciones")
        .update({ estado: destino, actualizado_en: ahora.toISOString() })
        .eq("id", sus.id)
        .eq("estado", sus.estado)
        .select("id")
        .maybeSingle();
      if (errUpd) throw errUpd;
      if (!fila) continue; // otro proceso ya la movió

      if (destino === "expired") {
        conteo.expiradas++;
        await anularRenovacionesPendientes(sus.id, ACTOR_SISTEMA);
        await registrarAuditoria({
          actor: ACTOR_SISTEMA,
          accion: "suscripcion.vencida",
          entidad: "suscripciones",
          entidadId: sus.id,
          antes: { estado: sus.estado },
          despues: { estado: "expired" },
          metadata: { periodo_fin: sus.periodo_fin, cancelar_al_final: sus.cancelar_al_final },
        });
      } else if (producto) {
        conteo.past_due++;
        const referencia = generarReferencia(ahora);
        const { error: errPago } = await admin.from("pagos").insert({
          referencia,
          suscripcion_id: sus.id,
          propietario_id: sus.propietario_id,
          propietario_tipo: sus.propietario_tipo,
          concepto: "renovacion",
          producto: producto.codigo,
          proveedor: sus.proveedor === "migracion" || sus.proveedor === PROVEEDOR_INCLUIDA ? proveedorRenovacion() : sus.proveedor,
          monto: producto.precioCop,
          moneda: "COP",
          metadata: { plan: producto.plan, periodoDias: producto.periodoDias, suscripcionId: sus.id },
        });
        if (errPago) log.error("renovacion_pago_fallo", { suscripcionId: sus.id, err: errPago });
        else conteo.renovadas++;
        await registrarAuditoria({
          actor: ACTOR_SISTEMA,
          accion: "suscripcion.past_due",
          entidad: "suscripciones",
          entidadId: sus.id,
          antes: { estado: sus.estado },
          despues: { estado: "past_due" },
          metadata: { periodo_fin: sus.periodo_fin, referenciaRenovacion: errPago ? null : referencia },
        });
      }
      await sincronizarPlanCache(sus.propietario_id, sus.propietario_tipo);
    } catch (err) {
      log.error("vencimiento_fallo", { suscripcionId: sus.id, err });
    }
  }
  return conteo;
}

function proveedorRenovacion(): string {
  return process.env.PAGOS_PROVEEDOR?.trim() || "sandbox";
}
