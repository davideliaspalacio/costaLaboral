import { describe, expect, test } from "vitest";
import { validarHV, validarLinkedIn } from "@/lib/ia/validacion";
import { hvRespaldo, linkedinRespaldo } from "@/lib/ia/respaldo";
import { EntradaHVSchema, limpiarEntrada } from "@/lib/ia/esquemas";
import { previewHV } from "@/lib/ia/preview";
import type { ContenidoHV, DatosFuenteHV, FuenteLinkedIn } from "@/lib/ia/tipos";

const fuente: DatosFuenteHV = {
  entrada: {
    cargoObjetivo: "Cajero",
    aniosExperiencia: 3,
    experiencia: [
      {
        cargo: "Cajero",
        empresa: "Supertienda La 40",
        periodo: "2021 – 2023",
        descripcion: "Atendía a los clientes. Manejaba la caja y cuadraba el inventario",
      },
      { cargo: "Auxiliar de bodega", empresa: "Distribuidora El Prado", periodo: "2019-2021", descripcion: "Organizaba la mercancía" },
    ],
    habilidades: ["Atención al cliente", "Manejo de caja"],
    educacion: ["Bachiller académico — I.E. San José (2018)"],
  },
  perfil: { ciudad: "Barranquilla", area: "Ventas", nivelEducativo: "Bachiller" },
};

const fiel: ContenidoHV = {
  resumen: "Cajero con 3 años de experiencia en ventas en Barranquilla, con buena atención al cliente y manejo de caja.",
  habilidades: ["Atención al cliente", "Manejo de caja", "Inventario"],
  experiencia: [
    {
      cargo: "cajero",
      empresa: "Supertienda la 40",
      periodo: "2021-2023",
      logros: ["Atención amable a los clientes.", "Manejo y cuadre de caja.", "Cuadre del inventario."],
    },
    { cargo: "Auxiliar de Bodega", empresa: "Distribuidora El Prado", periodo: "2019 - 2021", logros: ["Organización de la mercancía."] },
  ],
  educacion: ["Bachiller académico, I.E. San José (2018)"],
  logros: [],
};

const graves = (r: ReturnType<typeof validarHV>) => r.problemas.filter((p) => p.severidad === "grave").map((p) => p.codigo);

describe("validación anti-invención — hoja de vida", () => {
  test("una salida fiel pasa y restaura cargo/empresa/periodo exactos de la entrada", () => {
    const r = validarHV(fiel, fuente);
    expect(r.ok).toBe(true);
    expect(r.saneado.experiencia[0]).toMatchObject({ cargo: "Cajero", empresa: "Supertienda La 40", periodo: "2021 – 2023" });
    expect(r.problemas.every((p) => p.severidad === "leve")).toBe(true);
  });

  test("experiencia inventada: grave y se elimina", () => {
    const r = validarHV(
      { ...fiel, experiencia: [...fiel.experiencia, { cargo: "Gerente", empresa: "Éxito", periodo: "2024", logros: ["Dirigió la tienda."] }] },
      fuente,
    );
    expect(r.ok).toBe(false);
    expect(graves(r)).toContain("experiencia_inventada");
    expect(r.saneado.experiencia.map((e) => e.empresa)).toEqual(["Supertienda La 40", "Distribuidora El Prado"]);
  });

  test("periodo alterado: grave y se restaura", () => {
    const exp = [{ ...fiel.experiencia[0], periodo: "2020 – 2023" }, fiel.experiencia[1]];
    const r = validarHV({ ...fiel, experiencia: exp }, fuente);
    expect(graves(r)).toContain("periodo_alterado");
    expect(r.saneado.experiencia[0].periodo).toBe("2021 – 2023");
  });

  test("cifras y porcentajes que no aportó el candidato se quitan", () => {
    const exp = [
      { ...fiel.experiencia[0], logros: ["Atendía más de 200 clientes diarios.", "Redujo faltantes de caja en un 30%.", "Manejo de caja."] },
      fiel.experiencia[1],
    ];
    const r = validarHV({ ...fiel, resumen: "Cajero con 8 años de experiencia.", experiencia: exp }, fuente);
    expect(graves(r)).toEqual(expect.arrayContaining(["cifra_inventada"]));
    expect(r.saneado.experiencia[0].logros).toEqual(["Manejo de caja."]);
    expect(r.saneado.resumen).not.toMatch(/8/);
  });

  test("certificaciones y títulos nuevos: grave; educación inventada se restaura a la entrada", () => {
    const r = validarHV(
      {
        ...fiel,
        logros: ["Certificado en manipulación de alimentos.", "Puntual y responsable con la caja."],
        educacion: ["Bachiller académico, I.E. San José (2018)", "Técnico en ventas — SENA"],
      },
      fuente,
    );
    expect(graves(r)).toEqual(expect.arrayContaining(["credencial_inventada", "educacion_inventada"]));
    expect(r.saneado.logros).toEqual(["Puntual y responsable con la caja."]);
    expect(r.saneado.educacion).toEqual(fuente.entrada.educacion);
  });

  test("experiencia omitida por la IA se restaura desde la entrada (leve)", () => {
    const r = validarHV({ ...fiel, experiencia: [fiel.experiencia[0]] }, fuente);
    expect(r.ok).toBe(true);
    expect(r.problemas.map((p) => p.codigo)).toContain("experiencia_omitida");
    expect(r.saneado.experiencia[1]).toMatchObject({ empresa: "Distribuidora El Prado", logros: ["Organizaba la mercancía."] });
  });

  test("habilidad sin sustento se descarta (leve)", () => {
    const r = validarHV({ ...fiel, habilidades: ["Atención al cliente", "Inglés avanzado", "Python"] }, fuente);
    expect(r.saneado.habilidades).toEqual(["Atención al cliente"]);
    expect(r.problemas.some((p) => p.codigo === "habilidad_no_aportada" && p.severidad === "leve")).toBe(true);
  });

  test("los problemas no incluyen texto del candidato", () => {
    const r = validarHV({ ...fiel, resumen: "Cajero con 99 clientes." }, fuente);
    expect(JSON.stringify(r.problemas)).not.toMatch(/Cajero|Supertienda|clientes/);
  });

  test("el respaldo determinista siempre pasa su propia validación", () => {
    const r = validarHV(hvRespaldo(fuente), fuente);
    expect(r.ok).toBe(true);
    const sinDatos: DatosFuenteHV = {
      entrada: { cargoObjetivo: "Mesero", aniosExperiencia: 0, experiencia: [], habilidades: [], educacion: [] },
      perfil: { ciudad: "Cartagena", area: "Alimentos y cocina", nivelEducativo: "Bachiller" },
    };
    const r2 = validarHV(hvRespaldo(sinDatos), sinDatos);
    expect(r2.ok).toBe(true);
    expect(r2.saneado.experiencia).toEqual([]);
    expect(r2.saneado.logros).toEqual([]);
  });
});

describe("validación anti-invención — LinkedIn", () => {
  const fuenteLi: FuenteLinkedIn = {
    tipo: "hoja_de_vida",
    hojaDeVidaId: null,
    perfil: { ciudad: "Barranquilla", area: "Ventas", nivelEducativo: "Bachiller", cargoObjetivo: "Cajero", experienciaLibre: "" },
    entrada: fuente.entrada,
    contenidoHV: validarHV(fiel, fuente).saneado,
  };

  test("básico: quita campos avanzados", () => {
    const r = validarLinkedIn({ titular: "Cajero | Ventas", acerca: "Soy cajero.", habilidades: ["x"] }, fuenteLi, "basico");
    expect(r.ok).toBe(true);
    expect(r.saneado).toEqual({ titular: "Cajero | Ventas", acerca: "Soy cajero." });
  });

  test("avanzado: experiencia inventada y cifras se eliminan", () => {
    const r = validarLinkedIn(
      {
        titular: "Cajero con 3 años | Barranquilla",
        acerca: "Soy cajero con 10 años de experiencia.",
        titulares_alternativos: ["Cajero en Barranquilla", "Top 1% en ventas", "Atención al cliente"],
        habilidades: ["Atención al cliente", "Manejo de caja"],
        experiencias: [
          { cargo: "Cajero", empresa: "Supertienda La 40", descripcion: "Atención a clientes y manejo de caja." },
          { cargo: "Supervisor", empresa: "Olímpica", descripcion: "Supervisión." },
        ],
        palabras_clave: ["cajero", "retail"],
      },
      fuenteLi,
      "avanzado",
    );
    expect(r.ok).toBe(false);
    expect(r.saneado.acerca).not.toMatch(/10/);
    expect(r.saneado.titulares_alternativos).toEqual(["Cajero en Barranquilla", "Atención al cliente"]);
    expect(r.saneado.experiencias?.map((e) => e.empresa)).toEqual(["Supertienda La 40", "Distribuidora El Prado"]);
  });

  test("el respaldo de LinkedIn pasa su validación en ambos niveles", () => {
    expect(validarLinkedIn(linkedinRespaldo(fuenteLi, "basico"), fuenteLi, "basico").ok).toBe(true);
    expect(validarLinkedIn(linkedinRespaldo(fuenteLi, "avanzado"), fuenteLi, "avanzado").ok).toBe(true);
  });
});

describe("cuestionario y vista previa", () => {
  test("limpia filas vacías y valida con zod", () => {
    const e = limpiarEntrada({
      cargoObjetivo: "  Cajero ",
      aniosExperiencia: 2,
      experiencia: [{ cargo: "", empresa: "", periodo: "", descripcion: "" }],
      habilidades: ["", " Caja "],
      educacion: [],
    });
    expect(e.experiencia).toEqual([]);
    expect(e.habilidades).toEqual(["Caja"]);
    expect(EntradaHVSchema.safeParse(e).success).toBe(true);
    expect(EntradaHVSchema.safeParse({ ...e, cargoObjetivo: "" }).success).toBe(false);
    expect(
      EntradaHVSchema.safeParse({ ...e, experiencia: [{ cargo: "", empresa: "X", periodo: "", descripcion: "" }] }).success,
    ).toBe(false);
  });

  test("preview gratis solo expone resumen y primera experiencia", () => {
    const p = previewHV(validarHV(fiel, fuente).saneado);
    expect(p.resumen).toBe(fiel.resumen);
    expect(p.primeraExperiencia?.empresa).toBe("Supertienda La 40");
    expect(JSON.stringify(p)).not.toMatch(/Distribuidora|San José|Manejo de caja"/);
    expect(p.bloqueado.experiencias).toEqual([1]);
  });
});
