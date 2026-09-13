/* ============================================================
   Logger estructurado (JSON por línea). Vercel indexa stdout y lo
   envía a cualquier log drain (Datadog, Axiom, Better Stack…).
   Nunca registres datos personales en claro: usa ids.
   ============================================================ */

type Nivel = "debug" | "info" | "warn" | "error";

const SENSIBLES = /pass(word)?|token|secret|authorization|cookie|api[_-]?key|whatsapp|email|documento|telefono/i;

function sanear(valor: unknown, profundidad = 0): unknown {
  if (valor instanceof Error) return { name: valor.name, message: valor.message, stack: valor.stack };
  if (valor == null || typeof valor !== "object" || profundidad > 4) return valor;
  if (Array.isArray(valor)) return valor.map((v) => sanear(v, profundidad + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor)) {
    out[k] = SENSIBLES.test(k) ? "[redactado]" : sanear(v, profundidad + 1);
  }
  return out;
}

function escribir(nivel: Nivel, msg: string, ctx?: Record<string, unknown>) {
  if (nivel === "debug" && process.env.NODE_ENV === "production") return;
  const linea = JSON.stringify({
    nivel,
    msg,
    ts: new Date().toISOString(),
    ...(ctx ? (sanear(ctx) as Record<string, unknown>) : {}),
  });
  if (nivel === "error") console.error(linea);
  else if (nivel === "warn") console.warn(linea);
  else console.log(linea);
}

export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) => escribir("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => escribir("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => escribir("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => escribir("error", msg, ctx),
};
