/* ============================================================
   Máquinas de estado y cálculos puros de pagos (sección 9).
   Sin I/O: todo lo testeable del ciclo customer → subscription →
   payment → entitlement vive aquí (test/unit/billing.test.ts).
   ============================================================ */
import { DIAS_GRACIA_PAST_DUE } from "@/lib/entitlements";

const DIA_MS = 86_400_000;

/* ---------------- Pagos ---------------- */

export type EstadoPago = "pendiente" | "aprobado" | "fallido" | "reembolsado" | "anulado";

export const TRANSICIONES_PAGO: Record<EstadoPago, readonly EstadoPago[]> = {
  pendiente: ["aprobado", "fallido", "anulado"],
  aprobado: ["reembolsado"],
  // Estados finales: nada sale de aquí.
  fallido: [],
  anulado: [],
  reembolsado: [],
};

export function puedeTransicionarPago(desde: EstadoPago, hacia: EstadoPago): boolean {
  return TRANSICIONES_PAGO[desde].includes(hacia);
}

export const ESTADO_PAGO_INFO: Record<EstadoPago, { label: string; tono: "sol" | "success" | "danger" | "neutral" }> = {
  pendiente: { label: "Pendiente", tono: "sol" },
  aprobado: { label: "Aprobado", tono: "success" },
  fallido: { label: "Rechazado", tono: "danger" },
  anulado: { label: "Anulado", tono: "neutral" },
  reembolsado: { label: "Reembolsado", tono: "neutral" },
};

/* ---------------- Eventos de pasarela ---------------- */

export const TIPOS_EVENTO_PASARELA = [
  "transaccion.aprobada",
  "transaccion.rechazada",
  "transaccion.anulada",
  "reembolso.aprobado",
] as const;
export type TipoEventoPasarela = (typeof TIPOS_EVENTO_PASARELA)[number];

/** Estado al que lleva cada evento normalizado. */
export function estadoPagoDeEvento(tipo: TipoEventoPasarela): EstadoPago {
  switch (tipo) {
    case "transaccion.aprobada":
      return "aprobado";
    case "transaccion.rechazada":
      return "fallido";
    case "transaccion.anulada":
      return "anulado";
    case "reembolso.aprobado":
      return "reembolsado";
  }
}

/** El evento debe cobrar exactamente lo que se registró al crear el pago. */
export function montoCoincide(
  pago: { monto: number; moneda: string },
  evento: { montoCop: number; moneda: string },
): boolean {
  return pago.monto === evento.montoCop && pago.moneda.toUpperCase() === evento.moneda.toUpperCase();
}

/* ---------------- Suscripciones ---------------- */

export type EstadoSuscripcion = "active" | "past_due" | "canceled" | "expired";

export const TRANSICIONES_SUSCRIPCION: Record<EstadoSuscripcion, readonly EstadoSuscripcion[]> = {
  // active → active es la renovación (extiende periodo_fin).
  active: ["active", "past_due", "canceled", "expired"],
  // past_due → active: pagó la renovación dentro de la gracia.
  past_due: ["active", "canceled", "expired"],
  canceled: [],
  expired: [],
};

export function puedeTransicionarSuscripcion(desde: EstadoSuscripcion, hacia: EstadoSuscripcion): boolean {
  return TRANSICIONES_SUSCRIPCION[desde].includes(hacia);
}

export const ESTADO_SUSCRIPCION_LABEL: Record<EstadoSuscripcion, string> = {
  active: "Activa",
  past_due: "Pago de renovación pendiente",
  canceled: "Cancelada",
  expired: "Vencida",
};

/**
 * Qué hacer al aprobarse un pago de suscripción:
 * - "renovar": ya tiene ese mismo plan vigente → se extiende el periodo.
 * - "cambiar": tiene otro plan vigente → se cancela y se crea el nuevo desde hoy
 *   (MVP sin prorrateo: el tiempo restante del plan anterior no se abona).
 * - "crear": no tiene suscripción vigente.
 */
export function accionCompraSuscripcion(
  vigente: { plan: string; estado: EstadoSuscripcion } | null,
  planNuevo: string,
): "renovar" | "cambiar" | "crear" {
  if (!vigente || (vigente.estado !== "active" && vigente.estado !== "past_due")) return "crear";
  return vigente.plan === planNuevo ? "renovar" : "cambiar";
}

/** Periodo nuevo: inicia ahora; en renovación el fin corre desde el mayor entre ahora y el fin actual. */
export function calcularPeriodo(
  ahora: Date,
  periodoDias: number,
  periodoFinActual?: string | Date | null,
): { inicio: Date; fin: Date } {
  const base = Math.max(ahora.getTime(), periodoFinActual ? new Date(periodoFinActual).getTime() : 0);
  return { inicio: ahora, fin: new Date(base + periodoDias * DIA_MS) };
}

/** destacada_hasta = max(ahora, destacada_hasta) + duracionDias. */
export function extenderDestacada(ahora: Date, destacadaHasta: string | Date | null | undefined, duracionDias: number): Date {
  const base = Math.max(ahora.getTime(), destacadaHasta ? new Date(destacadaHasta).getTime() : 0);
  return new Date(base + duracionDias * DIA_MS);
}

export const DIAS_ANTES_PARA_RENOVAR = 7;

/** Días completos que le quedan al periodo (0 si ya terminó). */
export function diasRestantes(periodoFin: string | Date, ahora = new Date()): number {
  return Math.max(0, Math.ceil((new Date(periodoFin).getTime() - ahora.getTime()) / DIA_MS));
}

/** Se permite pagar de nuevo el mismo plan solo cuando faltan ≤ 7 días (o ya está en past_due). */
export function puedeRecomprarMismoPlan(
  vigente: { estado: EstadoSuscripcion; periodo_fin: string },
  ahora = new Date(),
): boolean {
  if (vigente.estado === "past_due") return true;
  return new Date(vigente.periodo_fin).getTime() - ahora.getTime() <= DIAS_ANTES_PARA_RENOVAR * DIA_MS;
}

/**
 * Decisión del cron para una suscripción:
 * - active vencida con cancelar_al_final → "expirar"
 * - active vencida sin cancelar → "past_due" (+ pago de renovación pendiente)
 * - past_due con cancelar_al_final o más allá de la gracia → "expirar"
 */
export function decidirVencimiento(
  s: { estado: EstadoSuscripcion; periodo_fin: string; cancelar_al_final: boolean },
  ahora = new Date(),
): "expirar" | "past_due" | "nada" {
  const fin = new Date(s.periodo_fin).getTime();
  const t = ahora.getTime();
  if (s.estado === "active") {
    if (fin >= t) return "nada";
    return s.cancelar_al_final ? "expirar" : "past_due";
  }
  if (s.estado === "past_due") {
    if (s.cancelar_al_final) return "expirar";
    return fin + DIAS_GRACIA_PAST_DUE * DIA_MS < t ? "expirar" : "nada";
  }
  return "nada";
}

/* ---------------- Referencias y fechas ---------------- */

const ALFABETO_REF = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I

/** Fecha AAAAMMDD en hora de Colombia. */
export function fechaBogota(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "";
  return `${v("year")}${v("month")}${v("day")}`;
}

/** Referencia legible y única por pago: CL-AAAAMMDD-XXXXXX. */
export function generarReferencia(fecha = new Date(), aleatorio: (n: number) => Uint8Array = defaultAleatorio): string {
  const bytes = aleatorio(6);
  let sufijo = "";
  for (let i = 0; i < 6; i++) sufijo += ALFABETO_REF[bytes[i] % ALFABETO_REF.length];
  return `CL-${fechaBogota(fecha)}-${sufijo}`;
}

export const REGEX_REFERENCIA = /^CL-\d{8}-[A-Z2-9]{6}$/;

function defaultAleatorio(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

/** Inicio del mes calendario en Colombia (UTC-5 fijo, sin horario de verano). */
export function inicioMesBogota(ahora = new Date()): Date {
  const ymd = fechaBogota(ahora);
  return new Date(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-01T00:00:00-05:00`);
}
