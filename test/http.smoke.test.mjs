/* ============================================================
   Smoke test HTTP contra el servidor (Next.js) en localhost:3000.
   Hace fetch a las páginas públicas y verifica status + textos clave
   + headers de seguridad + /api/health.

   Requiere el servidor corriendo:  pnpm dev  (o pnpm build && pnpm start).
   Si NO responde, la suite se SALTA (test.skip) para no fallar en CI.
   Base configurable con SMOKE_BASE_URL.
   ============================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";

async function servidorVivo() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(BASE + "/", { signal: ctrl.signal });
    clearTimeout(t);
    return res.status < 500;
  } catch {
    return false;
  }
}

const VIVO = await servidorVivo();
const SKIP = VIVO ? false : "el servidor no está corriendo";

async function get(path) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(BASE + path, { signal: ctrl.signal, redirect: "manual" });
    const body = await res.text();
    return { status: res.status, body, headers: res.headers };
  } finally {
    clearTimeout(t);
  }
}

/* Páginas públicas: 200 y textos clave (sin distinguir mayúsculas). */
const PAGINAS = [
  { path: "/", incluye: ["ofertas"] },
  { path: "/ofertas", incluye: ["ofertas"] },
  { path: "/planes", incluye: ["planes"] },
  { path: "/login", incluye: ["ingresar", "correo"] },
  { path: "/terminos", incluye: ["términos y condiciones", "no es agencia de colocación", "ley 1480"] },
  { path: "/privacidad", incluye: ["tratamiento de datos personales", "ley 1581", "conservación"] },
  { path: "/datos-personales", incluye: ["habeas data", "radicar solicitud", "días hábiles"] },
];

for (const p of PAGINAS) {
  test(`GET ${p.path} → 200 y contiene textos clave`, { skip: SKIP }, async () => {
    const { status, body } = await get(p.path);
    assert.equal(status, 200, `esperaba 200 en ${p.path}, llegó ${status}`);
    const html = body.toLowerCase();
    for (const txt of p.incluye) {
      assert.ok(html.includes(txt.toLowerCase()), `${p.path} no contiene el texto clave "${txt}"`);
    }
  });
}

test("headers de seguridad presentes y sin X-Powered-By", { skip: SKIP }, async () => {
  const { headers } = await get("/terminos");
  const csp = headers.get("content-security-policy") ?? "";
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(headers.get("strict-transport-security") ?? "", /max-age=63072000/);
  assert.match(headers.get("permissions-policy") ?? "", /camera=\(\)/);
  assert.equal(headers.get("x-powered-by"), null);
});

test("GET /api/health → JSON con db ok y sin caché", { skip: SKIP }, async () => {
  const { status, body, headers } = await get("/api/health");
  assert.ok(status === 200 || status === 503, `status inesperado ${status}`);
  const json = JSON.parse(body);
  assert.ok(["ok", "degradado"].includes(json.status));
  assert.ok(["ok", "error"].includes(json.db));
  assert.equal(typeof json.latenciaDbMs, "number");
  assert.equal(typeof json.version, "string");
  assert.ok(!Number.isNaN(Date.parse(json.time)));
  assert.match(headers.get("cache-control") ?? "", /no-store/);
  assert.equal(status === 200, json.db === "ok");
});

test("rutas de cron rechazan sin secreto cuando CRON_SECRET está definido", { skip: SKIP }, async (t) => {
  if (!process.env.CRON_SECRET) {
    t.skip("CRON_SECRET no definido: fuera de producción las rutas quedan abiertas");
    return;
  }
  for (const ruta of ["/api/cron/vacantes", "/api/cron/retencion"]) {
    const { status } = await get(ruta);
    assert.equal(status, 401, `${ruta} debería responder 401 sin Authorization`);
  }
});

test("ruta privada redirige a /login", { skip: SKIP }, async () => {
  for (const ruta of ["/pagos", "/linkedin"]) {
    const { status, headers } = await get(ruta);
    assert.ok([307, 308].includes(status), `${ruta} debería redirigir, llegó ${status}`);
    assert.match(headers.get("location") ?? "", /\/login/);
  }
});

test("404 con enlaces útiles", { skip: SKIP }, async () => {
  const { status, body } = await get("/esta-ruta-no-existe-xyz");
  assert.equal(status, 404);
  assert.ok(body.toLowerCase().includes("ver ofertas"));
});
