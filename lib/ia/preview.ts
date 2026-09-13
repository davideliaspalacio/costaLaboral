import type { ContenidoHV, ExperienciaHV } from "./tipos";

/* ============================================================
   Vista previa del plan gratis: el servidor solo envía el resumen y
   la primera experiencia; del resto manda conteos para dibujar
   bloques atenuados (el texto no llega al navegador). Puro.
   ============================================================ */

export type PreviewHV = {
  resumen: string;
  primeraExperiencia: ExperienciaHV | null;
  bloqueado: {
    habilidades: number;
    /** Nº de logros de cada experiencia oculta. */
    experiencias: number[];
    educacion: number;
    logros: number;
  };
};

export function previewHV(c: ContenidoHV): PreviewHV {
  const [primera, ...resto] = c.experiencia;
  return {
    resumen: c.resumen,
    primeraExperiencia: primera ?? null,
    bloqueado: {
      habilidades: c.habilidades.length,
      experiencias: resto.map((e) => Math.max(1, e.logros.length)),
      educacion: c.educacion.length,
      logros: c.logros.length,
    },
  };
}
