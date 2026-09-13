import { tokens } from "./normalizar";
import type { ContenidoHV } from "./tipos";

/* ============================================================
   Hoja de vida dinámica — opción A (sin IA). Reordena habilidades,
   experiencias y logros por relevancia frente a una vacante usando
   palabras clave normalizadas. NUNCA agrega, quita ni reescribe
   texto: solo cambia el orden (estable ante empates). Puro.
   ============================================================ */

export type VacanteRelevancia = {
  titulo: string;
  descripcion?: string | null;
  requisitos?: string | null;
  /** Etiqueta legible del área (ej. "Ventas"). */
  area?: string | null;
};

/** Peso de cada palabra según dónde aparece en la vacante. */
export function pesosVacante(v: VacanteRelevancia): Map<string, number> {
  const pesos = new Map<string, number>();
  const sumar = (texto: string | null | undefined, peso: number) => {
    for (const t of new Set(tokens(texto))) pesos.set(t, Math.max(pesos.get(t) ?? 0, peso));
  };
  sumar(v.descripcion, 1);
  sumar(v.area, 1);
  sumar(v.requisitos, 2);
  sumar(v.titulo, 3);
  return pesos;
}

export function relevancia(texto: string, pesos: Map<string, number>): number {
  let total = 0;
  for (const t of new Set(tokens(texto))) total += pesos.get(t) ?? 0;
  return total;
}

function ordenarEstable<T>(items: T[], puntaje: (item: T) => number): T[] {
  return items
    .map((item, i) => ({ item, i, p: puntaje(item) }))
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .map((x) => x.item);
}

export function reordenarHV(contenido: ContenidoHV, vacante: VacanteRelevancia): ContenidoHV {
  const pesos = pesosVacante(vacante);
  const puntuar = (t: string) => relevancia(t, pesos);

  const experiencia = ordenarEstable(
    contenido.experiencia.map((e) => ({ ...e, logros: ordenarEstable(e.logros, puntuar) })),
    (e) => puntuar([e.cargo, e.empresa, ...e.logros].join(" ")),
  );

  return {
    resumen: contenido.resumen,
    habilidades: ordenarEstable(contenido.habilidades, puntuar),
    experiencia,
    educacion: [...contenido.educacion],
    logros: ordenarEstable(contenido.logros, puntuar),
  };
}

/** Palabras de la vacante que aparecen en la HV (para explicar el orden en la UI). */
export function coincidenciasConVacante(contenido: ContenidoHV, vacante: VacanteRelevancia, max = 8): string[] {
  const pesos = pesosVacante(vacante);
  const hv = new Set(
    tokens(
      [
        ...contenido.habilidades,
        ...contenido.experiencia.flatMap((e) => [e.cargo, ...e.logros]),
        ...contenido.logros,
      ].join(" "),
    ),
  );
  return [...pesos.entries()]
    .filter(([t]) => hv.has(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([t]) => t);
}
