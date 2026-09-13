import { describe, expect, test } from "vitest";
import {
  MOTIVOS_MODERACION,
  calcularDvNit,
  estadoModeracionInicial,
  moderacionTrasCambio,
  motivoModeracionTexto,
  normalizarTexto,
  revisarContenidoVacante,
  validarNit,
} from "@/lib/moderacion";

const revisar = (requisitos: string, descripcion = "Atención al cliente en punto de venta.") =>
  revisarContenidoVacante({ titulo: "Vendedor", descripcion, requisitos });

describe("normalizarTexto", () => {
  test("quita tildes, mayúsculas y espacios de más", () => {
    expect(normalizarTexto("  Señorita   ÁGIL  ")).toBe("senorita agil");
  });
});

describe("revisarContenidoVacante: detecta requisitos discriminatorios", () => {
  test.each([
    ["Solo mujeres, con experiencia", MOTIVOS_MODERACION.sexo],
    ["SÓLO HOMBRES", MOTIVOS_MODERACION.sexo],
    ["Sexo: femenino", MOTIVOS_MODERACION.sexo],
    ["Se busca señorita para caja", MOTIVOS_MODERACION.sexo],
    ["Preferiblemente hombre", MOTIVOS_MODERACION.sexo],
    ["Menor de 30 años", MOTIVOS_MODERACION.edad],
    ["Edad entre 18 y 25 años", MOTIVOS_MODERACION.edad],
    ["Máximo 35 años", MOTIVOS_MODERACION.edad],
    ["Edad: 20 a 30", MOTIVOS_MODERACION.edad],
    ["No mayor de 40", MOTIVOS_MODERACION.edad],
    ["Soltera, sin hijos", MOTIVOS_MODERACION.estadoCivil],
    ["Presentar prueba de embarazo negativa", MOTIVOS_MODERACION.estadoCivil],
    ["Que sea cristiano practicante", MOTIVOS_MODERACION.religion],
    ["Religión católica", MOTIVOS_MODERACION.religion],
    ["Heterosexual", MOTIVOS_MODERACION.orientacion],
    ["Tez blanca", MOTIVOS_MODERACION.raza],
    ["Excelente presencia y buena actitud", MOTIVOS_MODERACION.apariencia],
    ["Buena presencia", MOTIVOS_MODERACION.apariencia],
    ["Libreta militar al día", MOTIVOS_MODERACION.libreta],
  ])("%s", (texto, motivo) => {
    const r = revisar(texto);
    expect(r.sospechosa).toBe(true);
    expect(r.motivos).toContain(motivo);
  });
});

describe("revisarContenidoVacante: cobros al candidato", () => {
  test.each([
    "El candidato debe pagar el curso de manipulación de alimentos",
    "Consignar $50.000 para el kit de trabajo",
    "Costo de inscripción: 30 mil",
    "Uniforme a cargo del candidato",
    "Valor del curso $120.000",
    "Hacer consignación a Nequi para separar el cupo",
    "Exámenes médicos por cuenta del aspirante",
  ])("%s", (texto) => {
    const r = revisar(texto);
    expect(r.motivos).toContain(MOTIVOS_MODERACION.cobro);
  });
});

describe("revisarContenidoVacante: evita falsos positivos obvios", () => {
  test.each([
    ["Enfermera", "Atención a mujeres gestantes en programa de control prenatal", "Tarjeta profesional vigente"],
    ["Auxiliar de enfermería", "Atención a pacientes de sexo femenino en ginecología", "Técnico en enfermería"],
    ["Vendedor", "Pago quincenal y capacitación pagada por la empresa", "Mayor de 18 años"],
    ["Mesero", "Buen ambiente laboral", "No exigimos libreta militar. Experiencia mínima 1 año"],
    ["Cajero", "Empresa incluyente: sin distinción de raza, sexo, religión u orientación sexual", "Bachiller"],
    ["Auxiliar de bodega", "Inscripción gratuita, sin costo de inscripción", "Máximo 2 años de experiencia"],
    ["Supervisor", "Contactar a Cristian en recursos humanos", "Entre 10 y 15 años de experiencia en el sector"],
    ["Conductor", "Ruta en la ciudad", "Licencia C2. Mayores de 18 años. Edad mínima 18"],
  ])("%s", (titulo, descripcion, requisitos) => {
    const r = revisarContenidoVacante({ titulo, descripcion, requisitos });
    expect(r).toEqual({ sospechosa: false, motivos: [] });
  });

  test("varios motivos sin duplicados y en orden fijo", () => {
    const r = revisar("Solo mujeres, solo mujeres, menor de 25 años, buena presencia, pagar uniforme");
    expect(r.motivos).toEqual([
      MOTIVOS_MODERACION.sexo,
      MOTIVOS_MODERACION.edad,
      MOTIVOS_MODERACION.apariencia,
      MOTIVOS_MODERACION.cobro,
    ]);
  });

  test("tolera campos vacíos", () => {
    expect(revisarContenidoVacante({ titulo: "Mesero", descripcion: null, requisitos: undefined }).sospechosa).toBe(false);
  });
});

describe("estado de moderación", () => {
  test("inicial: solo verificada y limpia se aprueba", () => {
    expect(estadoModeracionInicial({ empresaVerificada: true, sospechosa: false })).toBe("aprobada");
    expect(estadoModeracionInicial({ empresaVerificada: true, sospechosa: true })).toBe("pendiente");
    expect(estadoModeracionInicial({ empresaVerificada: false, sospechosa: false })).toBe("pendiente");
    expect(estadoModeracionInicial({ empresaVerificada: false, sospechosa: true })).toBe("pendiente");
  });

  test("tras cambio", () => {
    expect(moderacionTrasCambio({ actual: "aprobada", empresaVerificada: true, sospechosa: false })).toBe("aprobada");
    expect(moderacionTrasCambio({ actual: "aprobada", empresaVerificada: false, sospechosa: false })).toBe("pendiente");
    expect(moderacionTrasCambio({ actual: "aprobada", empresaVerificada: true, sospechosa: true })).toBe("pendiente");
    expect(moderacionTrasCambio({ actual: "rechazada", empresaVerificada: true, sospechosa: false })).toBe("pendiente");
    expect(moderacionTrasCambio({ actual: "pendiente", empresaVerificada: true, sospechosa: false })).toBe("pendiente");
    expect(moderacionTrasCambio({ actual: "reportada", empresaVerificada: true, sospechosa: false })).toBe("reportada");
  });

  test("texto del motivo", () => {
    expect(motivoModeracionTexto({ sospechosa: false, motivos: [] }, true)).toBeNull();
    expect(motivoModeracionTexto({ sospechosa: false, motivos: [] }, false)).toMatch(/sin verificar/);
    expect(motivoModeracionTexto({ sospechosa: true, motivos: ["A", "B"] }, true)).toBe("A · B");
  });
});

describe("NIT (DIAN)", () => {
  test("dígito de verificación de NIT conocidos", () => {
    expect(calcularDvNit("890903938")).toBe(8); // Bancolombia
    expect(calcularDvNit("800197268")).toBe(4); // DIAN
    expect(calcularDvNit("860034313")).toBe(7); // Davivienda
  });

  test.each(["890.903.938-8", "890903938-8", "890 903 938 - 8", "8909039388"])("válido: %s", (nit) => {
    const r = validarNit(nit);
    expect(r).toEqual({ ok: true, nit: "890903938-8", base: "890903938", dv: 8 });
  });

  test.each([
    ["", /Escribe/],
    ["890903938-7", /no coincide/],
    ["ABC123", /solo lleva números/],
    ["12-3", /entre 6 y 15/],
    ["890903938-88", /dígito de verificación/],
    ["1-2-3", /más de un guion/],
    ["000000-0", /no es válido/],
  ])("inválido: %s", (nit, error) => {
    const r = validarNit(nit);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(error);
  });
});
