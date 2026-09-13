import { describe, expect, test } from "vitest";
import { ALFABETO_RADICADO, anioBogota, esRadicadoValido, generarRadicado } from "@/lib/legal/radicado";
import { formatearFechaBogota, plazoDe, validarSolicitud } from "@/lib/legal/solicitudes";
import { validarEntorno } from "@/lib/env";

describe("radicado HD-AAAA-XXXXXX", () => {
  test("formato y determinismo con bytes dados", () => {
    const r = generarRadicado(new Date("2026-09-14T15:00:00Z"), [0, 1, 2, 3, 4, 5]);
    expect(r).toBe("HD-2026-234567");
    expect(esRadicadoValido(r)).toBe(true);
  });

  test("usa el año civil de Bogotá (31 dic 23:00 Bogotá = 1 ene UTC)", () => {
    const fecha = new Date("2027-01-01T04:00:00Z");
    expect(anioBogota(fecha)).toBe(2026);
    expect(generarRadicado(fecha, [9, 9, 9, 9, 9, 9]).startsWith("HD-2026-")).toBe(true);
  });

  test("bytes altos se mapean dentro del alfabeto sin caracteres ambiguos", () => {
    const r = generarRadicado(new Date(), [255, 254, 200, 128, 64, 31]);
    expect(esRadicadoValido(r)).toBe(true);
    expect(ALFABETO_RADICADO).not.toMatch(/[01OIL]/);
  });

  test("rechaza radicados mal formados y bytes insuficientes", () => {
    expect(esRadicadoValido("HD-26-ABCDEF")).toBe(false);
    expect(esRadicadoValido("HD-2026-ABCDE0")).toBe(false);
    expect(() => generarRadicado(new Date(), [1, 2, 3])).toThrow();
  });
});

describe("validación de solicitudes de titulares", () => {
  const base = {
    tipo: "supresion",
    nombre: "María Pérez",
    tipo_documento: "CC",
    numero_documento: "1234567890",
    email: " Maria@Demo.co ",
    telefono: "",
    descripcion: "Quiero que eliminen todos mis datos de la plataforma.",
    declaracion: "on",
  };

  test("acepta una solicitud válida y normaliza", () => {
    const r = validarSolicitud(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.email).toBe("maria@demo.co");
      expect(r.datos.telefono).toBeNull();
    }
  });

  test("exige la declaración de titularidad y reporta errores por campo", () => {
    const r = validarSolicitud({ ...base, declaracion: undefined, tipo: "otra", descripcion: "corta" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errores.declaracion).toBeTruthy();
      expect(r.errores.tipo).toBeTruthy();
      expect(r.errores.descripcion).toBeTruthy();
    }
  });

  test("plazos: consulta 10(+5), reclamo 15(+8)", () => {
    expect(plazoDe("prueba_autorizacion")).toEqual({ clase: "consulta", dias: 10, prorroga: 5 });
    expect(plazoDe("rectificacion")).toEqual({ clase: "reclamo", dias: 15, prorroga: 8 });
  });

  test("fecha en hora de Bogotá", () => {
    const txt = formatearFechaBogota(new Date("2026-09-29T04:59:59.999Z"));
    expect(txt).toContain("28");
    expect(txt).toContain("septiembre");
    expect(txt).toContain("2026");
  });
});

describe("validarEntorno", () => {
  const minimo = {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    SUPABASE_SERVICE_ROLE_KEY: "service",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  };

  test("desarrollo con lo mínimo: ok, advierte CRON_SECRET", () => {
    const r = validarEntorno(minimo, false);
    expect(r.ok).toBe(true);
    expect(r.advertencias.some((a) => a.startsWith("CRON_SECRET"))).toBe(true);
  });

  test("producción exige CRON_SECRET y nunca expone valores", () => {
    const r = validarEntorno({ ...minimo, SUPABASE_SERVICE_ROLE_KEY: "super-secreto-xyz" }, true);
    expect(r.ok).toBe(false);
    expect(r.errores).toContain("CRON_SECRET: falta");
    expect(JSON.stringify(r)).not.toContain("super-secreto-xyz");
  });

  test("opcionales inválidas son advertencias", () => {
    const r = validarEntorno({ ...minimo, PAGOS_PROVEEDOR: "paypal", TRM_COP_USD: "abc" }, false);
    expect(r.ok).toBe(true);
    expect(r.advertencias.some((a) => a.startsWith("PAGOS_PROVEEDOR"))).toBe(true);
    expect(r.advertencias.some((a) => a.startsWith("TRM_COP_USD"))).toBe(true);
  });

  test("URL inválida es error", () => {
    const r = validarEntorno({ ...minimo, NEXT_PUBLIC_SITE_URL: "no-es-url" }, false);
    expect(r.ok).toBe(false);
  });
});
