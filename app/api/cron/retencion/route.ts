import { autorizarCron } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria, ACTOR_SISTEMA } from "@/lib/audit";
import { log } from "@/lib/log";

/* Vercel Cron semanal: purga datos operativos vencidos según la tabla de conservación. */

export const dynamic = "force-dynamic";

const TAREA = "purgar_datos_retencion";

export async function GET(req: Request) {
  if (!autorizarCron(req)) {
    return Response.json({ error: "no_autorizado" }, { status: 401 });
  }

  const inicio = Date.now();
  const { data, error } = await createAdminClient().rpc(TAREA);
  const duracionMs = Date.now() - inicio;

  if (error) {
    log.error("cron_fallo", { tarea: TAREA, err: error.message });
    await registrarAuditoria({
      actor: ACTOR_SISTEMA,
      accion: "sistema.tarea_programada",
      entidad: "sistema",
      entidadId: TAREA,
      metadata: { tarea: TAREA, ok: false, error: error.message, duracionMs },
    });
    return Response.json({ ok: false, error: "tarea_fallida" }, { status: 500 });
  }

  const resultado = (data ?? {}) as Record<string, number>;
  await registrarAuditoria({
    actor: ACTOR_SISTEMA,
    accion: "sistema.tarea_programada",
    entidad: "sistema",
    entidadId: TAREA,
    metadata: { tarea: TAREA, ok: true, resultado, duracionMs },
  });
  log.info("cron_ok", { tarea: TAREA, resultado, duracionMs });

  return Response.json({ ok: true, resultado }, { headers: { "Cache-Control": "no-store" } });
}
