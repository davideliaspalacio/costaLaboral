import "server-only";
import { headers } from "next/headers";

export type InfoRequest = { ip: string | null; userAgent: string | null; requestId: string | null };

/** IP, user-agent e id de la petición actual. Fuera de un request (cron, scripts) devuelve nulls. */
export async function infoRequest(): Promise<InfoRequest> {
  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    return {
      ip,
      userAgent: h.get("user-agent")?.slice(0, 400) ?? null,
      requestId: h.get("x-vercel-id") ?? h.get("x-request-id") ?? null,
    };
  } catch {
    return { ip: null, userAgent: null, requestId: null };
  }
}
