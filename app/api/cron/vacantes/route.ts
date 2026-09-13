import { autorizarCron } from "@/lib/cron";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrarAuditoria, ACTOR_SISTEMA } from "@/lib/audit";
import { log } from "@/lib/log";

/* Vercel Cron diario: cierra vacantes cuyo expira_en ya pasó. */

export const dynamic = "force-dynamic";

const TAREA = "cerrar_vacantes_expiradas";

export async function GET(req: Request) {
  if (!autorizarCron(req)) {
    return Response.json({ error: "no_autorizado" }, { status: 401 });
  }

  const inicio = Date.now();
  const { data, error } = await createAdminClient().rpc(TAREA);

  if (error) {
    log.error("cron_fallo", { tarea: TAREA, err: error.message });
    await registrarAuditoria({
      actor: ACTOR_SISTEMA,
      accion: "sistema.tarea_programada",
      entidad: "sistema",
      entidadId: TAREA,
      metadata: { tarea: TAREA, ok: false, error: error.message },
    });
    return Response.json({ ok: false, error: "tarea_fallida" }, { status: 500 });
  }

  const ids = ((data ?? []) as unknown[]).map((fila) =>
    typeof fila === "string" ? fila : String(Object.values(fila as Record<string, unknown>)[0]),
  );

  await Promise.all(
    ids.map((id) =>
      registrarAuditoria({
        actor: ACTOR_SISTEMA,
        accion: "vacante.expirada",
        entidad: "vacantes",
        entidadId: id,
        despues: { estado: "cerrada", motivo_cierre: "expirada" },
      }),
    ),
  );

  const duracionMs = Date.now() - inicio;
  await registrarAuditoria({
    actor: ACTOR_SISTEMA,
    accion: "sistema.tarea_programada",
    entidad: "sistema",
    entidadId: TAREA,
    metadata: { tarea: TAREA, ok: true, cerradas: ids.length, duracionMs },
  });
  log.info("cron_ok", { tarea: TAREA, cerradas: ids.length, duracionMs });

  return Response.json({ ok: true, cerradas: ids.length }, { headers: { "Cache-Control": "no-store" } });
}
