import { describe, expect, test } from "vitest";
import { esDiaHabil, festivosColombia, sumarDiasHabiles, claseSolicitud } from "@/lib/legal/dias-habiles";

describe("festivos de Colombia", () => {
  test("2026: fijos, trasladados (Emiliani) y de Pascua", () => {
    const f = festivosColombia(2026);
    expect(f.has("2026-01-01")).toBe(true); // Año nuevo (fijo)
    expect(f.has("2026-01-12")).toBe(true); // Reyes: 6 ene (martes) → lunes 12
    expect(f.has("2026-04-02")).toBe(true); // Jueves Santo (Pascua 5 abr)
    expect(f.has("2026-04-03")).toBe(true); // Viernes Santo
    expect(f.has("2026-05-18")).toBe(true); // Ascensión → lunes
    expect(f.has("2026-07-20")).toBe(true); // Independencia (fijo)
    expect(f.has("2026-08-17")).toBe(true); // Asunción: 15 ago (sábado) → lunes 17
    expect(f.has("2026-11-16")).toBe(true); // Independencia de Cartagena: 11 nov (miércoles) → lunes 16
    expect(f.has("2026-12-08")).toBe(true);
    expect(f.size).toBe(18);
  });

  test("fines de semana y festivos no son hábiles", () => {
    expect(esDiaHabil(new Date("2026-09-14T15:00:00Z"))).toBe(true); // lunes
    expect(esDiaHabil(new Date("2026-09-13T15:00:00Z"))).toBe(false); // domingo
    expect(esDiaHabil(new Date("2026-07-20T15:00:00Z"))).toBe(false); // festivo
  });
});

describe("plazos Habeas Data", () => {
  test("10 días hábiles saltando fines de semana", () => {
    // Lunes 14 sep 2026 → cuenta desde el martes 15: 15-18 (4), 21-25 (9), lunes 28 (10) → fin del día en Bogotá
    const vence = sumarDiasHabiles(new Date("2026-09-14T15:00:00Z"), 10);
    expect(vence.toISOString()).toBe("2026-09-29T04:59:59.999Z");
  });

  test("salta festivos (puente de la Independencia de Cartagena)", () => {
    // Viernes 13 nov 2026 + 1 hábil: lunes 16 es festivo → martes 17
    const vence = sumarDiasHabiles(new Date("2026-11-13T15:00:00Z"), 1);
    expect(vence.toISOString()).toBe("2026-11-18T04:59:59.999Z");
  });

  test("usa el día civil de Bogotá, no el de UTC", () => {
    // 2026-09-15T03:00Z todavía es lunes 14 en Bogotá
    expect(sumarDiasHabiles(new Date("2026-09-15T03:00:00Z"), 1).toISOString()).toBe("2026-09-16T04:59:59.999Z");
  });

  test("clase de solicitud", () => {
    expect(claseSolicitud("consulta")).toBe("consulta");
    expect(claseSolicitud("supresion")).toBe("reclamo");
  });
});
