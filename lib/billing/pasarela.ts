import "server-only";
import type { TipoEventoPasarela } from "@/lib/billing/estados";
import { pasarelaSandbox } from "@/lib/billing/proveedores/sandbox";

/* ============================================================
   Adaptador de pasarela de pagos (sección 9).
   El resto de la app solo conoce esta interfaz: el servicio de
   billing trabaja con eventos normalizados (EventoPasarela) y no
   sabe qué proveedor los emitió. Nunca pedimos ni guardamos datos
   de tarjeta: el checkout siempre ocurre en la página del proveedor.
   ============================================================ */

export type EventoPasarela = {
  /** Id del evento en el proveedor (clave de idempotencia de webhook_eventos). */
  id: string;
  tipo: TipoEventoPasarela;
  /** Nuestra referencia (pagos.referencia). */
  referencia: string;
  /** Id de la transacción en el proveedor (pagos.external_id). */
  externalId: string;
  montoCop: number;
  moneda: string;
  ocurridoEn: string;
};

export type CheckoutParams = {
  referencia: string;
  montoCop: number;
  descripcion: string;
  email?: string;
  /** URL absoluta a la que el proveedor devuelve al usuario (/pagos/resultado?ref=…). */
  urlRetorno: string;
};

export interface PasarelaPagos {
  id: string;
  /** Devuelve la URL (relativa o absoluta) del checkout alojado por el proveedor. */
  crearCheckout(params: CheckoutParams): Promise<{ url: string }>;
  /** Verifica la firma del webhook y normaliza el evento. `evento` es null si el tipo no nos interesa. */
  verificarWebhook(headers: Headers, cuerpoCrudo: string): Promise<{ valida: boolean; evento: EventoPasarela | null }>;
}

/*
 * ---- Cómo encaja Wompi (pendiente, NO implementado) ----
 * lib/billing/proveedores/wompi.ts exportaría `pasarelaWompi: PasarelaPagos` con id "wompi":
 *
 * crearCheckout: Web Checkout (https://checkout.wompi.co/p/) con query
 *   public-key=WOMPI_PUBLIC_KEY, currency=COP, amount-in-cents=montoCop*100,
 *   reference=referencia, redirect-url=urlRetorno, customer-data:email=email y
 *   signature:integrity = SHA256(`${referencia}${montoCop*100}COP${WOMPI_INTEGRITY_SECRET}`).
 *
 * verificarWebhook: el cuerpo trae { event, data: { transaction }, signature: { properties, checksum }, timestamp }.
 *   checksum = SHA256(concat(valores de `properties` leídos de data) + timestamp + WOMPI_EVENTS_SECRET),
 *   comparado en tiempo constante. Mapeo: event "transaction.updated" con status
 *   APPROVED → "transaccion.aprobada", DECLINED/ERROR → "transaccion.rechazada",
 *   VOIDED → "transaccion.anulada". id del evento = `${transaction.id}:${status}`
 *   (Wompi no manda id de evento), montoCop = amount_in_cents / 100.
 *   Los reembolsos se hacen en el dashboard de Wompi y se reflejan con reembolsarPago (admin).
 *
 * Luego: agregar el caso "wompi" en getPasarela() y las variables WOMPI_* en el entorno.
 */

const PROVEEDORES: Record<string, PasarelaPagos> = {
  sandbox: pasarelaSandbox,
};

/** Id del proveedor configurado. En producción PAGOS_PROVEEDOR es obligatorio. */
export function proveedorConfigurado(): string {
  const valor = process.env.PAGOS_PROVEEDOR?.trim();
  if (valor) return valor;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PAGOS_PROVEEDOR no está configurado. Defínelo explícitamente en producción (por ahora: \"sandbox\").",
    );
  }
  return "sandbox";
}

export function getPasarela(): PasarelaPagos {
  const id = proveedorConfigurado();
  const pasarela = PROVEEDORES[id];
  if (!pasarela) throw new Error(`Proveedor de pagos desconocido: "${id}". Valores válidos: ${Object.keys(PROVEEDORES).join(", ")}.`);
  return pasarela;
}

/** Igual que getPasarela pero sin lanzar (para páginas): null si la configuración es inválida. */
export function getPasarelaSegura(): PasarelaPagos | null {
  try {
    return getPasarela();
  } catch {
    return null;
  }
}
