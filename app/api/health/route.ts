import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/log";

/* Chequeo de salud para monitores de uptime. Sin caché, sin datos personales. */

export const dynamic = "force-dynamic";

const SIN_CACHE = { "Cache-Control": "no-store, max-age=0" };

function version(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA;
  return sha ? sha.slice(0, 7) : "local";
}

export async function GET() {
  const inicio = performance.now();
  let db: "ok" | "error" = "ok";

  try {
    // Consulta liviana: conteo sin filas sobre una tabla pequeña.
    const { error } = await createAdminClient().from("staff").select("user_id", { count: "exact", head: true });
    if (error) throw error;
  } catch (err) {
    db = "error";
    log.error("health_db_fallo", { err });
  }

  const latenciaDbMs = Math.round(performance.now() - inicio);
  const status = db === "ok" ? "ok" : "degradado";

  return Response.json(
    { status, db, latenciaDbMs, version: version(), time: new Date().toISOString() },
    { status: db === "ok" ? 200 : 503, headers: SIN_CACHE },
  );
}
