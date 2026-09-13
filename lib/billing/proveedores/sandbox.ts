import "server-only";
import { z } from "zod";
import { firmaValida, firmarHmac } from "@/lib/billing/firma";
import { TIPOS_EVENTO_PASARELA } from "@/lib/billing/estados";
import type { EventoPasarela, PasarelaPagos } from "@/lib/billing/pasarela";

/* ============================================================
   Pasarela de PRUEBA. No mueve dinero ni pide datos de tarjeta.
   - Checkout: /pagos/sandbox/[referencia]?monto=&firma= (HMAC del
     enlace: nadie puede cambiar el monto en la URL).
   - Webhook: POST /api/pagos/webhook/sandbox con cabecera
     x-sandbox-signature = HMAC-SHA256(cuerpo crudo).
   ============================================================ */

export const CABECERA_FIRMA_SANDBOX = "x-sandbox-signature";
const SECRETO_DESARROLLO = "costalaboral-sandbox-solo-desarrollo";

export function secretoSandbox(): string {
  const s = process.env.PAGOS_SANDBOX_SECRET?.trim();
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PAGOS_SANDBOX_SECRET es obligatorio en producción cuando PAGOS_PROVEEDOR=sandbox.");
  }
  return SECRETO_DESARROLLO;
}

function contenidoCheckout(referencia: string, montoCop: number): string {
  return `checkout|${referencia}|${montoCop}`;
}

export function firmarCheckoutSandbox(referencia: string, montoCop: number, secreto = secretoSandbox()): string {
  return firmarHmac(secreto, contenidoCheckout(referencia, montoCop));
}

export function checkoutSandboxValido(
  referencia: string,
  montoCop: number,
  firma: string | null | undefined,
  secreto = secretoSandbox(),
): boolean {
  return firmaValida(secreto, contenidoCheckout(referencia, montoCop), firma);
}

const esquemaEvento = z.object({
  id: z.string().min(1).max(200),
  tipo: z.enum(TIPOS_EVENTO_PASARELA),
  referencia: z.string().min(1).max(100),
  externalId: z.string().min(1).max(200),
  montoCop: z.number().int().nonnegative(),
  moneda: z.string().min(3).max(3),
  ocurridoEn: z.string().min(1),
});

/** Serializa y firma un evento (lo usa el simulador de /pagos/sandbox). */
export function firmarEventoSandbox(evento: EventoPasarela, secreto = secretoSandbox()): { cuerpo: string; firma: string } {
  const cuerpo = JSON.stringify(evento);
  return { cuerpo, firma: firmarHmac(secreto, cuerpo) };
}

export function verificarEventoSandbox(
  firma: string | null,
  cuerpoCrudo: string,
  secreto = secretoSandbox(),
): { valida: boolean; evento: EventoPasarela | null } {
  if (!firmaValida(secreto, cuerpoCrudo, firma)) return { valida: false, evento: null };
  let json: unknown;
  try {
    json = JSON.parse(cuerpoCrudo);
  } catch {
    return { valida: true, evento: null };
  }
  const r = esquemaEvento.safeParse(json);
  return { valida: true, evento: r.success ? r.data : null };
}

export const pasarelaSandbox: PasarelaPagos = {
  id: "sandbox",
  async crearCheckout({ referencia, montoCop }) {
    const firma = firmarCheckoutSandbox(referencia, montoCop);
    const q = new URLSearchParams({ monto: String(montoCop), firma });
    return { url: `/pagos/sandbox/${encodeURIComponent(referencia)}?${q.toString()}` };
  },
  async verificarWebhook(headers, cuerpoCrudo) {
    return verificarEventoSandbox(headers.get(CABECERA_FIRMA_SANDBOX), cuerpoCrudo);
  },
};
