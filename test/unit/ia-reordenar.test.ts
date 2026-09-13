import { describe, expect, test } from "vitest";
import { coincidenciasConVacante, reordenarHV } from "@/lib/ia/reordenar";
import { normalizar, singular, tokens } from "@/lib/ia/normalizar";
import type { ContenidoHV } from "@/lib/ia/tipos";

const hv: ContenidoHV = {
  resumen: "Persona responsable con experiencia en bodega y caja.",
  habilidades: ["Excel", "Organización de bodega", "Manejo de caja", "Atención al cliente"],
  experiencia: [
    { cargo: "Auxiliar de bodega", empresa: "Distribuidora El Prado", periodo: "2019-2021", logros: ["Organizaba la mercancía.", "Cargue y descargue."] },
    { cargo: "Cajero", empresa: "Supertienda La 40", periodo: "2021-2023", logros: ["Cuadre del inventario.", "Atención a los clientes en caja."] },
  ],
  educacion: ["Bachiller"],
  logros: ["Buen trato con compañeros.", "Cero faltantes de caja."],
};

const vacante = {
  titulo: "Cajera para supermercado",
  requisitos: "Experiencia en manejo de caja y atención al cliente",
  descripcion: "Buscamos cajeros con buena actitud para atender clientes.",
  area: "Ventas",
};

/** Todas las cadenas de texto de la HV, ordenadas: el multiconjunto no debe cambiar. */
function textos(c: ContenidoHV): string[] {
  return [
    c.resumen,
    ...c.habilidades,
    ...c.experiencia.flatMap((e) => [e.cargo, e.empresa, e.periodo, ...e.logros]),
    ...c.educacion,
    ...c.logros,
  ].sort();
}

describe("normalización en español", () => {
  test("tildes, stopwords y plurales simples", () => {
    expect(normalizar("Atención al Cliente ¡Ñapa!")).toBe("atencion al cliente napa");
    expect(singular("clientes")).toBe("cliente");
    expect(singular("habilidades")).toBe("habilidad");
    expect(singular("luces")).toBe("luz");
    expect(tokens("Los cajeros de la tienda")).toEqual(["cajero", "tienda"]);
  });
});

describe("HV dinámica opción A — reordenar según vacante", () => {
  test("pone primero lo relevante para la vacante", () => {
    const r = reordenarHV(hv, vacante);
    expect(r.habilidades.slice(0, 2)).toEqual(["Manejo de caja", "Atención al cliente"]);
    expect(r.experiencia[0].cargo).toBe("Cajero");
    expect(r.experiencia[0].logros[0]).toBe("Atención a los clientes en caja.");
    expect(r.logros[0]).toBe("Cero faltantes de caja.");
  });

  test("nunca agrega, quita ni reescribe texto", () => {
    const r = reordenarHV(hv, vacante);
    expect(textos(r)).toEqual(textos(hv));
    expect(r.resumen).toBe(hv.resumen);
    expect(r.educacion).toEqual(hv.educacion);
    for (const e of r.experiencia) {
      const original = hv.experiencia.find((x) => x.empresa === e.empresa)!;
      expect({ ...e, logros: [...e.logros].sort() }).toEqual({ ...original, logros: [...original.logros].sort() });
    }
  });

  test("no muta la entrada y es estable si nada coincide", () => {
    const copia = JSON.parse(JSON.stringify(hv));
    const r = reordenarHV(hv, { titulo: "Piloto de avión", requisitos: "licencia aeronáutica" });
    expect(hv).toEqual(copia);
    expect(r).toEqual(hv);
  });

  test("explica las coincidencias", () => {
    expect(coincidenciasConVacante(hv, vacante)).toEqual(expect.arrayContaining(["caja", "cliente"]));
  });
});
