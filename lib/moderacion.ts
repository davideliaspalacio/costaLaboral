/* ============================================================
   Moderación de vacantes (secciones 5 y 8) — lógica pura.

   Criterio: reglas ACOTADAS (frases típicas de avisos), no palabras
   sueltas. Una coincidencia no rechaza nada: manda la vacante a
   revisión humana (`pendiente`). Por eso preferimos pocos falsos
   negativos obvios y evitamos falsos positivos frecuentes:
     * Se normaliza (minúsculas, sin tildes, espacios simples).
     * Frases de inclusión ("sin distinción de raza", "no exigimos
       libreta militar", "inscripción gratuita") se ignoran mediante
       un contexto previo de negación.
     * Contextos de atención a población ("atención a mujeres
       gestantes", "pacientes de sexo femenino") no cuentan como
       requisito del candidato.
     * "Mayor de 18 años" es legal (mayoría de edad); los límites de
       edad sospechosos son los que excluyen por encima de 18.

   Marco: Constitución art. 13 y 53; Ley 1482 de 2011 (actos de
   discriminación); Ley 1780 de 2016 art. 20 (no exigir libreta
   militar para contratar); Decreto 1072 de 2015 y Ley 1636 de 2013
   (el servicio público de empleo es gratuito para el trabajador:
   no se le puede cobrar inscripción, cursos, uniformes, etc.).
   ============================================================ */

export type ResultadoModeracion = { sospechosa: boolean; motivos: string[] };

export type EstadoModeracionVacante = "aprobada" | "pendiente" | "rechazada" | "reportada";

export const MOTIVOS_MODERACION = {
  sexo: "Requisito de sexo o género excluyente",
  edad: "Límite de edad",
  estadoCivil: "Estado civil, hijos o embarazo",
  religion: "Religión",
  orientacion: "Orientación sexual",
  raza: "Raza, color de piel o etnia",
  apariencia: "Apariencia física o «buena presencia»",
  libreta: "Exige libreta militar (Ley 1780 de 2016)",
  cobro: "Cobro al candidato (el servicio de empleo es gratuito para el trabajador)",
} as const;

export type CategoriaModeracion = keyof typeof MOTIVOS_MODERACION;

/** Minúsculas, sin tildes ni diéresis, espacios simples. Conserva la ñ como n. */
export function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type Regla = {
  categoria: CategoriaModeracion;
  patron: RegExp;
  /** Si el texto anterior a la coincidencia (≈40 caracteres) cumple esto, se ignora. */
  excluirSiAntes?: RegExp;
  /** Validación adicional sobre la coincidencia (p. ej. edad > 18). */
  aceptar?: (m: RegExpExecArray, texto: string) => boolean;
};

/** Frases de inclusión o negación que anulan una coincidencia discriminatoria. */
const NEGACION_INCLUSION =
  /(sin\s+(distincion|discriminacion|importar)|no\s+(discrimina\w*|importa|exig\w+|requer\w+|pedi\w+|pide\w*|se\s+exige|se\s+requiere|se\s+pide|es\s+necesari\w)|independiente(mente)?\s+de|igualdad|sin\s+exigir|no\s+tener\s+en\s+cuenta)[^.;\n]*$/;

/** Atención a población (salud, servicios): no es un requisito del candidato. */
const CONTEXTO_POBLACION =
  /(atencion\s+(a|de)|atender\s+a|pacientes|usuari[oa]s|clientes|poblacion|dirigid[oa]\s+a|programa\s+de|servicio\s+(a|para))[^.;\n]{0,25}$/;

/** Cobros: "sin costo", "gratis", "no cobramos" antes de la frase. */
const NEGACION_COBRO = /(sin|no\s+(tiene|hay|cobra\w*|se\s+cobra)|ningun|cero|gratuit\w*|gratis)[^.;\n]{0,15}$/;

const EDAD_MAYORIA = 18;
const noEsExperiencia = (m: RegExpExecArray, t: string) =>
  !/^\s*(de\s+)?(experiencia|trayectoria|antiguedad)/.test(t.slice(m.index + m[0].length));
const edadSospechosa = (n: string | undefined) => n != null && Number(n) > EDAD_MAYORIA && Number(n) < 100;

const REGLAS: Regla[] = [
  /* ---- Sexo / género ---- */
  {
    categoria: "sexo",
    patron:
      /\b(solo|solamente|unicamente|exclusivamente)\s+(para\s+)?(mujeres|hombres|damas|caballeros|senoritas|varones|chicas|chicos|sexo\s+(femenino|masculino)|genero\s+(femenino|masculino))\b/g,
    excluirSiAntes: CONTEXTO_POBLACION,
  },
  {
    categoria: "sexo",
    patron: /\b(sexo|genero)\s*:?\s*(femenino|masculino)\b/g,
    excluirSiAntes: CONTEXTO_POBLACION,
  },
  {
    categoria: "sexo",
    patron:
      /\b(se\s+busca|buscamos|se\s+requiere|requerimos|necesitamos|se\s+necesita|preferible(mente)?|de\s+preferencia)\s+(una\s+|un\s+)?(mujer|hombre|dama|caballero|senorita|varon|persona\s+de\s+sexo\s+(femenino|masculino))\b/g,
  },

  /* ---- Edad ---- */
  {
    categoria: "edad",
    // "menor de 30 (años)", "no mayor de 35", "no más de 40 años"
    patron: /\b(?:menor(?:es)?|no\s+mayor(?:es)?|no\s+mas)\s+de\s+(\d{2})(?:\s+anos)?\b/g,
    aceptar: (m, t) => edadSospechosa(m[1]) && noEsExperiencia(m, t),
  },
  {
    categoria: "edad",
    // "entre 18 y 25 años"
    patron: /\bentre\s+(\d{2})\s+y\s+(\d{2})\s+anos\b/g,
    aceptar: (m, t) => noEsExperiencia(m, t),
  },
  {
    categoria: "edad",
    // "máximo 35 años", "edad máxima 40", "hasta 30 años de edad"
    patron: /\b(edad\s+)?(maxim[oa]|limite|hasta)\s+(de\s+)?(\d{2})\s+anos\b/g,
    aceptar: (m, t) => edadSospechosa(m[4]) && noEsExperiencia(m, t),
  },
  {
    categoria: "edad",
    // "edad: 20 a 30", "edad entre 25", "edad máxima 40"
    patron: /\bedad\s*(:|entre|maxima|limite|de|hasta|requerida)?\s*(de\s+)?(\d{2})\b/g,
    aceptar: (m) => edadSospechosa(m[3]),
  },
  {
    categoria: "edad",
    // "25 años de edad"
    patron: /\b(\d{2})\s+anos\s+de\s+edad\b/g,
    aceptar: (m) => edadSospechosa(m[1]),
  },

  /* ---- Estado civil, hijos, embarazo ---- */
  {
    categoria: "estadoCivil",
    patron: /\b(estado\s+civil|solter[oa]s?|casad[oa]s?|en\s+union\s+libre)\b/g,
  },
  { categoria: "estadoCivil", patron: /\bsin\s+hij[oa]s\b/g },
  {
    categoria: "estadoCivil",
    patron: /\b(no\s+(estar\s+)?embarazada|sin\s+embarazo|(prueba|test|examen)\s+de\s+embarazo)\b/g,
  },

  /* ---- Religión ---- */
  {
    categoria: "religion",
    // "Cristian" es un nombre común: las confesiones solo cuentan como requisito ("ser cristiano").
    patron:
      /\b(religion|(ser|que\s+sea|sea|preferiblemente|persona|solo|solamente)\s+(cristian[oa]s?|catolic[oa]s?|evangelic[oa]s?|creyentes?|adventistas?|testigos?\s+de\s+jehova)|practicante\s+de\s+la\s+fe|asistir\s+a\s+(la\s+)?iglesia)\b/g,
  },

  /* ---- Orientación sexual ---- */
  {
    categoria: "orientacion",
    patron: /\b(orientacion\s+sexual|heterosexual(es)?|homosexual(es)?|no\s+(gays?|lesbianas?|lgbt\w*))\b/g,
  },

  /* ---- Raza / color / etnia ---- */
  {
    categoria: "raza",
    patron:
      /\b(raza|etnia|color\s+de\s+piel|(tez|piel)\s+(blanca|clara|morena|oscura|trigue\w+)|blanc[oa]s?\s+(unicamente|solamente)|afrodescendientes?\s+no|no\s+afrodescendientes?|no\s+indigenas?)\b/g,
  },

  /* ---- Apariencia física ---- */
  {
    categoria: "apariencia",
    patron:
      /\b((buena|excelente|agradable|impecable)\s+(presencia|apariencia)|presencia\s+(agradable|fisica)|apariencia\s+fisica|fisicamente\s+atractiv[oa]|atractiv[oa]\s+fisicamente|contextura\s+delgada|delgad[oa]s?|sin\s+tatuajes|estatura\s+minima|talla\s+(s|m|6|8|10)\b)/g,
  },

  /* ---- Libreta militar ---- */
  {
    categoria: "libreta",
    patron: /\b(libreta|tarjeta)\s+militar\b/g,
  },

  /* ---- Cobros al candidato ---- */
  {
    categoria: "cobro",
    // "debe pagar el curso", "pagar inscripción", "consignar $50.000 para el kit"
    patron:
      /\b(pagar|cancelar|consignar|abonar|costear|transferir|aportar)\b[^.;\n]{0,40}?(\b(curso|capacitacion|inscripcion|examen(es)?(\s+medicos?)?|uniforme|dotacion|carnet|kit|afiliacion|materiales?|estudio\s+de\s+seguridad|papeleria|induccion|certificado|registro|entrevista)\b|\$\s?\d|\b\d+\s*(mil|pesos)\b)/g,
    excluirSiAntes: NEGACION_COBRO,
  },
  {
    categoria: "cobro",
    // "costo de inscripción", "valor del curso", "cuota de afiliación"
    patron:
      /\b(costo|valor|cuota|precio|tarifa)\s+(de\s+(la\s+|el\s+)?|del\s+)(inscripcion|curso|capacitacion|uniforme|kit|examen|induccion|afiliacion|registro|carnet|dotacion|estudio\s+de\s+seguridad|entrevista)/g,
    excluirSiAntes: NEGACION_COBRO,
  },
  {
    categoria: "cobro",
    // "uniforme a cargo del candidato", "exámenes por cuenta del aspirante"
    patron:
      /\b(uniforme|dotacion|kit|examen(es)?(\s+medicos?)?|curso|capacitacion|carnet|inscripcion)[^.;\n]{0,20}\b(a|por)\s+(cargo|cuenta)\s+(del?\s+|de\s+la\s+)?(candidat[oa]|aspirante|trabajador[a]?|emplead[oa]|postulante|interesad[oa])/g,
  },
  {
    categoria: "cobro",
    // "consignación a Nequi", "consignar a la cuenta"
    patron: /\bconsign(ar|e|a|acion)\b[^.;\n]{0,30}\b(nequi|daviplata|bancolombia|cuenta|valor|\$)/g,
    excluirSiAntes: NEGACION_COBRO,
  },
];

function aplicaRegla(regla: Regla, texto: string): boolean {
  const patron = new RegExp(regla.patron.source, "g");
  let m: RegExpExecArray | null;
  while ((m = patron.exec(texto)) !== null) {
    const antes = texto.slice(Math.max(0, m.index - 40), m.index);
    // Las frases de inclusión suelen enumerar ("sin distinción de raza, sexo, religión u orientación sexual").
    const antesLargo = texto.slice(Math.max(0, m.index - 90), m.index);
    const negada =
      regla.categoria === "cobro"
        ? (regla.excluirSiAntes?.test(antes) ?? false)
        : NEGACION_INCLUSION.test(antesLargo) || (regla.excluirSiAntes?.test(antes) ?? false);
    const valida = regla.aceptar ? regla.aceptar(m, texto) : true;
    if (!negada && valida) return true;
    if (m[0].length === 0) patron.lastIndex++;
  }
  return false;
}

/** Revisa título, descripción y requisitos. Devuelve los motivos (sin duplicados, en orden fijo). */
export function revisarContenidoVacante(v: {
  titulo?: string | null;
  descripcion?: string | null;
  requisitos?: string | null;
}): ResultadoModeracion {
  const texto = normalizarTexto([v.titulo, v.descripcion, v.requisitos].filter(Boolean).join(". "));
  const categorias = new Set<CategoriaModeracion>();
  for (const regla of REGLAS) {
    if (categorias.has(regla.categoria)) continue;
    if (aplicaRegla(regla, texto)) categorias.add(regla.categoria);
  }
  const motivos = (Object.keys(MOTIVOS_MODERACION) as CategoriaModeracion[])
    .filter((c) => categorias.has(c))
    .map((c) => MOTIVOS_MODERACION[c]);
  return { sospechosa: motivos.length > 0, motivos };
}

/**
 * Decisión del dueño del producto: solo las empresas verificadas publican
 * sin revisión previa, y solo si el contenido no es sospechoso.
 */
export function estadoModeracionInicial(p: { empresaVerificada: boolean; sospechosa: boolean }): "aprobada" | "pendiente" {
  return p.empresaVerificada && !p.sospechosa ? "aprobada" : "pendiente";
}

/**
 * Moderación tras editar el contenido o reabrir una vacante.
 *  - reportada: se queda (la resuelve el staff; editar no la "limpia").
 *  - rechazada o pendiente: vuelve/queda en pendiente.
 *  - aprobada: misma regla que al publicar.
 */
export function moderacionTrasCambio(p: {
  actual: EstadoModeracionVacante;
  empresaVerificada: boolean;
  sospechosa: boolean;
}): EstadoModeracionVacante {
  if (p.actual === "reportada") return "reportada";
  if (p.actual === "rechazada" || p.actual === "pendiente") return "pendiente";
  return estadoModeracionInicial(p);
}

/** Texto para `motivo_moderacion` cuando la vacante queda pendiente. */
export function motivoModeracionTexto(r: ResultadoModeracion, empresaVerificada: boolean): string | null {
  const partes = [...r.motivos];
  if (!empresaVerificada) partes.push("Empresa sin verificar: revisión previa");
  return partes.length ? partes.join(" · ") : null;
}

/* ------------------------------------------------------------
   NIT colombiano (DIAN): dígito de verificación módulo 11 con
   pesos 3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71
   aplicados desde el dígito menos significativo.
   ------------------------------------------------------------ */

const PESOS_NIT = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export function calcularDvNit(base: string): number {
  const digitos = base.replace(/\D/g, "");
  if (!digitos || digitos.length > PESOS_NIT.length) throw new Error("NIT base inválido");
  let suma = 0;
  const invertidos = digitos.split("").reverse();
  for (let i = 0; i < invertidos.length; i++) suma += Number(invertidos[i]) * PESOS_NIT[i];
  const r = suma % 11;
  return r > 1 ? 11 - r : r;
}

export type ResultadoNit = { ok: true; nit: string; base: string; dv: number } | { ok: false; error: string };

/**
 * Acepta "900.123.456-7", "900123456-7", "900 123 456 7" o "9001234567"
 * (sin guion, el último dígito es el DV). Devuelve el NIT normalizado "900123456-7".
 */
export function validarNit(entrada: string | null | undefined): ResultadoNit {
  const limpio = String(entrada ?? "").trim();
  if (!limpio) return { ok: false, error: "Escribe el NIT." };
  if (/[^\d.\s-]/.test(limpio)) return { ok: false, error: "El NIT solo lleva números, puntos y un guion antes del dígito de verificación." };

  let base: string;
  let dvTexto: string;
  const partes = limpio.split("-");
  if (partes.length > 2) return { ok: false, error: "El NIT tiene más de un guion." };
  if (partes.length === 2) {
    base = partes[0].replace(/[.\s]/g, "");
    dvTexto = partes[1].replace(/\s/g, "");
  } else {
    const digitos = limpio.replace(/[.\s]/g, "");
    base = digitos.slice(0, -1);
    dvTexto = digitos.slice(-1);
  }

  if (!/^\d+$/.test(base) || !/^\d$/.test(dvTexto))
    return { ok: false, error: "Escribe el NIT con su dígito de verificación, ej: 900123456-7." };
  if (base.length < 6 || base.length > 15) return { ok: false, error: "El NIT debe tener entre 6 y 15 dígitos antes del dígito de verificación." };
  if (/^0+$/.test(base)) return { ok: false, error: "El NIT no es válido." };

  const dv = calcularDvNit(base);
  if (dv !== Number(dvTexto)) return { ok: false, error: "El dígito de verificación del NIT no coincide. Revísalo en tu RUT." };
  return { ok: true, nit: `${base}-${dv}`, base, dv };
}
