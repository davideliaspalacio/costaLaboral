import type { Instrumentation } from "next";
import { validarEntorno } from "@/lib/env";
import { log } from "@/lib/log";

/* ============================================================
   Observabilidad del servidor (Next 16):
   - register(): valida el entorno una vez por instancia.
   - onRequestError(): registra errores de render, route handlers,
     server actions y proxy como JSON (sin cuerpo, headers ni cookies).
   ============================================================ */

export function register() {
  const r = validarEntorno();
  const runtime = process.env.NEXT_RUNTIME ?? "nodejs";

  if (!r.ok) {
    const msg = process.env.NODE_ENV === "production" ? "entorno_invalido" : "entorno_incompleto";
    log.error(msg, { runtime, errores: r.errores });
  }
  if (r.advertencias.length > 0) {
    log.warn("entorno_advertencias", { runtime, advertencias: r.advertencias });
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;

  log.error("request_error", {
    // Solo la ruta, sin query string (puede traer datos personales).
    ruta: request.path.split("?")[0],
    metodo: request.method,
    tipoRuta: context.routeType,
    archivoRuta: context.routePath,
    router: context.routerKind,
    digest,
    nombre: err instanceof Error ? err.name : typeof err,
    mensaje: err instanceof Error ? err.message.slice(0, 500) : undefined,
  });
};
