/* ============================================================
   Pruebas de integración de DATOS contra Supabase LOCAL.
   Conecta con el service role key (lee process.env) y valida el
   ESTADO real sembrado por `pnpm seed`.

   Requiere en el entorno (via `--env-file=.env.local`):
     - NEXT_PUBLIC_SUPABASE_URL
     - SUPABASE_SERVICE_ROLE_KEY
   Si faltan, la suite se SALTA (test.skip) en lugar de fallar.

   Precondición: haber corrido `pnpm seed` con el stack local arriba.
   ============================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FALTAN_ENVS = !URL || !KEY;

/* Reglas de dominio recodificadas (deben coincidir con lib/matching.ts). */
const RANK = { bachiller: 1, tecnico: 2, tecnologo: 3, universitario: 4, profesional: 5 };
const PESO = { ciudad: 40, area: 30, nivel: 20, disponibilidad: 10 };
const esElegible = (c, v) =>
  (v.modalidad === "remoto" || c.ciudad === v.ciudad) &&
  c.area_interes === v.area &&
  (RANK[c.nivel_educativo] ?? 0) >= (RANK[v.nivel_educativo_min] ?? 0);
const calcularScore = (c, v) => {
  let s = 0;
  if (v.modalidad === "remoto" || c.ciudad === v.ciudad) s += PESO.ciudad;
  if (c.area_interes === v.area) s += PESO.area;
  if ((RANK[c.nivel_educativo] ?? 0) >= (RANK[v.nivel_educativo_min] ?? 0)) s += PESO.nivel;
  if (c.disponibilidad === "inmediata") s += PESO.disponibilidad;
  return s;
};

const db = FALTAN_ENVS
  ? null
  : createClient(URL, KEY, { auth: { persistSession: false } });

const count = async (tabla) => {
  const { count: n, error } = await db.from(tabla).select("*", { count: "exact", head: true });
  assert.equal(error, null, `error contando ${tabla}: ${error?.message}`);
  return n;
};

/* ---------------- Esquema: tablas y columnas nuevas existen ---------------- */
test(
  "esquema: existen las tablas nuevas (staff, eventos, hojas_de_vida) y columnas de moderación",
  { skip: FALTAN_ENVS ? "faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" : false },
  async () => {
    // Si la tabla o columna no existe, PostgREST devuelve error → falla el assert.
    for (const tabla of ["candidatos", "empresas", "vacantes", "postulaciones", "eventos", "staff", "hojas_de_vida", "notificaciones_wsp"]) {
      const { error } = await db.from(tabla).select("*", { head: true, count: "exact" });
      assert.equal(error, null, `tabla faltante o inaccesible: ${tabla} (${error?.message})`);
    }
    // Columnas de moderación añadidas por la migración admin_ai_tracking.
    const { error: modErr } = await db.from("vacantes").select("estado_moderacion, motivo_moderacion").limit(1);
    assert.equal(modErr, null, `columnas de moderación faltantes en vacantes: ${modErr?.message}`);
    // Columna de tracking de plan del candidato.
    const { error: planErr } = await db.from("candidatos").select("plan, plan_vence, postulaciones_usadas").limit(1);
    assert.equal(planErr, null, `columnas de plan faltantes en candidatos: ${planErr?.message}`);
  }
);

/* ---------------- Volúmenes mínimos sembrados ---------------- */
test(
  "conteos: >=6 empresas, >=9 vacantes, >=9 candidatos",
  { skip: FALTAN_ENVS ? "faltan envs" : false },
  async () => {
    assert.ok((await count("empresas")) >= 6, "se esperaban >=6 empresas");
    assert.ok((await count("vacantes")) >= 9, "se esperaban >=9 vacantes");
    assert.ok((await count("candidatos")) >= 9, "se esperaban >=9 candidatos");
  }
);

test(
  "tracking: hay filas en eventos y >=1 en staff",
  { skip: FALTAN_ENVS ? "faltan envs" : false },
  async () => {
    assert.ok((await count("eventos")) >= 1, "se esperaba >=1 fila en eventos");
    assert.ok((await count("staff")) >= 1, "se esperaba >=1 fila en staff");
  }
);

/* ---------------- Perfil de la candidata demo ---------------- */
test(
  "maria@demo.co tiene área 'ventas' (perfil demo esperado)",
  { skip: FALTAN_ENVS ? "faltan envs" : false },
  async () => {
    const { data: maria, error } = await db
      .from("candidatos")
      .select("*")
      .eq("email", "maria@demo.co")
      .single();
    assert.equal(error, null, `no se encontró maria@demo.co: ${error?.message}`);
    assert.equal(maria.area_interes, "ventas");
    assert.equal(maria.ciudad, "Barranquilla");
    assert.equal(maria.nivel_educativo, "bachiller");
    assert.equal(maria.disponibilidad, "inmediata");
  }
);

/* ---------------- Recomputar matching contra el estado real ---------------- */
test(
  "matching de maria@demo.co: exactamente las vacantes de ventas de su ciudad, todas con score 100",
  { skip: FALTAN_ENVS ? "faltan envs" : false },
  async () => {
    const { data: maria, error: e1 } = await db
      .from("candidatos")
      .select("ciudad, area_interes, nivel_educativo, disponibilidad")
      .eq("email", "maria@demo.co")
      .single();
    assert.equal(e1, null, e1?.message);

    const { data: vacantes, error: e2 } = await db
      .from("vacantes")
      .select("id, titulo, ciudad, area, modalidad, nivel_educativo_min, activa")
      .eq("activa", true);
    assert.equal(e2, null, e2?.message);
    assert.ok(vacantes.length > 0, "no hay vacantes activas para recomputar el matching");

    // Vacantes elegibles según la regla de dominio.
    const elegibles = vacantes.filter((v) => esElegible(maria, v));
    assert.ok(elegibles.length >= 1, "maria debería tener al menos una vacante elegible");

    // Todas las elegibles de maría deben ser de área 'ventas' en su ciudad
    // (sus vacantes de ventas en la semilla son presencial/híbrido en Barranquilla).
    for (const v of elegibles) {
      assert.equal(v.area, "ventas", `vacante inesperada fuera de 'ventas': ${v.titulo}`);
      // ciudad coincide (o remoto, pero en la semilla las de ventas no son remotas)
      assert.ok(
        v.modalidad === "remoto" || v.ciudad === maria.ciudad,
        `vacante elegible en otra ciudad sin ser remota: ${v.titulo}`
      );
    }

    // El conjunto elegible debe ser EXACTAMENTE las vacantes de ventas de su ciudad.
    const ventasEnSuCiudad = vacantes.filter(
      (v) => v.area === "ventas" && (v.modalidad === "remoto" || v.ciudad === maria.ciudad)
    );
    const idsElegibles = new Set(elegibles.map((v) => v.id));
    const idsVentasCiudad = new Set(ventasEnSuCiudad.map((v) => v.id));
    assert.deepEqual(
      [...idsElegibles].sort(),
      [...idsVentasCiudad].sort(),
      "el conjunto elegible no coincide con las vacantes de ventas de su ciudad"
    );

    // Todas puntúan 100 (ciudad 40 + área 30 + nivel 20 + disp inmediata 10).
    for (const v of elegibles) {
      assert.equal(calcularScore(maria, v), 100, `score != 100 en ${v.titulo}`);
    }
  }
);
