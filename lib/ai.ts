import "server-only";

/* ============================================================
   Capa de IA de CostaLaboral — generación de hoja de vida y
   optimización de LinkedIn. Sin dependencias: usa fetch nativo
   contra la API de Anthropic si hay ANTHROPIC_API_KEY; si no,
   un fallback DETERMINISTA que arma un CV decente a partir de
   las respuestas del asistente. Solo servidor.
   ============================================================ */

/* ------------------------- Tipos ------------------------- */

export type ExperienciaEntrada = {
  cargo: string;
  empresa: string;
  periodo: string;
  descripcion: string; // "qué hacías" en texto libre
};

/** Datos que llegan del asistente (wizard) + contexto del candidato. */
export type DatosHV = {
  nombre: string;
  ciudad: string;
  area: string; // label legible del área
  cargoObjetivo: string;
  aniosExperiencia: number;
  nivelEducativo: string; // label legible
  experiencia: ExperienciaEntrada[];
  habilidades: string[];
  educacion: string[];
};

export type ExperienciaHV = {
  cargo: string;
  empresa: string;
  periodo: string;
  logros: string[];
};

/** Contenido estructurado del CV (coincide con hojas_de_vida.contenido). */
export type ContenidoHV = {
  resumen: string;
  habilidades: string[];
  experiencia: ExperienciaHV[];
  educacion: string[];
  logros: string[];
};

export type LinkedInHV = {
  titular: string;
  acerca: string;
};

export type ResultadoHV = {
  contenido: ContenidoHV;
  linkedin: LinkedInHV;
  generada_por_ia: boolean;
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

/* ---------------------- Utilidades ----------------------- */

function limpiar(txt: string): string {
  return txt.replace(/\s+/g, " ").trim();
}

function capitalizar(txt: string): string {
  const t = limpiar(txt);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

/** Convierte texto libre de "qué hacías" en bullets de logros presentables. */
function bulletsDesdeDescripcion(descripcion: string, cargo: string): string[] {
  const partes = descripcion
    .split(/[\n•.;]|(?:\s-\s)/)
    .map((p) => limpiar(p))
    .filter((p) => p.length > 2);

  if (partes.length === 0) {
    return [`Desempeño responsable y comprometido en el cargo de ${cargo || "el rol"}.`];
  }

  const verbos = ["Encargado de", "Responsable de", "Apoyo en", "Gestión de", "Manejo de"];
  return partes.slice(0, 4).map((p, i) => {
    const yaTieneVerbo = /^(encargad|responsab|apoy|gesti|manej|realic|logr|coordin|atend|vend|lider)/i.test(p);
    return yaTieneVerbo ? capitalizar(p) + "." : `${verbos[i % verbos.length]} ${p.toLowerCase()}.`;
  });
}

/* -------------------- Fallback determinista -------------------- */

function fallbackHojaDeVida(datos: DatosHV): ResultadoHV {
  const habilidades = datos.habilidades.filter(Boolean);
  const listaHab = habilidades.length
    ? habilidades.slice(0, 4).join(", ").toLowerCase()
    : "trabajo en equipo, responsabilidad y actitud de servicio";

  const anios = datos.aniosExperiencia;
  const fraseAnios =
    anios <= 0
      ? "con muchas ganas de arrancar y aprender rápido"
      : anios === 1
        ? "con 1 año de experiencia"
        : `con ${anios} años de experiencia`;

  const resumen = capitalizar(
    `${datos.cargoObjetivo || "Profesional"} ${fraseAnios} en ${datos.area.toLowerCase()}, ` +
      `radicado en ${datos.ciudad}. Se destaca por ${listaHab}. ` +
      `Busca aportar compromiso y buenos resultados a un equipo de la costa.`,
  );

  const experiencia: ExperienciaHV[] = datos.experiencia
    .filter((e) => e.cargo || e.empresa || e.descripcion)
    .map((e) => ({
      cargo: capitalizar(e.cargo || datos.cargoObjetivo || "Colaborador"),
      empresa: capitalizar(e.empresa || "Empresa"),
      periodo: limpiar(e.periodo) || "—",
      logros: bulletsDesdeDescripcion(e.descripcion, e.cargo),
    }));

  const logros: string[] = [];
  if (experiencia.length) logros.push(`Trayectoria en ${experiencia.length === 1 ? "una empresa" : `${experiencia.length} empresas`} del sector.`);
  if (habilidades.length >= 3) logros.push(`Dominio de ${habilidades.slice(0, 3).join(", ").toLowerCase()}.`);
  logros.push("Puntualidad y compromiso con las metas del equipo.");

  const educacion = datos.educacion.filter(Boolean);
  if (educacion.length === 0 && datos.nivelEducativo) educacion.push(datos.nivelEducativo);

  // LinkedIn plantilla
  const titular = capitalizar(
    `${datos.cargoObjetivo || "Profesional"} en ${datos.area} | ${datos.ciudad}` +
      (habilidades.length ? ` | ${habilidades.slice(0, 2).join(" · ")}` : ""),
  );

  const acerca = capitalizar(
    `Soy ${datos.nombre}, ${datos.cargoObjetivo || "profesional"} ${fraseAnios} en ${datos.area.toLowerCase()}. ` +
      `Me apasiona ${listaHab}. Vivo en ${datos.ciudad} y estoy abierto a nuevas oportunidades ` +
      `donde pueda aportar y seguir creciendo. Si buscas a alguien comprometido y con buena actitud, hablemos.`,
  );

  return {
    contenido: {
      resumen,
      habilidades: habilidades.length ? habilidades : ["Trabajo en equipo", "Responsabilidad", "Actitud de servicio"],
      experiencia,
      educacion,
      logros: logros.slice(0, 4),
    },
    linkedin: { titular, acerca },
    generada_por_ia: false,
  };
}

/* ----------------------- IA (Anthropic) ----------------------- */

function promptUsuario(datos: DatosHV): string {
  const exp = datos.experiencia
    .map(
      (e, i) =>
        `  ${i + 1}) Cargo: ${e.cargo || "—"} | Empresa: ${e.empresa || "—"} | Periodo: ${e.periodo || "—"} | Qué hacía: ${e.descripcion || "—"}`,
    )
    .join("\n");

  return [
    "Genera una hoja de vida profesional Y la optimización de LinkedIn para este candidato del Caribe colombiano.",
    "Tono cálido, profesional y cercano (español de Colombia, costa Caribe). Nada de inventar títulos ni experiencia que no exista.",
    "",
    `Nombre: ${datos.nombre}`,
    `Ciudad: ${datos.ciudad}`,
    `Área: ${datos.area}`,
    `Cargo objetivo: ${datos.cargoObjetivo}`,
    `Años de experiencia: ${datos.aniosExperiencia}`,
    `Nivel educativo: ${datos.nivelEducativo}`,
    `Habilidades: ${datos.habilidades.join(", ") || "—"}`,
    `Educación: ${datos.educacion.join(" | ") || "—"}`,
    "Experiencia:",
    exp || "  (sin experiencia detallada)",
    "",
    "Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown, con esta forma exacta:",
    `{"resumen": string, "habilidades": string[], "experiencia": [{"cargo": string, "empresa": string, "periodo": string, "logros": string[]}], "educacion": string[], "logros": string[], "linkedin": {"titular": string, "acerca": string}}`,
    "Reglas: resumen de 2-4 frases; cada experiencia con 2-4 logros en bullets orientados a acción; titular de LinkedIn corto y potente; 'acerca' de 3-5 frases en primera persona.",
  ].join("\n");
}

type CrudoIA = Partial<ContenidoHV> & { linkedin?: Partial<LinkedInHV> };

function normalizarIA(crudo: CrudoIA, datos: DatosHV): ResultadoHV {
  const base = fallbackHojaDeVida(datos); // relleno seguro por si faltan campos
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []);

  const experiencia: ExperienciaHV[] = Array.isArray(crudo.experiencia)
    ? crudo.experiencia.map((e: any) => ({
        cargo: limpiar(String(e?.cargo ?? "")) || "Colaborador",
        empresa: limpiar(String(e?.empresa ?? "")) || "Empresa",
        periodo: limpiar(String(e?.periodo ?? "")) || "—",
        logros: arr(e?.logros),
      }))
    : base.contenido.experiencia;

  return {
    contenido: {
      resumen: limpiar(String(crudo.resumen ?? "")) || base.contenido.resumen,
      habilidades: arr(crudo.habilidades).length ? arr(crudo.habilidades) : base.contenido.habilidades,
      experiencia: experiencia.length ? experiencia : base.contenido.experiencia,
      educacion: arr(crudo.educacion).length ? arr(crudo.educacion) : base.contenido.educacion,
      logros: arr(crudo.logros).length ? arr(crudo.logros) : base.contenido.logros,
    },
    linkedin: {
      titular: limpiar(String(crudo.linkedin?.titular ?? "")) || base.linkedin.titular,
      acerca: limpiar(String(crudo.linkedin?.acerca ?? "")) || base.linkedin.acerca,
    },
    generada_por_ia: true,
  };
}

/** Extrae el primer bloque JSON de una respuesta de texto. */
function extraerJSON(texto: string): CrudoIA | null {
  try {
    return JSON.parse(texto) as CrudoIA;
  } catch {
    const inicio = texto.indexOf("{");
    const fin = texto.lastIndexOf("}");
    if (inicio === -1 || fin === -1 || fin <= inicio) return null;
    try {
      return JSON.parse(texto.slice(inicio, fin + 1)) as CrudoIA;
    } catch {
      return null;
    }
  }
}

async function llamarAnthropic(datos: DatosHV): Promise<ResultadoHV | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system:
          "Eres un experto en talento humano del Caribe colombiano que redacta hojas de vida y perfiles de LinkedIn claros, honestos y con buena actitud. Respondes siempre en JSON válido, sin markdown.",
        messages: [{ role: "user", content: promptUsuario(datos) }],
      }),
    });

    if (!res.ok) return null;
    const data: any = await res.json();
    const texto: string = Array.isArray(data?.content)
      ? data.content.map((b: any) => (typeof b?.text === "string" ? b.text : "")).join("")
      : "";
    if (!texto) return null;

    const crudo = extraerJSON(texto);
    if (!crudo) return null;
    return normalizarIA(crudo, datos);
  } catch {
    return null;
  }
}

/* ------------------------- API pública ------------------------- */

/**
 * Genera la hoja de vida + LinkedIn del candidato. Usa la API de Anthropic
 * si hay clave; si no (o si falla), cae al fallback determinista.
 * Nunca lanza: siempre devuelve un resultado presentable.
 */
export async function generarHojaDeVida(datos: DatosHV): Promise<ResultadoHV> {
  const ia = await llamarAnthropic(datos);
  return ia ?? fallbackHojaDeVida(datos);
}

/** Solo el bloque de LinkedIn (reutiliza generarHojaDeVida). */
export async function generarLinkedIn(datos: DatosHV): Promise<LinkedInHV & { generada_por_ia: boolean }> {
  const r = await generarHojaDeVida(datos);
  return { ...r.linkedin, generada_por_ia: r.generada_por_ia };
}
