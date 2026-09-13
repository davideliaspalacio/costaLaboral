import { describe, expect, test } from "vitest";
import {
  KPIS,
  candidatosConVacanteRelevante,
  conPagoAprobado,
  construirKpi,
  contarVistas,
  empresasQueVuelven,
  evaluarSemaforo,
  formatearKpi,
  mediana,
  percentil,
  porcentaje,
  rangoFechas,
  resumirUsoIA,
  sumarRecomendacionesMostradas,
  tiempoPrimeraPostulacionHoras,
  vacantesConPostulacion,
  vacantesSinIncidentes,
  type FilaIA,
} from "@/lib/data/kpis";

describe("utilidades", () => {
  test("porcentaje, mediana y percentil", () => {
    expect(porcentaje(1, 4)).toBe(25);
    expect(porcentaje(3, 0)).toBeNull();
    expect(mediana([])).toBeNull();
    expect(mediana([5, 1, 3])).toBe(3);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
    expect(percentil([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 95)).toBe(100);
    expect(percentil([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 50)).toBe(50);
    expect(percentil([], 95)).toBeNull();
  });

  test("rango por defecto: últimos 30 días civiles de Bogotá", () => {
    // 2026-09-13 02:00Z = 2026-09-12 21:00 en Bogotá
    const r = rangoFechas({}, 30, new Date("2026-09-13T02:00:00Z"));
    expect(r.hastaStr).toBe("2026-09-12");
    expect(r.desdeStr).toBe("2026-08-14");
    expect(r.desde.toISOString()).toBe("2026-08-14T05:00:00.000Z");
    expect(r.hasta.toISOString()).toBe("2026-09-13T04:59:59.999Z");
  });

  test("rango explícito, invertido y con basura", () => {
    const r = rangoFechas({ desde: "2026-09-10", hasta: "2026-09-01" });
    expect([r.desdeStr, r.hastaStr]).toEqual(["2026-09-01", "2026-09-10"]);
    const b = rangoFechas({ desde: "x", hasta: "2026-09-10" }, 7);
    expect(b.desdeStr).toBe("2026-09-04");
  });
});

describe("semáforo", () => {
  test("mínimo", () => {
    const meta = { tipo: "min", valor: 60 } as const;
    expect(evaluarSemaforo(61, meta)).toBe("verde");
    expect(evaluarSemaforo(50, meta)).toBe("amarillo");
    expect(evaluarSemaforo(30, meta)).toBe("rojo");
    expect(evaluarSemaforo(null, meta)).toBe("sin_datos");
  });
  test("máximo (tiempo)", () => {
    const meta = { tipo: "max", valor: 48 } as const;
    expect(evaluarSemaforo(12, meta)).toBe("verde");
    expect(evaluarSemaforo(60, meta)).toBe("amarillo");
    expect(evaluarSemaforo(100, meta)).toBe("rojo");
  });
  test("rango", () => {
    const meta = { tipo: "rango", min: 2, max: 5 } as const;
    expect(evaluarSemaforo(3, meta)).toBe("verde");
    expect(evaluarSemaforo(8, meta)).toBe("verde");
    expect(evaluarSemaforo(1.2, meta)).toBe("amarillo");
    expect(evaluarSemaforo(0, meta)).toBe("rojo");
  });
});

describe("cálculo de KPIs", () => {
  test("candidatos con vacante relevante usa el score del motor de match", () => {
    const candidatos = [
      { ciudad: "Cartagena", area_interes: "ventas", nivel_educativo: "bachiller", disponibilidad: "inmediata" },
      { ciudad: "Santa Marta", area_interes: "salud", nivel_educativo: "bachiller", disponibilidad: "inmediata" },
    ];
    const vacantes = [
      { ciudad: "Cartagena", area: "ventas", nivel_educativo_min: "bachiller", modalidad: "presencial" },
    ];
    expect(candidatosConVacanteRelevante(candidatos, vacantes, 60)).toEqual({ num: 1, den: 2 });
    expect(candidatosConVacanteRelevante(candidatos, [], 60)).toEqual({ num: 0, den: 2 });
  });

  test("CTR de recomendación", () => {
    const vistas = [
      { meta: { fuente: "recomendacion" } },
      { meta: { fuente: "busqueda" } },
      { meta: {} },
      { meta: { fuente: "recomendacion" } },
    ];
    const mostradas = [{ meta: { cantidad: 10 } }, { meta: { cantidad: "15" } }, { meta: { cantidad: -3 } }, { meta: null }];
    expect(contarVistas(vistas, "recomendacion")).toBe(2);
    expect(contarVistas(vistas, "directo")).toBe(1);
    expect(contarVistas(vistas)).toBe(4);
    expect(sumarRecomendacionesMostradas(mostradas)).toBe(25);
  });

  test("vacantes con postulación y tiempo a la primera postulación", () => {
    const vacantes = [
      { id: "a", publicada_en: "2026-09-01T00:00:00Z" },
      { id: "b", publicada_en: "2026-09-01T00:00:00Z" },
      { id: "c", publicada_en: "2026-09-02T00:00:00Z" },
    ];
    const postulaciones = [
      { vacante_id: "a", creado_en: "2026-09-03T00:00:00Z" },
      { vacante_id: "a", creado_en: "2026-09-01T10:00:00Z" },
      { vacante_id: "c", creado_en: "2026-09-02T20:00:00Z" },
    ];
    expect(vacantesConPostulacion(vacantes.map((v) => v.id), postulaciones)).toEqual({ num: 2, den: 3 });
    const t = tiempoPrimeraPostulacionHoras(vacantes, postulaciones);
    expect(t.muestras).toBe(2);
    expect(t.mediana).toBe(15); // (10 + 20) / 2
  });

  test("empresas que vuelven entre 1 y 60 días", () => {
    const primera = { e1: "2026-07-01T00:00:00Z", e2: "2026-07-01T00:00:00Z", e3: "2026-07-01T00:00:00Z" };
    const actividades = [
      { empresa_id: "e1", en: "2026-07-01T05:00:00Z" }, // mismo día: no cuenta
      { empresa_id: "e1", en: "2026-07-15T00:00:00Z" }, // vuelve
      { empresa_id: "e2", en: "2026-09-15T00:00:00Z" }, // > 60 días
      { empresa_id: "zz", en: "2026-07-10T00:00:00Z" }, // fuera de la cohorte
    ];
    expect(empresasQueVuelven(primera, actividades)).toEqual({ num: 1, den: 3 });
  });

  test("pagos aprobados por grupo", () => {
    const pagos = [
      { propietario_id: "c1", concepto: "suscripcion", estado: "aprobado" },
      { propietario_id: "c2", concepto: "suscripcion", estado: "fallido" },
      { propietario_id: "c3", concepto: "vacante_destacada", estado: "aprobado" },
    ];
    expect(conPagoAprobado(["c1", "c2", "c3", "c1"], pagos, ["suscripcion", "renovacion"])).toEqual({ num: 1, den: 3 });
  });

  test("vacantes sin incidentes tras moderación", () => {
    const aprobaciones = [
      { vacante_id: "a", en: "2026-09-01T00:00:00Z" },
      { vacante_id: "b", en: "2026-09-01T00:00:00Z" },
      { vacante_id: "b", en: "2026-09-05T00:00:00Z" },
      { vacante_id: "c", en: "2026-09-03T00:00:00Z" },
    ];
    const incidentes = [
      { vacante_id: "a", en: "2026-09-02T00:00:00Z" }, // después: incidente
      { vacante_id: "c", en: "2026-09-01T00:00:00Z" }, // antes de aprobar: no cuenta
    ];
    expect(vacantesSinIncidentes(aprobaciones, incidentes)).toEqual({ num: 2, den: 3 });
  });

  test("construirKpi y formato", () => {
    const def = KPIS.find((k) => k.id === "postulacion_vista")!;
    const k = construirKpi(def, { num: 3, den: 20 });
    expect(k.valor).toBe(15);
    expect(k.semaforo).toBe("verde");
    const vacio = construirKpi(def, { num: 0, den: 0 });
    expect(vacio.semaforo).toBe("sin_datos");
    const wsp = construirKpi(KPIS.find((x) => x.id === "lectura_digest_wsp")!, { sinDatos: "requiere integración" });
    expect(wsp).toMatchObject({ valor: null, semaforo: "sin_datos", nota: "requiere integración" });
    const t = construirKpi(KPIS.find((x) => x.id === "tiempo_primera_postulacion")!, { valor: 30, muestras: 4 });
    expect(t.semaforo).toBe("verde");
    expect(formatearKpi(4.25, "pct")).toBe("4.3%");
    expect(formatearKpi(30, "horas")).toBe("30 h");
    expect(formatearKpi(null, "pct")).toBe("—");
  });

  test("hay 11 KPIs con definición visible", () => {
    expect(KPIS).toHaveLength(11);
    for (const k of KPIS) expect(k.definicion.length).toBeGreaterThan(20);
  });
});

describe("resumen de uso de IA", () => {
  const base: Omit<FilaIA, "feature" | "estado" | "costo_usd" | "creado_en"> = {
    actor_id: "u1",
    modelo: "claude-sonnet",
    modelo_servido: "claude-sonnet",
    plan: "camelleitor",
    input_tokens: 100,
    output_tokens: 50,
    cache_creation_tokens: 10,
    cache_read_tokens: 5,
    latencia_ms: 1000,
  };
  const filas: FilaIA[] = [
    { ...base, feature: "hv", estado: "ok", costo_usd: "0.010000", creado_en: "2026-09-12T15:00:00Z" },
    { ...base, feature: "hv", estado: "error", costo_usd: 0, creado_en: "2026-09-12T16:00:00Z", latencia_ms: 3000 },
    { ...base, feature: "linkedin", estado: "ok", costo_usd: 0.03, creado_en: "2026-09-11T15:00:00Z", actor_id: "u2", modelo_servido: "claude-haiku" },
    { ...base, feature: "hv", estado: "sin_credenciales", costo_usd: 0, creado_en: "2026-09-10T15:00:00Z", latencia_ms: null, plan: null, actor_id: null },
  ];

  test("totales, tasas, grupos y serie diaria", () => {
    const r = resumirUsoIA(filas, { trm: 4000, hasta: new Date("2026-09-12T20:00:00Z"), dias: 30 });
    expect(r.llamadas).toBe(4);
    expect(r.costoUsd).toBeCloseTo(0.04);
    expect(r.costoCop).toBeCloseTo(160);
    expect(r.costoPromedioUsd).toBeCloseTo(0.01);
    expect(r.tokens).toEqual({ input: 400, output: 200, cacheCreacion: 40, cacheLectura: 20 });
    expect(r.latenciaMediaMs).toBeCloseTo(5000 / 3);
    expect(r.latenciaP95Ms).toBe(3000);
    expect(r.tasas.error).toBe(25);
    expect(r.tasas.sinCredenciales).toBe(25);
    expect(r.tasas.rechazo).toBe(0);
    expect(r.porFeature[0]).toMatchObject({ clave: "linkedin", llamadas: 1 });
    expect(r.porModelo.find((m) => m.servido === "claude-haiku")).toMatchObject({ pedido: "claude-sonnet", llamadas: 1 });
    expect(r.porPlan.map((p) => p.clave).sort()).toEqual(["camelleitor", "sin_plan"]);
    expect(r.porDia).toHaveLength(30);
    expect(r.porDia.at(-1)).toEqual({ fecha: "2026-09-12", llamadas: 2, costoUsd: 0.01 });
    expect(r.topUsuarios.map((u) => u.actorId)).toEqual(["u2", "u1"]);
  });

  test("sin filas", () => {
    const r = resumirUsoIA([], { trm: 4000, hasta: new Date(), dias: 7 });
    expect(r.costoPromedioUsd).toBeNull();
    expect(r.latenciaP95Ms).toBeNull();
    expect(r.tasas.error).toBeNull();
    expect(r.porDia).toHaveLength(7);
  });
});
