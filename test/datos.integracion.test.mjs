/* ============================================================
   Pruebas de integración de DATOS contra Supabase LOCAL (esquema v2).
   Conecta con el service role key (lee process.env).

   Requiere (via `--env-file=.env.local`):
     - NEXT_PUBLIC_SUPABASE_URL
     - SUPABASE_SERVICE_ROLE_KEY
   Si faltan, la suite se SALTA.

   Las pruebas de esquema no dependen del seed. Las de volumen sí
   (`pnpm seed`) y se saltan si la base está vacía.
   ============================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SKIP = !URL || !KEY ? "faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" : false;

const db = SKIP ? null : createClient(URL, KEY, { auth: { persistSession: false } });

async function columnasExisten(tabla, columnas) {
  const { error } = await db.from(tabla).select(columnas.join(", ")).limit(1);
  assert.equal(error, null, `${tabla}: columnas faltantes (${columnas.join(", ")}): ${error?.message}`);
}

/* ---------------- Tablas ---------------- */
test("esquema v2: existen las tablas", { skip: SKIP }, async () => {
  const tablas = [
    "candidatos", "empresas", "vacantes", "postulaciones", "postulacion_historial", "reportes_vacante",
    "eventos", "staff", "hojas_de_vida", "linkedin_perfiles", "ia_uso",
    "consentimientos", "solicitudes_titular", "audit_log",
    "suscripciones", "pagos", "webhook_eventos",
  ];
  for (const tabla of tablas) {
    const { error } = await db.from(tabla).select("*", { head: true, count: "exact" });
    assert.equal(error, null, `tabla faltante o inaccesible: ${tabla} (${error?.message})`);
  }
});

/* ---------------- Columnas nuevas ---------------- */
test("esquema v2: columnas nuevas", { skip: SKIP }, async () => {
  await columnasExisten("vacantes", [
    "tipo", "modalidad", "disponibilidad_requerida", "estado", "motivo_cierre", "publicada_en",
    "cerrada_en", "destacada_hasta", "es_publica", "estado_moderacion",
  ]);
  await columnasExisten("empresas", ["verificacion", "verificada", "razon_social", "nit", "plan"]);
  await columnasExisten("candidatos", ["wsp_opt_in", "wsp_opt_in_en", "wsp_opt_out_en", "perfil_visible_empresas", "mayor_de_edad"]);
  await columnasExisten("postulaciones", ["estado", "match_detalle", "fuente", "estado_actualizado_en"]);
  await columnasExisten("solicitudes_titular", ["radicado", "tipo", "estado", "vence_en", "prorrogada"]);
});

test("esquema v2: columnas eliminadas ya no existen", { skip: SKIP }, async () => {
  for (const [tabla, col] of [["vacantes", "activa"], ["candidatos", "plan_vence"], ["postulaciones", "estado_seguimiento"]]) {
    const { error } = await db.from(tabla).select(col).limit(1);
    assert.ok(error, `${tabla}.${col} debería haberse eliminado`);
  }
});

/* ---------------- es_publica generada ---------------- */
test("vacantes.es_publica = estado publicada y moderación aprobada", { skip: SKIP }, async () => {
  const { data, error } = await db.from("vacantes").select("estado, estado_moderacion, es_publica").limit(500);
  assert.equal(error, null, error?.message);
  for (const v of data) {
    assert.equal(v.es_publica, v.estado === "publicada" && v.estado_moderacion === "aprobada");
  }
});

test("es_publica no se puede escribir (columna generada)", { skip: SKIP }, async (t) => {
  const { data } = await db.from("vacantes").select("id").limit(1);
  if (!data?.length) {
    t.skip("no hay vacantes");
    return;
  }
  const { error } = await db.from("vacantes").update({ es_publica: true }).eq("id", data[0].id);
  assert.ok(error, "escribir es_publica debería fallar");
});

/* ---------------- Suscripciones ---------------- */
test("suscripciones: una sola vigente por propietario", { skip: SKIP }, async () => {
  const propietario = crypto.randomUUID();
  const fila = {
    propietario_id: propietario, propietario_tipo: "candidato", plan: "test", proveedor: "test",
    estado: "active", periodo_inicio: new Date().toISOString(), periodo_fin: new Date(Date.now() + 864e5).toISOString(),
  };
  const a = await db.from("suscripciones").insert(fila).select("id").single();
  assert.equal(a.error, null, a.error?.message);
  try {
    const b = await db.from("suscripciones").insert(fila);
    assert.ok(b.error, "una segunda suscripción vigente debería violar uq_suscripcion_vigente");
  } finally {
    await db.from("suscripciones").delete().eq("propietario_id", propietario);
  }
});

/* ---------------- Append-only ---------------- */
test("audit_log es append-only (insert sí, update/delete no)", { skip: SKIP }, async () => {
  const marca = `test-${crypto.randomUUID()}`;
  const ins = await db
    .from("audit_log")
    .insert({ actor_tipo: "sistema", accion: "sistema.tarea_programada", entidad: "test", entidad_id: marca })
    .select("id")
    .single();
  assert.equal(ins.error, null, ins.error?.message);

  const upd = await db.from("audit_log").update({ entidad: "otro" }).eq("id", ins.data.id);
  assert.ok(upd.error, "UPDATE sobre audit_log debería estar denegado");
  const del = await db.from("audit_log").delete().eq("id", ins.data.id);
  assert.ok(del.error, "DELETE sobre audit_log debería estar denegado");
  // La fila de prueba queda (append-only) y la purga la retención a los 5 años.
});

test("consentimientos es append-only", { skip: SKIP }, async () => {
  const { error } = await db.from("consentimientos").update({ otorgado: false }).eq("titular_id", crypto.randomUUID());
  assert.ok(error, "UPDATE sobre consentimientos debería estar denegado");
});

/* ---------------- Navegador sin escrituras ---------------- */
test("anon no puede escribir ni leer tablas internas", { skip: SKIP || (!ANON && "falta NEXT_PUBLIC_SUPABASE_ANON_KEY") }, async () => {
  const anon = createClient(URL, ANON, { auth: { persistSession: false } });
  const ins = await anon.from("solicitudes_titular").insert({
    radicado: "HD-2000-ZZZZZZ", nombre: "x", tipo_documento: "CC", numero_documento: "1",
    email: "x@x.co", tipo: "consulta", descripcion: "x", vence_en: new Date().toISOString(),
  });
  assert.ok(ins.error, "anon no debería poder insertar solicitudes");
  const sel = await anon.from("audit_log").select("id").limit(1);
  assert.ok(sel.error, "anon no debería poder leer audit_log");
});

/* ---------------- Funciones de tareas programadas ---------------- */
test("RPC purgar_datos_retencion devuelve conteos", { skip: SKIP }, async () => {
  const { data, error } = await db.rpc("purgar_datos_retencion");
  assert.equal(error, null, error?.message);
  for (const k of ["rate_limits", "webhook_eventos", "eventos", "audit_log"]) {
    assert.equal(typeof data[k], "number", `falta el conteo ${k}`);
  }
});

/* ---------------- Datos sembrados ---------------- */
test("seed: hay empresas, vacantes y candidatos", { skip: SKIP }, async (t) => {
  const { count } = await db.from("vacantes").select("*", { count: "exact", head: true });
  if (!count) {
    t.skip("base sin datos: corre `pnpm seed`");
    return;
  }
  for (const tabla of ["empresas", "candidatos"]) {
    const r = await db.from(tabla).select("*", { count: "exact", head: true });
    assert.ok((r.count ?? 0) >= 1, `se esperaba al menos 1 fila en ${tabla}`);
  }
});
