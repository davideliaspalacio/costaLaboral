/* ============================================================
   Diff por secciones para auditoría (puro): qué secciones cambiaron
   y cuántos elementos tenía cada una, sin copiar el texto.
   ============================================================ */

export function seccionesCambiadas(antes: object, despues: object): string[] {
  const a = antes as Record<string, unknown>;
  const d = despues as Record<string, unknown>;
  const claves = new Set([...Object.keys(a), ...Object.keys(d)]);
  return [...claves].filter((k) => JSON.stringify(a[k] ?? null) !== JSON.stringify(d[k] ?? null)).sort();
}

/** Tamaño de cada sección: nº de elementos (listas) o de caracteres (textos). */
export function conteosSecciones(c: object): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(c as Record<string, unknown>)) {
    if (Array.isArray(v)) out[k] = v.length;
    else if (typeof v === "string") out[k] = v.length;
  }
  return out;
}
