import { createHmac, timingSafeEqual } from "node:crypto";

/* Firmas HMAC-SHA256 (hex) y comparación en tiempo constante. Puro, testeable. */

export function firmarHmac(secreto: string, contenido: string): string {
  return createHmac("sha256", secreto).update(contenido, "utf8").digest("hex");
}

export function firmaValida(secreto: string, contenido: string, firma: string | null | undefined): boolean {
  if (!firma || !/^[0-9a-f]+$/i.test(firma)) return false;
  const esperada = Buffer.from(firmarHmac(secreto, contenido), "hex");
  const recibida = Buffer.from(firma, "hex");
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}
