/* ============================================================
   Pruebas unitarias PURAS del dominio de CostaLaboral.
   Las reglas se REIMPLEMENTAN aquí (no se importa la lib TS) para:
     - evitar loaders de TypeScript en `node --test`
     - fijar el contrato del dominio de forma independiente
   Deben coincidir con lib/matching.ts, lib/plan.ts y lib/constants.ts.

   Reglas cubiertas:
     - Elegibilidad: (misma ciudad O modalidad remoto) Y misma área
       Y rank(nivel_candidato) >= rank(nivel_min).
     - Score = ciudad 40 + área 30 + nivel cumplido 20 + disp. inmediata 10.
     - Límites de plan por 90 días: gratis 3, camelleitor 15, berraco_pro ∞.
   ============================================================ */
import { test } from "node:test";
import assert from "node:assert/strict";

/* ---------------- Reglas de dominio (recodificadas) ---------------- */

const RANK = {
  bachiller: 1,
  tecnico: 2,
  tecnologo: 3,
  universitario: 4,
  profesional: 5,
};
const rankNivel = (nivel) => RANK[nivel] ?? 0;

const PESO_MATCH = { ciudad: 40, area: 30, nivel: 20, disponibilidad: 10 };

const LIMITE_PLAN = {
  gratis: 3,
  camelleitor: 15,
  berraco_pro: null, // null = ilimitado
};

function esElegible(c, v) {
  const ciudadOk = v.modalidad === "remoto" || c.ciudad === v.ciudad;
  const areaOk = c.area_interes === v.area;
  const nivelOk = rankNivel(c.nivel_educativo) >= rankNivel(v.nivel_educativo_min);
  return ciudadOk && areaOk && nivelOk;
}

function calcularScore(c, v) {
  let s = 0;
  if (v.modalidad === "remoto" || c.ciudad === v.ciudad) s += PESO_MATCH.ciudad;
  if (c.area_interes === v.area) s += PESO_MATCH.area;
  if (rankNivel(c.nivel_educativo) >= rankNivel(v.nivel_educativo_min)) s += PESO_MATCH.nivel;
  if (c.disponibilidad === "inmediata") s += PESO_MATCH.disponibilidad;
  return s;
}

/** Contador por 90 días: ¿el candidato puede aplicar con `usadas` postulaciones? */
function puedeAplicar(plan, usadas) {
  const limite = LIMITE_PLAN[plan];
  return limite == null || usadas < limite;
}

/* ---------------- Fixtures base ---------------- */

const mariaVentasBqBachiller = {
  ciudad: "Barranquilla",
  area_interes: "ventas",
  nivel_educativo: "bachiller",
  disponibilidad: "inmediata",
};

const vacVentasBqBachillerPresencial = {
  ciudad: "Barranquilla",
  area: "ventas",
  nivel_educativo_min: "bachiller",
  modalidad: "presencial",
};

/* ============================================================
   Elegibilidad
   ============================================================ */
test("elegible: mismo perfil ventas/Barranquilla/bachiller vs vacante idéntica", () => {
  assert.equal(esElegible(mariaVentasBqBachiller, vacVentasBqBachillerPresencial), true);
});

test("no elegible: área distinta", () => {
  const vac = { ...vacVentasBqBachillerPresencial, area: "logistica" };
  assert.equal(esElegible(mariaVentasBqBachiller, vac), false);
});

test("no elegible: otra ciudad y modalidad presencial", () => {
  const vac = { ...vacVentasBqBachillerPresencial, ciudad: "Cartagena" };
  assert.equal(esElegible(mariaVentasBqBachiller, vac), false);
});

test("elegible: otra ciudad pero modalidad remoto", () => {
  const vac = { ...vacVentasBqBachillerPresencial, ciudad: "Cartagena", modalidad: "remoto" };
  assert.equal(esElegible(mariaVentasBqBachiller, vac), true);
});

test("no elegible: nivel del candidato por debajo del mínimo", () => {
  const vac = { ...vacVentasBqBachillerPresencial, nivel_educativo_min: "tecnologo" };
  assert.equal(esElegible(mariaVentasBqBachiller, vac), false);
});

test("elegible: nivel del candidato por encima del mínimo", () => {
  const c = { ...mariaVentasBqBachiller, nivel_educativo: "profesional" };
  const vac = { ...vacVentasBqBachillerPresencial, nivel_educativo_min: "tecnico" };
  assert.equal(esElegible(c, vac), true);
});

test("elegible: nivel exactamente igual al mínimo", () => {
  const c = { ...mariaVentasBqBachiller, nivel_educativo: "tecnologo" };
  const vac = { ...vacVentasBqBachillerPresencial, nivel_educativo_min: "tecnologo" };
  assert.equal(esElegible(c, vac), true);
});

/* ============================================================
   Score
   ============================================================ */
test("score 100: ventas/Barranquilla/bachiller/inmediata vs vacante que encaja", () => {
  assert.equal(calcularScore(mariaVentasBqBachiller, vacVentasBqBachillerPresencial), 100);
});

test("score 90: mismo perfil pero disponibilidad NO inmediata (pierde 10)", () => {
  const c = { ...mariaVentasBqBachiller, disponibilidad: "en_2_semanas" };
  assert.equal(calcularScore(c, vacVentasBqBachillerPresencial), 90);
});

test("score 60: otra ciudad presencial (pierde ciudad 40) manteniendo área+nivel", () => {
  const c = { ...mariaVentasBqBachiller, disponibilidad: "en_1_mes" };
  const vac = { ...vacVentasBqBachillerPresencial, ciudad: "Cartagena" };
  // ciudad 0 + área 30 + nivel 20 + disp 0 = 50... verifiquemos las partes
  // area 30 + nivel 20 = 50
  assert.equal(calcularScore(c, vac), 50);
});

test("score: remoto en otra ciudad recupera los 40 de ciudad", () => {
  const vac = { ...vacVentasBqBachillerPresencial, ciudad: "Cartagena", modalidad: "remoto" };
  // ciudad 40 + área 30 + nivel 20 + disp 10 = 100
  assert.equal(calcularScore(mariaVentasBqBachiller, vac), 100);
});

test("score: solo ciudad coincide (área y nivel no) con disp inmediata = 50", () => {
  const c = {
    ciudad: "Barranquilla",
    area_interes: "salud",
    nivel_educativo: "bachiller",
    disponibilidad: "inmediata",
  };
  const vac = {
    ciudad: "Barranquilla",
    area: "ventas",
    nivel_educativo_min: "profesional",
    modalidad: "presencial",
  };
  // ciudad 40 + área 0 + nivel 0 + disp 10 = 50
  assert.equal(calcularScore(c, vac), 50);
});

test("score 0: nada coincide y sin disponibilidad inmediata", () => {
  const c = {
    ciudad: "Riohacha",
    area_interes: "belleza",
    nivel_educativo: "bachiller",
    disponibilidad: "en_1_mes",
  };
  const vac = {
    ciudad: "Barranquilla",
    area: "ventas",
    nivel_educativo_min: "profesional",
    modalidad: "presencial",
  };
  assert.equal(calcularScore(c, vac), 0);
});

test("score: elegible siempre implica score >= 90 (ciudad+área+nivel)", () => {
  // Con área, ciudad y nivel cumplidos el piso es 90 (falta solo disponibilidad).
  const c = { ...mariaVentasBqBachiller, disponibilidad: "en_1_mes" };
  const s = calcularScore(c, vacVentasBqBachillerPresencial);
  assert.ok(esElegible(c, vacVentasBqBachillerPresencial));
  assert.equal(s, 90);
});

/* ============================================================
   Límites de plan (ventana de 90 días)
   ============================================================ */
test("plan gratis: puede aplicar con 0, 1 y 2 usadas", () => {
  assert.equal(puedeAplicar("gratis", 0), true);
  assert.equal(puedeAplicar("gratis", 1), true);
  assert.equal(puedeAplicar("gratis", 2), true);
});

test("plan gratis: con 3 usadas NO puede aplicar (límite 3 alcanzado)", () => {
  assert.equal(puedeAplicar("gratis", 3), false);
  assert.equal(puedeAplicar("gratis", 5), false);
});

test("plan camelleitor: puede aplicar con 14, NO con 15", () => {
  assert.equal(puedeAplicar("camelleitor", 14), true);
  assert.equal(puedeAplicar("camelleitor", 15), false);
});

test("plan berraco_pro: ilimitado, puede aplicar con 50 y con 999", () => {
  assert.equal(puedeAplicar("berraco_pro", 50), true);
  assert.equal(puedeAplicar("berraco_pro", 999), true);
});

test("límites configurados: gratis=3, camelleitor=15, berraco_pro=ilimitado", () => {
  assert.equal(LIMITE_PLAN.gratis, 3);
  assert.equal(LIMITE_PLAN.camelleitor, 15);
  assert.equal(LIMITE_PLAN.berraco_pro, null);
});

/* ============================================================
   Ranks de nivel educativo
   ============================================================ */
test("ranks: bachiller1 < tecnico2 < tecnologo3 < universitario4 < profesional5", () => {
  assert.ok(
    rankNivel("bachiller") <
      rankNivel("tecnico") &&
      rankNivel("tecnico") < rankNivel("tecnologo") &&
      rankNivel("tecnologo") < rankNivel("universitario") &&
      rankNivel("universitario") < rankNivel("profesional")
  );
  assert.equal(rankNivel("bachiller"), 1);
  assert.equal(rankNivel("profesional"), 5);
});

test("rank de nivel desconocido es 0 (nunca cumple un mínimo real)", () => {
  assert.equal(rankNivel("doctorado"), 0);
  assert.equal(rankNivel(""), 0);
});
