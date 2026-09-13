import { describe, expect, test } from "vitest";
import {
  BOM_UTF8,
  anonimizarCandidato,
  camposVacante,
  construirEmbudo,
  conteoPorEstado,
  destacadasRestantes,
  distribucionFuentes,
  distribucionScore,
  escaparCeldaCsv,
  etapaMaxima,
  evaluarDestacar,
  filtrarCandidatos,
  formatHoras,
  generarCsv,
  hayFiltros,
  horasHastaPrimeraPostulacion,
  inicioDiaColombia,
  mediana,
  normalizarSitioWeb,
  parseFiltrosPipeline,
  porcentajeConPostulacion,
  tasaConversion,
  validarVacanteInput,
} from "@/lib/data/empresa";
import { evaluarMatch } from "@/lib/matching";

const base = {
  titulo: "Mesero",
  area: "alimentos",
  ciudad: "Cartagena",
  tipo: "medio_tiempo",
  modalidad: "presencial",
  nivel_educativo_min: "bachiller",
  disponibilidad_requerida: "inmediata",
  salario_min: "1.423.500",
  salario_max: "1800000",
  tiene_contrato: "on",
  descripcion: "Atender mesas en restaurante del centro histórico.",
  requisitos: "Experiencia de 6 meses",
};

describe("validarVacanteInput", () => {
  test("válida y normaliza salario y contrato", () => {
    const r = validarVacanteInput(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.salario_min).toBe(1423500);
      expect(r.datos.salario_max).toBe(1800000);
      expect(r.datos.tiene_contrato).toBe(true);
      expect(r.datos.tipo).toBe("medio_tiempo");
    }
  });

  test("máximo menor que mínimo", () => {
    const r = validarVacanteInput({ ...base, salario_min: "2000000", salario_max: "1000000" });
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/máximo/) });
  });

  test.each([
    [{ titulo: "" }, /título/],
    [{ area: "astronauta" }, /área/],
    [{ ciudad: "Bogotá" }, /ciudad/],
    [{ descripcion: "corta" }, /20 caracteres/],
    [{ tipo: "freelance" }, /tipo de empleo/],
    [{ modalidad: "medio_tiempo" }, /modalidad/],
    [{ salario_min: "mil" }, /números/],
  ])("inválida %o", (cambio, error) => {
    const r = validarVacanteInput({ ...base, ...cambio });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(error);
  });

  test("borrador (no estricto) solo exige título y rellena por defecto", () => {
    const r = validarVacanteInput({ titulo: "Cocinero" }, false);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.datos.area).toBe("otro");
      expect(r.datos.modalidad).toBe("presencial");
      expect(r.datos.disponibilidad_requerida).toBe("en_1_mes");
      expect(r.datos.salario_min).toBeNull();
    }
  });

  test("camposVacante deja solo los editables", () => {
    const c = camposVacante({ titulo: "X", vistas: 3 } as never);
    expect(Object.keys(c)).toContain("titulo");
    expect(Object.keys(c)).not.toContain("vistas");
  });
});

describe("normalizarSitioWeb", () => {
  test.each([
    ["", null],
    ["lacostena.com", "https://lacostena.com/"],
    ["http://mi-negocio.co/menu", "http://mi-negocio.co/menu"],
  ])("%s", (entrada, esperado) => {
    expect(normalizarSitioWeb(entrada)).toEqual({ ok: true, url: esperado });
  });
  test.each(["no es url", "javascript:alert(1)", "localhost"])("inválido %s", (e) => {
    expect(normalizarSitioWeb(e).ok).toBe(false);
  });
});

describe("destacar", () => {
  test("requiere verificada y pública", () => {
    expect(evaluarDestacar({ empresaVerificada: true, esPublica: true })).toEqual({ ok: true });
    const r1 = evaluarDestacar({ empresaVerificada: false, esPublica: true });
    expect(r1.ok).toBe(false);
    const r2 = evaluarDestacar({ empresaVerificada: true, esPublica: false });
    expect(r2.ok === false && r2.motivo).toMatch(/publicada/);
  });
  test("destacadas restantes nunca negativas", () => {
    expect(destacadasRestantes(2, 1)).toBe(1);
    expect(destacadasRestantes(2, 5)).toBe(0);
  });
});

describe("filtros del pipeline", () => {
  const lista = [
    { score: 90, postulacion: { estado: "vista" as const }, candidato: { nivel_educativo: "tecnico", ciudad: "Cartagena" } },
    { score: 50, postulacion: { estado: "contactado" as const }, candidato: { nivel_educativo: "bachiller", ciudad: "Barranquilla" } },
  ];
  test("parse ignora valores inválidos", () => {
    const f = parseFiltrosPipeline({ score: "70", estado: "hackeado", nivel: "tecnico", ciudad: "Bogotá" });
    expect(f).toEqual({ scoreMin: 70, estado: null, nivel: "tecnico", ciudad: null });
    expect(hayFiltros(parseFiltrosPipeline({}))).toBe(false);
  });
  test("filtra por score, estado, nivel y ciudad", () => {
    expect(filtrarCandidatos(lista, parseFiltrosPipeline({ score: "60" }))).toHaveLength(1);
    expect(filtrarCandidatos(lista, parseFiltrosPipeline({ estado: "contactado" }))[0].score).toBe(50);
    expect(filtrarCandidatos(lista, parseFiltrosPipeline({ ciudad: "Cartagena", nivel: "bachiller" }))).toHaveLength(0);
  });
});

describe("CSV", () => {
  test.each([
    ["=HYPERLINK(\"x\")", "\"'=HYPERLINK(\"\"x\"\")\""],
    ["+57 300", "'+57 300"],
    ["-2", "'-2"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["hola, mundo", "\"hola, mundo\""],
    ["línea\nnueva", "\"línea\nnueva\""],
    [null, ""],
    [85, "85"],
  ])("escapa %s", (entrada, salida) => {
    expect(escaparCeldaCsv(entrada)).toBe(salida);
  });
  test("genera con BOM y CRLF", () => {
    const csv = generarCsv(["Nombre", "Score"], [["Ana", 90]]);
    expect(csv.startsWith(BOM_UTF8)).toBe(true);
    expect(BOM_UTF8.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toBe(`${BOM_UTF8}Nombre,Score\r\nAna,90\r\n`);
  });
});

describe("anonimizar", () => {
  test("no expone nombre ni contacto", () => {
    const c = {
      id: "c1",
      nombre: "María José Pérez",
      ciudad: "Cartagena",
      nivel_educativo: "tecnico" as const,
      area_interes: "ventas",
      disponibilidad: "inmediata" as const,
      wsp_opt_in: false,
      whatsapp: "+573001234567",
      email: "maria@x.co",
    };
    const d = evaluarMatch(c, { ciudad: "Cartagena", area: "ventas", nivel_educativo_min: "bachiller", modalidad: "presencial" });
    const a = anonimizarCandidato(c, d);
    expect(a.iniciales).toBe("MJ");
    expect(a.puedeInvitar).toBe(false);
    const json = JSON.stringify(a);
    expect(json).not.toContain("María");
    expect(json).not.toContain("3001234567");
    expect(json).not.toContain("maria@");
  });
});

describe("analítica pura", () => {
  test("conversión", () => {
    expect(tasaConversion(3, 0)).toBeNull();
    expect(tasaConversion(1, 3)).toBe(33.3);
  });

  test("embudo acumulado con etapa máxima del historial", () => {
    // descartado después de entrevista cuenta hasta entrevista
    const etapas = [
      etapaMaxima(["enviada"]),
      etapaMaxima(["descartado", "enviada", "vista", "en_entrevista"]),
      etapaMaxima(["contratado"]),
      etapaMaxima(["vista"]),
    ];
    const e = construirEmbudo(etapas);
    expect(e.map((p) => p.cantidad)).toEqual([4, 3, 2, 2, 1]);
    expect(e[0].porcentaje).toBe(100);
    expect(e[4].porcentaje).toBe(25);
    expect(construirEmbudo([]).every((p) => p.porcentaje === 0)).toBe(true);
  });

  test("conteo por estado", () => {
    const c = conteoPorEstado(["vista", "vista", "retirada"]);
    expect(c.find((x) => x.estado === "vista")?.cantidad).toBe(2);
    expect(c.find((x) => x.estado === "retirada")?.cantidad).toBe(1);
  });

  test("fuentes normaliza desconocidas a directo", () => {
    const r = distribucionFuentes(["whatsapp", "whatsapp", "whatsapp", null, "spam", "busqueda"]);
    expect(r[0]).toEqual({ clave: "whatsapp", cantidad: 3, porcentaje: 50 });
    expect(r.find((x) => x.clave === "directo")?.cantidad).toBe(2);
  });

  test("distribución de score por rangos", () => {
    const r = distribucionScore([0, 45, 60, 79, 80, 100]);
    expect(r.map((x) => x.cantidad)).toEqual([1, 1, 2, 2]);
  });

  test("mediana y horas hasta la primera postulación", () => {
    expect(mediana([])).toBeNull();
    expect(mediana([5, 1, 3])).toBe(3);
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
    const horas = horasHastaPrimeraPostulacion(
      [
        { id: "a", publicada_en: "2026-09-01T00:00:00Z" },
        { id: "b", publicada_en: "2026-09-01T00:00:00Z" },
        { id: "c", publicada_en: null },
      ],
      [
        { vacante_id: "a", creado_en: "2026-09-01T10:00:00Z" },
        { vacante_id: "a", creado_en: "2026-09-01T02:30:00Z" },
        { vacante_id: "c", creado_en: "2026-09-01T02:00:00Z" },
      ],
    );
    expect(horas).toEqual([2.5]);
    expect(formatHoras(null)).toBe("—");
    expect(formatHoras(0.2)).toBe("menos de 1 hora");
    expect(formatHoras(72)).toBe("3 días");
  });

  test("% de vacantes con postulación ignora borradores", () => {
    expect(porcentajeConPostulacion([])).toBeNull();
    expect(
      porcentajeConPostulacion([
        { publicada_en: "x", total_postulaciones: 2 },
        { publicada_en: "x", total_postulaciones: 0 },
        { publicada_en: null, total_postulaciones: 0 },
      ]),
    ).toBe(50);
  });

  test("inicio del día en Colombia", () => {
    expect(inicioDiaColombia(new Date("2026-09-13T03:00:00Z"))).toBe("2026-09-12T05:00:00.000Z");
    expect(inicioDiaColombia(new Date("2026-09-13T15:00:00Z"))).toBe("2026-09-13T05:00:00.000Z");
  });
});
