import { describe, expect, test } from "vitest";
import { employmentTypeDe, jobPostingJsonLd } from "@/lib/seo";
import {
  hrefOfertas,
  limpiarBusqueda,
  parsearFiltrosOfertas,
  rangoPagina,
  totalPaginas,
  OFERTAS_POR_PAGINA,
} from "@/lib/data/ofertas";
import { accesoFicha, estadoNoPublico } from "@/components/vacante/ficha";
import { validarReporte, DETALLE_REPORTE_MAX } from "@/components/vacante/reporte";
import type { Vacante } from "@/lib/types";

const AHORA = new Date("2026-09-13T12:00:00Z").getTime();
const FUTURO = "2026-10-01T00:00:00Z";
const PASADO = "2026-09-01T00:00:00Z";

describe("JSON-LD JobPosting", () => {
  test("employmentType según tipo de empleo", () => {
    expect(employmentTypeDe("tiempo_completo")).toBe("FULL_TIME");
    expect(employmentTypeDe("medio_tiempo")).toBe("PART_TIME");
    expect(employmentTypeDe("por_dias")).toBe("PER_DIEM");
    expect(employmentTypeDe("temporal")).toBe("TEMPORARY");
    expect(employmentTypeDe("practicas")).toBe("INTERN");
    expect(employmentTypeDe("desconocido")).toBe("FULL_TIME");
  });

  const base = {
    id: "v1",
    titulo: "Soporte técnico",
    descripcion: "Atender clientes",
    requisitos: "Bachiller",
    ciudad: "Barranquilla",
    tipo: "medio_tiempo",
    salario_min: 1_500_000,
    salario_max: null,
    publicada_en: "2026-09-10T00:00:00Z",
    creado_en: "2026-09-01T00:00:00Z",
    expira_en: FUTURO,
    empresaNombre: "Tienda La 72",
  };

  test("remoto: TELECOMMUTE + requisito de país; empresa real y datePosted = publicada_en", () => {
    const j = jobPostingJsonLd({ ...base, modalidad: "remoto" }) as Record<string, unknown>;
    expect(j.jobLocationType).toBe("TELECOMMUTE");
    expect(j.applicantLocationRequirements).toEqual({ "@type": "Country", name: "Colombia" });
    expect((j.hiringOrganization as { name: string }).name).toBe("Tienda La 72");
    expect(j.datePosted).toBe(new Date(base.publicada_en).toISOString());
    expect(j.validThrough).toBe(new Date(FUTURO).toISOString());
    expect(j.employmentType).toBe("PART_TIME");
  });

  test("presencial: sin TELECOMMUTE", () => {
    const j = jobPostingJsonLd({ ...base, modalidad: "presencial" }) as Record<string, unknown>;
    expect(j.jobLocationType).toBeUndefined();
    expect(j.applicantLocationRequirements).toBeUndefined();
  });
});

describe("filtros y paginación de /ofertas", () => {
  test("descarta valores fuera de catálogo y normaliza la página", () => {
    const f = parsearFiltrosOfertas({
      q: "  mesero ",
      ciudad: "Bogotá",
      area: "ventas",
      tipo: ["por_dias", "temporal"],
      modalidad: "medio_tiempo",
      page: "-3",
    });
    expect(f).toEqual({ q: "mesero", ciudad: "", area: "ventas", tipo: "por_dias", modalidad: "", page: 1 });
    expect(parsearFiltrosOfertas({ ciudad: "Santa Marta", page: "4" })).toMatchObject({ ciudad: "Santa Marta", page: 4 });
  });

  test("href conserva filtros, quita uno y agrega página", () => {
    const f = { q: "caja", ciudad: "Santa Marta", area: "", tipo: "temporal", modalidad: "remoto" };
    expect(hrefOfertas(f)).toBe("/ofertas?q=caja&ciudad=Santa+Marta&tipo=temporal&modalidad=remoto");
    expect(hrefOfertas(f, { tipo: "" })).toBe("/ofertas?q=caja&ciudad=Santa+Marta&modalidad=remoto");
    expect(hrefOfertas(f, { page: 3 })).toContain("&page=3");
    expect(hrefOfertas(f, { page: 1 })).not.toContain("page=");
    expect(hrefOfertas({ q: "", ciudad: "", area: "", tipo: "", modalidad: "" })).toBe("/ofertas");
  });

  test("la búsqueda no rompe el filtro or() de PostgREST", () => {
    expect(limpiarBusqueda("50%, (cajero).x")).toBe("50 cajero x");
  });

  test("rango y total de páginas", () => {
    expect(rangoPagina(1)).toEqual({ desde: 0, hasta: OFERTAS_POR_PAGINA - 1 });
    expect(rangoPagina(3)).toEqual({ desde: 2 * OFERTAS_POR_PAGINA, hasta: 3 * OFERTAS_POR_PAGINA - 1 });
    expect(totalPaginas(0)).toBe(1);
    expect(totalPaginas(OFERTAS_POR_PAGINA)).toBe(1);
    expect(totalPaginas(OFERTAS_POR_PAGINA + 1)).toBe(2);
  });
});

const vac = (over: Partial<Vacante> = {}) =>
  ({
    es_publica: true,
    expira_en: FUTURO,
    estado: "publicada",
    estado_moderacion: "aprobada",
    motivo_moderacion: null,
    motivo_cierre: null,
    ...over,
  }) as Vacante;

describe("acceso a la ficha /v/[id]", () => {
  const nadie = { esDuena: false, yaPostulado: false };

  test("pública: la ve cualquiera", () => {
    expect(accesoFicha(vac(), nadie, AHORA)).toBe("publica");
  });

  test("no pública: solo dueña o postulado; el resto 404", () => {
    const cerrada = vac({ es_publica: false, estado: "cerrada" });
    expect(accesoFicha(cerrada, nadie, AHORA)).toBe("oculta");
    expect(accesoFicha(cerrada, { esDuena: true, yaPostulado: false }, AHORA)).toBe("duena");
    expect(accesoFicha(cerrada, { esDuena: false, yaPostulado: true }, AHORA)).toBe("postulado");
  });

  test("expirada cuenta como no pública", () => {
    expect(accesoFicha(vac({ expira_en: PASADO }), nadie, AHORA)).toBe("oculta");
  });

  test("banners de estado para la empresa dueña", () => {
    expect(estadoNoPublico(vac(), AHORA)).toBeNull();
    expect(estadoNoPublico(vac({ es_publica: false, estado: "borrador" }), AHORA)?.titulo).toBe("Borrador");
    expect(estadoNoPublico(vac({ es_publica: false, estado_moderacion: "pendiente" }), AHORA)?.titulo).toBe("En revisión");
    const rechazada = estadoNoPublico(
      vac({ es_publica: false, estado_moderacion: "rechazada", motivo_moderacion: "Cobra al candidato" }),
      AHORA,
    );
    expect(rechazada?.detalle).toContain("Cobra al candidato");
    expect(estadoNoPublico(vac({ es_publica: false, estado_moderacion: "reportada" }), AHORA)?.titulo).toBe(
      "Oculta por reportes",
    );
    expect(estadoNoPublico(vac({ es_publica: false, estado: "pausada" }), AHORA)?.titulo).toBe("Pausada");
    expect(estadoNoPublico(vac({ es_publica: false, estado: "cerrada" }), AHORA)?.titulo).toBe("Cerrada");
    expect(
      estadoNoPublico(vac({ es_publica: false, estado: "cerrada", motivo_cierre: "expirada" }), AHORA)?.titulo,
    ).toBe("Expirada");
    expect(estadoNoPublico(vac({ expira_en: PASADO }), AHORA)?.titulo).toBe("Expirada");
  });
});

describe("validación de reportes", () => {
  test("motivo válido y detalle opcional", () => {
    expect(validarReporte("fraude")).toEqual({ ok: true, motivo: "fraude", detalle: null });
    expect(validarReporte("cobro_al_candidato", "  piden $50.000 ")).toEqual({
      ok: true,
      motivo: "cobro_al_candidato",
      detalle: "piden $50.000",
    });
  });

  test("rechaza motivo inválido, detalle largo y 'otro' sin detalle", () => {
    expect(validarReporte("spam")).toHaveProperty("error");
    expect(validarReporte("fraude", "x".repeat(DETALLE_REPORTE_MAX + 1))).toHaveProperty("error");
    expect(validarReporte("fraude", "x".repeat(DETALLE_REPORTE_MAX))).toHaveProperty("ok");
    expect(validarReporte("otro", "   ")).toHaveProperty("error");
    expect(validarReporte("fraude", 42)).toHaveProperty("error");
  });
});
