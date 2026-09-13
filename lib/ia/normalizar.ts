/* ============================================================
   Normalización de texto en español (puro): minúsculas, sin tildes,
   sin puntuación, stopwords y plurales simples. La usan la
   validación anti-invención y el reordenamiento por vacante.
   ============================================================ */

export const STOPWORDS = new Set(
  (
    "a al algo algun alguna algunas alguno algunos ante antes asi aun aunque bajo bien cada como con contra cual cuales cuando " +
    "de del desde donde dos durante e el ella ellas ellos en entre era eran es esa esas ese eso esos esta estaba estan estar " +
    "estas este esto estos fue fueron ha hace hacia han hasta hay la las le les lo los mas me mi mis mucho muy nada ni no nos " +
    "nuestra nuestro o otra otras otro otros para pero poco por porque que quien se sea segun ser si sin sobre solo son su sus " +
    "tal tambien tan tanto te tener tiene tienen todo todos tu tus un una unas uno unos y ya yo " +
    "the and of for with in on to"
  ).split(" "),
);

/** Minúsculas, sin tildes, solo [a-z0-9%] y espacios simples. */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plural simple → singular: "clientes"→"cliente", "habilidades"→"habilidad", "luces"→"luz". */
export function singular(p: string): string {
  if (p.length <= 3 || /\d/.test(p)) return p;
  if (p.endsWith("ces") && p.length > 4) return p.slice(0, -3) + "z";
  if (p.endsWith("es") && p.length > 4 && /[lnrdj]es$/.test(p)) return p.slice(0, -2);
  if (p.endsWith("s") && !p.endsWith("ss")) return p.slice(0, -1);
  return p;
}

/** Palabras significativas normalizadas (sin stopwords, en singular, ≥ 3 letras o números). */
export function tokens(texto: string | null | undefined): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((p) => p && !STOPWORDS.has(p) && (p.length >= 3 || /\d/.test(p)))
    .map(singular);
}

/** Cifras de un texto normalizadas (sin separadores de miles ni decimales): "1.500.000" → "1500000". */
export function numerosEn(texto: string | null | undefined): string[] {
  const encontrados = (texto ?? "").match(/\d+(?:[.,]\d+)*/g) ?? [];
  return encontrados.map((n) => n.replace(/[.,]/g, "").replace(/^0+(?=\d)/, ""));
}

/** ¿Dos textos cortos (cargo, empresa, estudio) dicen lo mismo? Tolera mayúsculas, tildes y orden. */
export function coincideTexto(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return na === nb;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  if (ta.size === 0 || tb.size === 0) return false;
  const aEnB = [...ta].every((t) => tb.has(t));
  const bEnA = [...tb].every((t) => ta.has(t));
  return aEnB || bEnA;
}

/** Fracción de tokens de `texto` presentes en `referencia` (0..1). */
export function cobertura(texto: string, referencia: Set<string>): number {
  const t = [...new Set(tokens(texto))];
  if (t.length === 0) return 1;
  return t.filter((x) => referencia.has(x)).length / t.length;
}

/** Periodos iguales ignorando espacios, guiones y mayúsculas. "2021 – 2023" == "2021-2023". */
export function mismoPeriodo(a: string | null | undefined, b: string | null | undefined): boolean {
  const limpio = (s: string | null | undefined) => normalizar(s).replace(/\s/g, "");
  return limpio(a) === limpio(b);
}
