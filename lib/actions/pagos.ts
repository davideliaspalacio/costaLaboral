"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria, type ActorAuditoria } from "@/lib/audit";
import { registrarEvento } from "@/lib/eventos";
import { limitar, mensajeLimite } from "@/lib/rate-limit";
import { log } from "@/lib/log";
import { PRODUCTOS, PRODUCTOS_DESTACADA, esProductoCodigo, type ProductoCodigo } from "@/lib/billing/catalogo";
import { getBeneficiosEmpresa, getSuscripcionVigente } from "@/lib/billing/suscripciones";
import { generarReferencia, puedeRecomprarMismoPlan, type TipoEventoPasarela } from "@/lib/billing/estados";
import { getPasarela, getPasarelaSegura, type EventoPasarela } from "@/lib/billing/pasarela";
import {
  PROVEEDOR_INCLUIDA,
  aplicarDestacadaDePago,
  contarDestacadasIncluidasUsadasMes,
  getPagoPorReferencia,
  marcarCancelarAlFinal,
  type Pago,
} from "@/lib/billing/servicio";
import { CABECERA_FIRMA_SANDBOX, firmarEventoSandbox } from "@/lib/billing/proveedores/sandbox";
import { manejarWebhook } from "@/lib/billing/webhook";

/* ============================================================
   Acciones de compra (sección 9). Nunca se piden datos de tarjeta:
   se crea un pago pendiente y se redirige al checkout del proveedor.
   ============================================================ */

function urlSitio(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

type SesionCompra = { id: string; tipo: "candidato" | "empresa"; email: string };

async function sesionCompra(): Promise<SesionCompra | null> {
  const s = await getUsuario();
  if (!s || (s.tipo !== "candidato" && s.tipo !== "empresa")) return null;
  return { id: s.user.id, tipo: s.tipo, email: s.email };
}

/** Vacante propia, empresa verificada y vacante pública. */
async function validarVacanteDestacable(empresaId: string, vacanteId: string | undefined): Promise<string | null> {
  if (!vacanteId) return "Elige la vacante que quieres destacar.";
  const admin = createAdminClient();
  const [{ data: vacante }, { data: empresa }] = await Promise.all([
    admin.from("vacantes").select("id, empresa_id, es_publica").eq("id", vacanteId).maybeSingle(),
    admin.from("empresas").select("id, verificada").eq("id", empresaId).maybeSingle(),
  ]);
  if (!vacante || vacante.empresa_id !== empresaId) return "No encontramos esa vacante en tu cuenta.";
  if (!empresa?.verificada) return "Para destacar vacantes tu empresa debe estar verificada.";
  if (!vacante.es_publica) return "Solo puedes destacar vacantes publicadas y aprobadas.";
  return null;
}

async function checkoutDePago(pago: Pick<Pago, "referencia" | "monto" | "producto">, email?: string): Promise<string> {
  const producto = esProductoCodigo(pago.producto) ? PRODUCTOS[pago.producto] : null;
  const { url } = await getPasarela().crearCheckout({
    referencia: pago.referencia,
    montoCop: pago.monto,
    descripcion: producto?.nombre ?? "CostaLaboral",
    email,
    urlRetorno: `${urlSitio()}/pagos/resultado?ref=${encodeURIComponent(pago.referencia)}`,
  });
  return url;
}

export async function iniciarCompra(
  producto: ProductoCodigo,
  opciones?: { vacanteId?: string },
): Promise<{ url: string } | { error: string }> {
  try {
    if (typeof producto !== "string" || !esProductoCodigo(producto)) return { error: "Producto no válido." };
    const prod = PRODUCTOS[producto];
    const sesion = await sesionCompra();
    if (!sesion) return { error: "Inicia sesión para continuar con la compra." };
    if (prod.audiencia !== sesion.tipo) {
      return {
        error: prod.audiencia === "empresa" ? "Este producto es para cuentas de empresa." : "Este plan es para cuentas de candidato.",
      };
    }

    const limite = await limitar("checkout", sesion.id);
    if (!limite.permitido) return { error: mensajeLimite(limite) };

    const admin = createAdminClient();
    const vacanteId = opciones?.vacanteId;
    let suscripcionId: string | null = null;

    if (prod.concepto === "vacante_destacada") {
      const problema = await validarVacanteDestacable(sesion.id, vacanteId);
      if (problema) return { error: problema };
    } else if (prod.tipo === "suscripcion") {
      const vigente = await getSuscripcionVigente(sesion.id);
      if (vigente && vigente.plan === prod.plan) {
        if (!puedeRecomprarMismoPlan(vigente)) {
          return {
            error: `Ya tienes ${prod.nombre} activo hasta el ${new Date(vigente.periodo_fin).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" })}. Podrás renovarlo en los últimos 7 días del periodo.`,
          };
        }
        // Si ya hay una renovación pendiente, se retoma ese mismo pago (evita cobrar dos veces).
        const { data: pendiente } = await admin
          .from("pagos")
          .select("*")
          .eq("suscripcion_id", vigente.id)
          .eq("concepto", "renovacion")
          .eq("estado", "pendiente")
          .order("creado_en", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pendiente && (pendiente as Pago).proveedor === getPasarela().id) {
          return { url: await checkoutDePago(pendiente as Pago, sesion.email) };
        }
        suscripcionId = vigente.id;
      }
    }

    const pasarela = getPasarela();
    const fila = {
      suscripcion_id: suscripcionId,
      propietario_id: sesion.id,
      propietario_tipo: sesion.tipo,
      concepto: suscripcionId ? "renovacion" : prod.concepto,
      producto: prod.codigo,
      proveedor: pasarela.id,
      monto: prod.precioCop,
      moneda: "COP",
      metadata: {
        ...(vacanteId && prod.concepto === "vacante_destacada" ? { vacanteId, duracionDias: prod.duracionDias } : {}),
        ...(prod.plan ? { plan: prod.plan, periodoDias: prod.periodoDias } : {}),
      },
    };

    let pago: Pago | null = null;
    for (let intento = 0; intento < 3 && !pago; intento++) {
      const { data, error } = await admin
        .from("pagos")
        .insert({ ...fila, referencia: generarReferencia() })
        .select("*")
        .single();
      if (!error) pago = data as Pago;
      else if (error.code !== "23505") throw error;
    }
    if (!pago) throw new Error("No se pudo generar una referencia única.");

    const url = await checkoutDePago(pago, sesion.email);
    const actor: ActorAuditoria = { id: sesion.id, tipo: sesion.tipo };
    await registrarAuditoria({
      actor,
      accion: "pago.creado",
      entidad: "pagos",
      entidadId: pago.id,
      despues: { referencia: pago.referencia, producto: pago.producto, monto: pago.monto, estado: pago.estado },
      metadata: { proveedor: pasarela.id, vacanteId: vacanteId ?? null },
    });
    await registrarEvento({
      tipo: "checkout_iniciado",
      actor_id: sesion.id,
      actor_tipo: sesion.tipo,
      entidad: "pagos",
      entidad_id: pago.id,
      meta: { producto: pago.producto, monto: pago.monto, proveedor: pasarela.id },
    });
    return { url };
  } catch (err) {
    log.error("iniciar_compra_fallo", { producto, err });
    return { error: "No pudimos iniciar el pago. Intenta de nuevo en unos minutos." };
  }
}

export async function usarDestacadaIncluida(
  vacanteId: string,
  producto: ProductoCodigo,
): Promise<{ ok: true } | { error: string }> {
  try {
    if (typeof producto !== "string" || !PRODUCTOS_DESTACADA.includes(producto)) return { error: "Producto no válido." };
    const sesion = await sesionCompra();
    if (!sesion || sesion.tipo !== "empresa") return { error: "Solo las empresas pueden destacar vacantes." };

    const { beneficios, plan } = await getBeneficiosEmpresa(sesion.id);
    if (plan !== "pro" || beneficios.destacadasIncluidasMes <= 0) {
      return { error: "Las destacadas incluidas son parte de Empresa Pro." };
    }
    const usadas = await contarDestacadasIncluidasUsadasMes(sesion.id);
    if (usadas >= beneficios.destacadasIncluidasMes) {
      return { error: "Ya usaste las destacadas incluidas de este mes. Puedes comprar una adicional." };
    }
    const problema = await validarVacanteDestacable(sesion.id, vacanteId);
    if (problema) return { error: problema };

    const limite = await limitar("checkout", sesion.id);
    if (!limite.permitido) return { error: mensajeLimite(limite) };

    const prod = PRODUCTOS[producto];
    const admin = createAdminClient();
    const ahora = new Date().toISOString();
    const { data, error } = await admin
      .from("pagos")
      .insert({
        referencia: generarReferencia(),
        propietario_id: sesion.id,
        propietario_tipo: "empresa",
        concepto: "vacante_destacada",
        producto: prod.codigo,
        proveedor: PROVEEDOR_INCLUIDA,
        monto: 0,
        moneda: "COP",
        estado: "aprobado",
        aprobado_en: ahora,
        metadata: { vacanteId, duracionDias: prod.duracionDias, incluida: true },
      })
      .select("*")
      .single();
    if (error) throw error;
    const pago = data as Pago;
    const actor: ActorAuditoria = { id: sesion.id, tipo: "empresa" };

    // Guarda contra doble clic concurrente: si se pasó del cupo, se anula.
    if ((await contarDestacadasIncluidasUsadasMes(sesion.id)) > beneficios.destacadasIncluidasMes) {
      await admin.from("pagos").update({ estado: "anulado", actualizado_en: new Date().toISOString() }).eq("id", pago.id);
      return { error: "Ya usaste las destacadas incluidas de este mes." };
    }

    await registrarAuditoria({
      actor,
      accion: "pago.aprobado",
      entidad: "pagos",
      entidadId: pago.id,
      despues: { estado: "aprobado", monto: 0, producto: prod.codigo },
      metadata: { incluida: true, vacanteId },
    });
    const r = await aplicarDestacadaDePago(pago, actor);
    if ("error" in r) return r;

    revalidatePath("/planes");
    revalidatePath("/empresa/panel");
    return { ok: true };
  } catch (err) {
    log.error("destacada_incluida_fallo", { vacanteId, err });
    return { error: "No pudimos destacar la vacante. Intenta de nuevo." };
  }
}

export async function cancelarSuscripcion(): Promise<{ ok: true } | { error: string }> {
  try {
    const sesion = await sesionCompra();
    if (!sesion) return { error: "Inicia sesión para gestionar tu plan." };
    const vigente = await getSuscripcionVigente(sesion.id);
    if (!vigente) return { error: "No tienes una suscripción activa." };
    const r = await marcarCancelarAlFinal(vigente, { id: sesion.id, tipo: sesion.tipo });
    revalidatePath("/planes");
    revalidatePath("/pagos");
    return r;
  } catch (err) {
    log.error("cancelar_suscripcion_fallo", { err });
    return { error: "No pudimos cancelar la renovación. Intenta de nuevo." };
  }
}

/* ---------------- Simulador de la pasarela de prueba ---------------- */

/**
 * Firma un evento como lo haría la pasarela sandbox y lo envía al webhook.
 * Solo el dueño del pago y solo si el proveedor activo es sandbox.
 */
export async function simularPagoSandbox(referencia: string, resultado: "aprobado" | "rechazado"): Promise<void> {
  const destino = `/pagos/resultado?ref=${encodeURIComponent(referencia)}`;
  const sesion = await sesionCompra();
  if (!sesion) redirect(`/login?next=${encodeURIComponent(destino)}`);

  const pasarela = getPasarelaSegura();
  const pago = await getPagoPorReferencia(String(referencia));
  if (!pasarela || pasarela.id !== "sandbox" || !pago || pago.propietario_id !== sesion.id || pago.proveedor !== "sandbox") {
    redirect("/pagos");
  }
  if (pago.estado !== "pendiente") redirect(destino);

  const tipo: TipoEventoPasarela = resultado === "aprobado" ? "transaccion.aprobada" : "transaccion.rechazada";
  const evento: EventoPasarela = {
    id: `sbx_evt_${randomUUID()}`,
    tipo,
    referencia: pago.referencia,
    externalId: `sbx_txn_${randomUUID()}`,
    montoCop: pago.monto,
    moneda: pago.moneda,
    ocurridoEn: new Date().toISOString(),
  };
  const { cuerpo, firma } = firmarEventoSandbox(evento);
  const cabeceras = { "content-type": "application/json", [CABECERA_FIRMA_SANDBOX]: firma };

  let entregado = false;
  try {
    const res = await fetch(`${urlSitio()}/api/pagos/webhook/sandbox`, {
      method: "POST",
      headers: cabeceras,
      body: cuerpo,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    entregado = res.ok;
    if (!res.ok) log.warn("sandbox_webhook_http_no_ok", { status: res.status, referencia });
  } catch (err) {
    log.warn("sandbox_webhook_fetch_fallo", { referencia, err });
  }
  if (!entregado) {
    // Respaldo (p. ej. NEXT_PUBLIC_SITE_URL apunta a otro host): mismo flujo, sin HTTP.
    await manejarWebhook("sandbox", new Headers(cabeceras), cuerpo);
  }

  revalidatePath("/pagos");
  revalidatePath("/planes");
  redirect(destino);
}
