// Captura de pantallas de todos los flujos con Playwright.
// Requiere: dev server en localhost:3000 + `pnpm seed`.
// Uso: node scripts/capturas.mjs
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.SMOKE_BASE_URL || "http://localhost:3000";
const PASS = "costalaboral";
const DIR = "docs/capturas";
const VIEWPORT = { width: 1366, height: 900 };

await mkdir(DIR, { recursive: true });
const browser = await chromium.launch();
const shots = [];

async function shot(page, name, url, prep) {
  try {
    if (url) await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 30000 });
    if (prep) await prep(page);
    await page.waitForTimeout(500);
    const path = `${DIR}/${name}.png`;
    await page.screenshot({ path, fullPage: true });
    console.log("✓", name);
    shots.push(name);
  } catch (e) {
    console.log("✗", name, "-", e.message);
  }
}

async function login(context, email) {
  const page = await context.newPage();
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASS);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.endsWith("/login"), { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("networkidle").catch(() => {});
  return page;
}

// ---------- 1) PÚBLICO ----------
const pub = await browser.newContext({ viewport: VIEWPORT });
const p = await pub.newPage();
await shot(p, "01-landing", "/");
// Descubrir un id de vacante desde /ofertas
await p.goto(BASE + "/ofertas", { waitUntil: "networkidle" });
const vhref = await p.getAttribute('a[href^="/v/"]', "href").catch(() => null);
const VID = vhref ? vhref.replace("/v/", "") : null;
await shot(p, "02-ofertas", "/ofertas");
await shot(p, "03-ofertas-filtro", "/ofertas?area=ventas&ciudad=Barranquilla");
await shot(p, "04-planes", "/planes");
await shot(p, "05-registro-candidato", "/registro-candidato");
await shot(p, "06-registro-empresa", "/registro-empresa");
await shot(p, "07-login", "/login");
await shot(p, "08-privacidad", "/privacidad");
if (VID) await shot(p, "09-vacante-anonimo", `/v/${VID}`);
await pub.close();

// ---------- 2) CANDIDATO (maria, plan gratis) ----------
const c1 = await browser.newContext({ viewport: VIEWPORT });
const pc = await login(c1, "maria@demo.co");
await shot(pc, "10-mis-vacantes", "/mis-vacantes");
await shot(pc, "11-perfil", "/perfil");
await shot(pc, "12-hoja-de-vida-upsell", "/hoja-de-vida");
if (VID) await shot(pc, "13-vacante-candidato", `/v/${VID}`);
await c1.close();

// ---------- 3) EMPRESA (corralito) ----------
const c2 = await browser.newContext({ viewport: VIEWPORT });
const pe = await login(c2, "corralito@demo.co");
await shot(pe, "14-empresa-panel", "/empresa/panel");
await c2.close();

// ---------- 4) ADMIN + BERRACO PRO (gamerpg08) ----------
const c3 = await browser.newContext({ viewport: VIEWPORT });
const pa = await login(c3, "gamerpg08@gmail.com");
await shot(pa, "15-admin-resumen", "/admin");
await shot(pa, "16-admin-candidatos", "/admin/candidatos");
await shot(pa, "17-admin-empresas", "/admin/empresas");
await shot(pa, "18-admin-vacantes", "/admin/vacantes");
await shot(pa, "19-admin-actividad", "/admin/actividad");
await shot(pa, "20-admin-staff", "/admin/staff");
// Hoja de vida IA (plan de pago → panel + asistente)
await shot(pa, "21-hoja-de-vida-panel", "/hoja-de-vida");
await shot(pa, "22-hv-wizard", "/hoja-de-vida", async (page) => {
  await page.getByRole("button", { name: /crear nueva hoja/i }).click();
  await page.getByText(/PASO 1 DE 5/i).waitFor({ timeout: 8000 });
});
// Recorrer el asistente hasta generar
await shot(pa, "23-hv-resultado", null, async (page) => {
  const cargo = page.locator('input').first();
  await cargo.fill("Vendedor de mostrador").catch(() => {});
  await page.getByRole("button", { name: /siguiente/i }).click();
  await page.getByPlaceholder(/Ej: Cajero/i).fill("Vendedor de mostrador").catch(() => {});
  await page.getByPlaceholder(/Ej: Supertienda/i).fill("Tienda D1 Barranquilla").catch(() => {});
  await page.locator("textarea").first().fill("Atendía clientes, manejaba la caja y cumplía metas de venta.").catch(() => {});
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: /siguiente/i }).click().catch(() => {});
    await page.waitForTimeout(300);
  }
  await page.getByRole("button", { name: /generar/i }).click().catch(() => {});
  await page.getByText(/tu hoja de vida está lista/i).waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
});
await c3.close();

await browser.close();
console.log(`\n✅ ${shots.length} capturas en ${DIR}/`);
