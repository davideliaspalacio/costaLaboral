import { describe, expect, test } from "vitest";
import { costoUsd, tarifaDe, totalesTokens } from "@/lib/ia/precios";
import { consumeCuota, inicioMesBogota, resumenCuota } from "@/lib/ia/cuota";

const M = 1_000_000;

describe("precios IA", () => {
  test("tarifas por modelo (USD/MTok)", () => {
    expect(tarifaDe("claude-opus-5")).toEqual({ input: 5, output: 25 });
    expect(tarifaDe("claude-opus-4-8")).toEqual({ input: 5, output: 25 });
    expect(tarifaDe("claude-sonnet-5")).toEqual({ input: 2, output: 10 });
    expect(tarifaDe("claude-haiku-4-5")).toEqual({ input: 1, output: 5 });
    expect(tarifaDe("claude-haiku-4-5-20251001")).toEqual({ input: 1, output: 5 });
    expect(tarifaDe("modelo-desconocido")).toBeNull();
  });

  test("input + output (thinking va dentro de output)", () => {
    expect(costoUsd("claude-opus-5", { input_tokens: M, output_tokens: M })).toBe(30);
    expect(costoUsd("claude-sonnet-5", { input_tokens: M, output_tokens: M })).toBe(12);
    expect(costoUsd("claude-opus-5", { input_tokens: 2000, output_tokens: 1000 })).toBeCloseTo(0.035, 6);
  });

  test("caché: escritura 5 min 1,25×, 1 h 2×, lectura 0,1×", () => {
    expect(costoUsd("claude-opus-5", { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: M })).toBe(6.25);
    expect(costoUsd("claude-opus-5", { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: M })).toBe(0.5);
    expect(
      costoUsd("claude-opus-5", {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 2 * M,
        cache_creation: { ephemeral_5m_input_tokens: M, ephemeral_1h_input_tokens: M },
      }),
    ).toBe(6.25 + 10);
  });

  test("iterations: cada intento con la tarifa de su modelo; el rechazado sin salida no se cobra", () => {
    const usage = {
      input_tokens: 1000,
      output_tokens: 500,
      iterations: [
        { type: "message", model: "claude-opus-5", input_tokens: 1000, output_tokens: 0 },
        { type: "fallback_message", model: "claude-haiku-4-5", input_tokens: 1000, output_tokens: 500 },
      ],
    };
    expect(costoUsd("claude-opus-5", usage)).toBeCloseTo(1000 * 1e-6 + 500 * 5e-6, 6);
  });

  test("iterations: un intento sin modelo usa el modelo pedido", () => {
    const usage = { input_tokens: 0, output_tokens: 0, iterations: [{ type: "message", input_tokens: M, output_tokens: 0 }] };
    expect(costoUsd("claude-sonnet-5", usage)).toBe(2);
  });

  test("negativa final sin salida = 0; modelo desconocido = 0", () => {
    expect(costoUsd("claude-opus-5", { input_tokens: 5000, output_tokens: 0 }, { stopReason: "refusal" })).toBe(0);
    expect(
      costoUsd(
        "claude-opus-5",
        { input_tokens: 5000, output_tokens: 0, iterations: [{ type: "message", model: "claude-opus-5", input_tokens: 5000, output_tokens: 0 }] },
        { stopReason: "refusal" },
      ),
    ).toBe(0);
    expect(costoUsd("otro", { input_tokens: M, output_tokens: M })).toBe(0);
    expect(costoUsd("claude-opus-5", null)).toBe(0);
  });

  test("totales de tokens suman todas las iteraciones", () => {
    const t = totalesTokens({
      input_tokens: 1,
      output_tokens: 1,
      iterations: [
        { type: "message", input_tokens: 10, output_tokens: 0, cache_read_input_tokens: 3 },
        { type: "fallback_message", input_tokens: 20, output_tokens: 7, cache_creation_input_tokens: 4 },
      ],
    });
    expect(t).toEqual({ input: 30, output: 7, cacheCreation: 4, cacheRead: 3 });
  });
});

describe("cuota mensual (hora Bogotá)", () => {
  test("el mes cambia a medianoche de Bogotá (05:00 UTC)", () => {
    expect(inicioMesBogota(new Date("2026-09-01T04:59:00Z")).toISOString()).toBe("2026-08-01T05:00:00.000Z");
    expect(inicioMesBogota(new Date("2026-09-01T05:00:00Z")).toISOString()).toBe("2026-09-01T05:00:00.000Z");
    expect(inicioMesBogota(new Date("2026-01-01T03:00:00Z")).toISOString()).toBe("2025-12-01T05:00:00.000Z");
  });

  test("error y sin_credenciales no consumen cuota", () => {
    expect(consumeCuota("ok")).toBe(true);
    expect(consumeCuota("validacion_fallida")).toBe(true);
    expect(consumeCuota("rechazo")).toBe(true);
    expect(consumeCuota("error")).toBe(false);
    expect(consumeCuota("sin_credenciales")).toBe(false);
    expect(resumenCuota(1, 1)).toEqual({ usadas: 1, limite: 1, restantes: 0, agotada: true });
    expect(resumenCuota(2, 5).restantes).toBe(3);
  });
});
