/* ============================================================
   Radicado de solicitudes de titulares: HD-AAAA-XXXXXX.
   AAAA = año civil en Bogotá. XXXXXX = 6 caracteres de un alfabeto
   sin caracteres ambiguos (sin 0/O, 1/I/L). Función pura: la
   aleatoriedad entra por parámetro para poder probarla.
   ============================================================ */

export const ALFABETO_RADICADO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const LARGO = 6;
const OFFSET_BOGOTA_MS = -5 * 3_600_000;

export const PATRON_RADICADO = new RegExp(`^HD-\\d{4}-[${ALFABETO_RADICADO}]{${LARGO}}$`);

/** Año civil en Bogotá (UTC-5, sin horario de verano). */
export function anioBogota(fecha: Date): number {
  return new Date(fecha.getTime() + OFFSET_BOGOTA_MS).getUTCFullYear();
}

/**
 * Genera un radicado. `bytes` debe traer al menos 6 valores 0-255
 * (en producción: crypto.getRandomValues).
 */
export function generarRadicado(fecha: Date, bytes: ArrayLike<number>): string {
  if (bytes.length < LARGO) throw new Error("generarRadicado: se requieren 6 bytes aleatorios");
  let sufijo = "";
  for (let i = 0; i < LARGO; i++) {
    sufijo += ALFABETO_RADICADO[bytes[i] % ALFABETO_RADICADO.length];
  }
  return `HD-${anioBogota(fecha)}-${sufijo}`;
}

export function esRadicadoValido(valor: string): boolean {
  return PATRON_RADICADO.test(valor);
}
