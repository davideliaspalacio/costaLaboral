import { NextResponse } from "next/server";
import { autorizarCron } from "@/lib/cron";
import { registrarAuditoria, ACTOR_SISTEMA } from "@/lib/audit";
import { log } from "@/lib/log";
import { procesarVencimientos } from "@/lib/billing/servicio";

export const dynamic = "force-dynamic";

/** Vencimientos de suscripciones (Vercel Cron → GET /api/cron/suscripciones). */
export async function GET(req: Request) {
  if (!autorizarCron(req)) {
    return NextResponse.json({ error: "no_autorizado" }, { status: 401, headers: { "cache-control": "no-store" } });
  }
  const inicio = Date.now();
  try {
    const conteo = await procesarVencimientos();
    const duracionMs = Date.now() - inicio;
    await registrarAuditoria({
      actor: ACTOR_SISTEMA,
      accion: "sistema.tarea_programada",
      entidad: "suscripciones",
      metadata: { tarea: "suscripciones_vencimientos", ...conteo, duracionMs },
    });
    log.info("cron_suscripciones", { ...conteo, duracionMs });
    return NextResponse.json({ ok: true, ...conteo, duracionMs }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    log.error("cron_suscripciones_fallo", { err });
    return NextResponse.json({ error: "fallo" }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}
