import type {
  ContenidoHV,
  ContenidoLinkedIn,
  DatosFuenteHV,
  ExperienciaEntrada,
  FuenteLinkedIn,
  NivelLinkedIn,
} from "./tipos";

/* ============================================================
   Generador DETERMINISTA de respaldo (sin IA). Solo reorganiza lo
   que escribió el candidato: no agrega cifras, cargos, empresas,
   títulos, certificaciones ni logros. Se usa sin credenciales, si
   la API falla o si la validación anti-invención encuentra
   problemas graves. Puro.
   ============================================================ */

const limpiar = (t: string | null | undefined) => (t ?? "").replace(/\s+/g, " ").trim();

function capitalizar(t: string): string {
  const s = limpiar(t);
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function conPunto(t: string): string {
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Convierte "qué hacías" en viñetas, frase por frase y sin añadir nada. */
export function bulletsDesdeDescripcion(descripcion: string | null | undefined): string[] {
  return (descripcion ?? "")
    .split(/\n|•|;|\.(?=\s|$)|\s-\s/)
    .map(limpiar)
    .filter((p) => p.length > 2)
    .slice(0, 6)
    .map((p) => conPunto(capitalizar(p.slice(0, 380))));
}

function fraseAnios(anios: number): string {
  if (!Number.isFinite(anios) || anios <= 0) return "en búsqueda de su primera experiencia";
  return anios === 1 ? "con 1 año de experiencia" : `con ${anios} años de experiencia`;
}

export function resumenRespaldo(fuente: DatosFuenteHV): string {
  const { entrada, perfil } = fuente;
  const cargo = entrada.cargoObjetivo || perfil.area || "Candidato";
  const partes = [
    `${capitalizar(cargo)} ${fraseAnios(entrada.aniosExperiencia)}${perfil.area ? ` en el área de ${perfil.area.toLowerCase()}` : ""}${perfil.ciudad ? `, en ${perfil.ciudad}` : ""}.`,
  ];
  if (entrada.habilidades.length) partes.push(`Habilidades: ${entrada.habilidades.slice(0, 5).join(", ")}.`);
  return partes.join(" ");
}

function experienciaRespaldo(e: ExperienciaEntrada) {
  return { cargo: e.cargo, empresa: e.empresa, periodo: e.periodo, logros: bulletsDesdeDescripcion(e.descripcion) };
}

export function hvRespaldo(fuente: DatosFuenteHV): ContenidoHV {
  const { entrada, perfil } = fuente;
  return {
    resumen: resumenRespaldo(fuente),
    habilidades: [...entrada.habilidades],
    experiencia: entrada.experiencia.map(experienciaRespaldo),
    educacion: entrada.educacion.length ? [...entrada.educacion] : perfil.nivelEducativo ? [perfil.nivelEducativo] : [],
    logros: [],
  };
}

/* ---------------- LinkedIn ---------------- */

/** Palabras clave sugeridas por área (sugerencias de búsqueda, no afirmaciones sobre el candidato). */
export const PALABRAS_CLAVE_AREA: Record<string, string[]> = {
  Ventas: ["ventas", "atención al cliente", "asesor comercial", "cierre de ventas", "servicio al cliente"],
  Logística: ["logística", "inventarios", "bodega", "despachos", "cadena de suministro"],
  Salud: ["salud", "atención al paciente", "auxiliar de enfermería", "servicios de salud", "bioseguridad"],
  Administrativo: ["administrativo", "asistente administrativo", "archivo", "facturación", "gestión documental"],
  Tecnología: ["tecnología", "soporte técnico", "sistemas", "desarrollo de software", "redes"],
  "Alimentos y cocina": ["cocina", "alimentos", "manipulación de alimentos", "restaurante", "servicio a la mesa"],
  "Servicio al cliente": ["servicio al cliente", "atención al usuario", "call center", "PQR", "experiencia del cliente"],
  Construcción: ["construcción", "obra", "mantenimiento", "seguridad industrial", "acabados"],
  Transporte: ["transporte", "conductor", "rutas", "distribución", "mensajería"],
  "Belleza y estética": ["belleza", "estética", "peluquería", "manicure", "cuidado personal"],
  Educación: ["educación", "docencia", "formación", "pedagogía", "tutorías"],
};

function experienciasDeFuente(f: FuenteLinkedIn) {
  if (f.contenidoHV?.experiencia.length) {
    return f.contenidoHV.experiencia.map((e) => ({ cargo: e.cargo, empresa: e.empresa, descripcion: e.logros.join(" ") }));
  }
  if (f.entrada?.experiencia.length) {
    return f.entrada.experiencia.map((e) => ({ cargo: e.cargo, empresa: e.empresa, descripcion: bulletsDesdeDescripcion(e.descripcion).join(" ") }));
  }
  return [];
}

export function habilidadesDeFuente(f: FuenteLinkedIn): string[] {
  const lista = [...(f.contenidoHV?.habilidades ?? []), ...(f.entrada?.habilidades ?? [])];
  const vistas = new Set<string>();
  return lista.filter((h) => {
    const k = h.toLowerCase().trim();
    if (!k || vistas.has(k)) return false;
    vistas.add(k);
    return true;
  });
}

export function linkedinRespaldo(f: FuenteLinkedIn, nivel: NivelLinkedIn): ContenidoLinkedIn {
  const cargo = capitalizar(f.perfil.cargoObjetivo || f.perfil.area || "Profesional");
  const habilidades = habilidadesDeFuente(f);
  const exps = experienciasDeFuente(f);
  const anios = f.entrada?.aniosExperiencia ?? 0;

  const titular = [cargo, f.perfil.area, f.perfil.ciudad].filter(Boolean).join(" | ");
  const acerca = [
    `Soy ${cargo.toLowerCase()} ${fraseAnios(anios)}${f.perfil.ciudad ? `, en ${f.perfil.ciudad}` : ""}.`,
    exps.length ? `He trabajado como ${exps.map((e) => [e.cargo, e.empresa].filter(Boolean).join(" en ")).join("; ")}.` : "",
    habilidades.length ? `Mis habilidades: ${habilidades.slice(0, 6).join(", ")}.` : "",
    f.perfil.experienciaLibre && !exps.length ? conPunto(limpiar(f.perfil.experienciaLibre)) : "",
    "Estoy abierto a nuevas oportunidades.",
  ]
    .filter(Boolean)
    .join(" ");

  if (nivel === "basico") return { titular, acerca };

  return {
    titular,
    acerca,
    titulares_alternativos: [
      [cargo, f.perfil.ciudad].filter(Boolean).join(" en "),
      [cargo, habilidades.slice(0, 2).join(" · ")].filter(Boolean).join(" | "),
      [f.perfil.area, cargo].filter(Boolean).join(" · "),
    ].filter(Boolean),
    habilidades: habilidades.slice(0, 10),
    experiencias: exps,
    palabras_clave: PALABRAS_CLAVE_AREA[f.perfil.area] ?? [],
  };
}
