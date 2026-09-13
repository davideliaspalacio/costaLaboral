import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Autoriza una invocación de Vercel Cron. Vercel envía
 * `Authorization: Bearer <CRON_SECRET>`. Sin CRON_SECRET solo se permite fuera de producción.
 */
export function autorizarCron(req: Request): boolean {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return process.env.NODE_ENV !== "production";
  const recibido = Buffer.from(req.headers.get("authorization") ?? "");
  const esperado = Buffer.from(`Bearer ${secreto}`);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}
