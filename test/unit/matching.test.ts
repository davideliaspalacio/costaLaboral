import { describe, expect, test } from "vitest";
import { evaluarMatch, calcularScore, esRecomendable } from "@/lib/matching";
import {
  planCandidatoEfectivo,
  planEmpresaEfectivo,
  suscripcionDaBeneficios,
  DIAS_GRACIA_PAST_DUE,
} from "@/lib/entitlements";
import { compararPortal, estaDestacada, esVisibleEnPortal } from "@/lib/vacante";
import type { Vacante } from "@/lib/types";

const maria = { ciudad: "Barranquilla", area_interes: "ventas", nivel_educativo: "bachiller", disponibilidad: "inmediata" };
const vacante = {
  ciudad: "Barranquilla",
  area: "ventas",
  nivel_educativo_min: "bachiller",
  modalidad: "presencial",
  disponibilidad_requerida: "inmediata",
};

const puntos = (d: ReturnType<typeof evaluarMatch>, f: string) => d.factores.find((x) => x.factor === f)!.puntos;

describe("match v2 (sección 4)", () => {
  test("todo coincide = 100 con 4 factores explicados", () => {
    const d = evaluarMatch(maria, vacante);
    expect(d.score).toBe(100);
    expect(d.factores.map((f) => f.factor)).toEqual(["ciudad", "area", "educacion", "disponibilidad"]);
    expect(d.version).toBeTruthy();
    for (const f of d.factores) expect(f.explicacion.length).toBeGreaterThan(0);
  });

  test("ciudad: exacta 40, distinta 0, remoto 40", () => {
    expect(puntos(evaluarMatch(maria, { ...vacante, ciudad: "Cartagena" }), "ciudad")).toBe(0);
    expect(puntos(evaluarMatch(maria, { ...vacante, ciudad: "Cartagena", modalidad: "remoto" }), "ciudad")).toBe(40);
    expect(puntos(evaluarMatch(maria, { ...vacante, ciudad: "Cartagena", modalidad: "hibrido" }), "ciudad")).toBe(0);
  });

  test("área: coincide 30, no coincide 0", () => {
    expect(puntos(evaluarMatch(maria, { ...vacante, area: "salud" }), "area")).toBe(0);
  });

  test("educación: cumple 20, a un nivel 10, más lejos 0", () => {
    expect(puntos(evaluarMatch({ ...maria, nivel_educativo: "profesional" }, vacante), "educacion")).toBe(20);
    expect(puntos(evaluarMatch(maria, { ...vacante, nivel_educativo_min: "tecnico" }), "educacion")).toBe(10);
    expect(puntos(evaluarMatch(maria, { ...vacante, nivel_educativo_min: "tecnologo" }), "educacion")).toBe(0);
    expect(puntos(evaluarMatch({ ...maria, nivel_educativo: "" }, vacante), "educacion")).toBe(0);
  });

  test("disponibilidad: a tiempo 10, un escalón tarde 5, más tarde 0", () => {
    expect(puntos(evaluarMatch({ ...maria, disponibilidad: "en_2_semanas" }, vacante), "disponibilidad")).toBe(5);
    expect(puntos(evaluarMatch({ ...maria, disponibilidad: "en_1_mes" }, vacante), "disponibilidad")).toBe(0);
    expect(
      puntos(evaluarMatch({ ...maria, disponibilidad: "en_1_mes" }, { ...vacante, disponibilidad_requerida: "en_1_mes" }), "disponibilidad"),
    ).toBe(10);
  });

  test("sin disponibilidad requerida no penaliza a nadie", () => {
    const { disponibilidad_requerida: _omit, ...sinDisp } = vacante;
    expect(calcularScore({ ...maria, disponibilidad: "en_1_mes" }, sinDisp)).toBe(100);
  });

  test("reproducible: mismo input, mismo detalle", () => {
    expect(evaluarMatch(maria, vacante)).toEqual(evaluarMatch(maria, vacante));
  });

  test("umbral de recomendación", () => {
    expect(esRecomendable({ score: 60 })).toBe(true);
    expect(esRecomendable({ score: 55 })).toBe(false);
  });
});

describe("plan efectivo desde la suscripción", () => {
  const ahora = Date.parse("2026-09-14T12:00:00Z");
  const dia = 86_400_000;
  const fin = (offsetDias: number) => new Date(ahora + offsetDias * dia).toISOString();

  test("sin suscripción = gratis", () => {
    expect(planCandidatoEfectivo(null, ahora)).toBe("gratis");
    expect(planEmpresaEfectivo(undefined, ahora)).toBe("gratis");
  });

  test("active vigente otorga el plan; vencida no", () => {
    expect(planCandidatoEfectivo({ plan: "berraco_pro", estado: "active", periodo_fin: fin(5) }, ahora)).toBe("berraco_pro");
    expect(planCandidatoEfectivo({ plan: "berraco_pro", estado: "active", periodo_fin: fin(-1) }, ahora)).toBe("gratis");
  });

  test("past_due conserva beneficios solo durante la gracia", () => {
    const s = (d: number) => ({ plan: "pro", estado: "past_due" as const, periodo_fin: fin(d) });
    expect(planEmpresaEfectivo(s(-(DIAS_GRACIA_PAST_DUE - 1)), ahora)).toBe("pro");
    expect(planEmpresaEfectivo(s(-(DIAS_GRACIA_PAST_DUE + 1)), ahora)).toBe("gratis");
  });

  test("canceled y expired nunca dan beneficios", () => {
    expect(suscripcionDaBeneficios({ plan: "pro", estado: "canceled", periodo_fin: fin(10) }, ahora)).toBe(false);
    expect(suscripcionDaBeneficios({ plan: "pro", estado: "expired", periodo_fin: fin(10) }, ahora)).toBe(false);
  });

  test("un plan de empresa no sirve como plan de candidato", () => {
    expect(planCandidatoEfectivo({ plan: "pro", estado: "active", periodo_fin: fin(5) }, ahora)).toBe("gratis");
  });
});

describe("visibilidad y orden del portal", () => {
  const ahora = Date.parse("2026-09-14T12:00:00Z");
  const base = { es_publica: true, expira_en: "2026-10-01T00:00:00Z", destacada_hasta: null, publicada_en: "2026-09-10T00:00:00Z", creado_en: "2026-09-10T00:00:00Z" } as Vacante;

  test("expirada o no pública no se ve", () => {
    expect(esVisibleEnPortal(base, ahora)).toBe(true);
    expect(esVisibleEnPortal({ ...base, expira_en: "2026-09-01T00:00:00Z" }, ahora)).toBe(false);
    expect(esVisibleEnPortal({ ...base, es_publica: false }, ahora)).toBe(false);
  });

  test("destacada vigente va primero aunque sea más vieja", () => {
    const vieja = { ...base, publicada_en: "2026-09-01T00:00:00Z", destacada_hasta: "2026-09-20T00:00:00Z" };
    const nueva = { ...base, publicada_en: "2026-09-13T00:00:00Z" };
    expect(estaDestacada(vieja, ahora)).toBe(true);
    expect([nueva, vieja].sort((a, b) => compararPortal(a, b, ahora))[0]).toBe(vieja);
  });

  test("destacada vencida no tiene prioridad", () => {
    expect(estaDestacada({ destacada_hasta: "2026-09-13T00:00:00Z" }, ahora)).toBe(false);
  });
});
