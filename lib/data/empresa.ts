import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmpresa, getUsuario } from "@/lib/auth";
import { evaluarMatch, esRecomendable, perfilDe, type DetalleMatch } from "@/lib/matching";
import {
  AREAS,
  CIUDADES,
  DISPONIBILIDAD,
  ESTADOS_POSTULACION,
  FUENTES,
  MODALIDADES,
  NIVELES_EDUCATIVOS,
  TIPOS_EMPLEO,
  normalizarFuente,
  type EstadoPostulacion,
  type Fuente,
} from "@/lib/constants";
import type { Candidato, CandidatoMatch, Empresa, Postulacion, PostulacionHistorial, Vacante } from "@/lib/types";
import { iniciales } from "@/lib/utils";

/* ============================================================
   Datos del área de empresa (panel, pipeline, analítica).
   Arriba: funciones PURAS (probadas en test/unit/empresa*.test.ts).
   Abajo: consultas con service-role; el llamador ya autorizó.
   ============================================================ */

/* ------------------------------------------------------------
   Validación del formulario de vacante
   ------------------------------------------------------------ */

export type VacanteInput = {
  titulo: string;
  area: string;
  ciudad: string;
  tipo: (typeof TIPOS_EMPLEO)[number]["value"];
  modalidad: (typeof MODALIDADES)[number]["value"];
  nivel_educativo_min: (typeof NIVELES_EDUCATIVOS)[number]["value"];
  disponibilidad_requerida: (typeof DISPONIBILIDAD)[number]["value"];
  salario_min: number | null;
  salario_max: number | null;
  tiene_contrato: boolean;
  descripcion: string;
  requisitos: string;
};

export const CAMPOS_VACANTE = [
  "titulo",
  "area",
  "ciudad",
  "tipo",
  "modalidad",
  "nivel_educativo_min",
  "disponibilidad_requerida",
  "salario_min",
  "salario_max",
  "tiene_contrato",
  "descripcion",
  "requisitos",
] as const satisfies readonly (keyof VacanteInput)[];

/** Campos cuyo cambio obliga a re-moderar (el texto y las condiciones que ve el candidato). */
export const CAMPOS_CONTENIDO: (keyof VacanteInput)[] = [...CAMPOS_VACANTE];

const incluye = <T extends { value: string }>(lista: readonly T[], v: string) => lista.some((x) => x.value === v);

function numeroCop(v: string | undefined): number | null | "invalido" {
  const limpio = String(v ?? "").replace(/[\s.$,]/g, "");
  if (!limpio) return null;
  if (!/^\d+$/.test(limpio)) return "invalido";
  return parseInt(limpio, 10);
}

export type ResultadoVacanteInput = { ok: true; datos: VacanteInput } | { ok: false; error: string };

/**
 * Valida los campos de una vacante. `estricto=false` (borradores) solo exige el título:
 * el resto se completa con valores por defecto válidos para poder guardar.
 */
export function validarVacanteInput(raw: Record<string, string | undefined>, estricto = true): ResultadoVacanteInput {
  const g = (k: string) => String(raw[k] ?? "").trim();
  const titulo = g("titulo").slice(0, 120);
  const descripcion = g("descripcion").slice(0, 5000);
  const requisitos = g("requisitos").slice(0, 3000);

  if (!titulo) return { ok: false, error: "Escribe el título del cargo." };
  if (titulo.length < 3) return { ok: false, error: "El título del cargo es muy corto." };

  const area = g("area");
  const ciudad = g("ciudad");
  if (estricto) {
    if (!incluye(AREAS, area)) return { ok: false, error: "Elige el área del cargo." };
    if (!(CIUDADES as readonly string[]).includes(ciudad)) return { ok: false, error: "Elige la ciudad de la vacante." };
    if (descripcion.length < 20) return { ok: false, error: "Describe el cargo con al menos 20 caracteres." };
  }

  const tipo = g("tipo") || "tiempo_completo";
  const modalidad = g("modalidad") || "presencial";
  const nivel = g("nivel_educativo_min") || "bachiller";
  const disp = g("disponibilidad_requerida") || "en_1_mes";
  if (!incluye(TIPOS_EMPLEO, tipo)) return { ok: false, error: "Elige un tipo de empleo válido." };
  if (!incluye(MODALIDADES, modalidad)) return { ok: false, error: "Elige una modalidad válida." };
  if (!incluye(NIVELES_EDUCATIVOS, nivel)) return { ok: false, error: "Elige un nivel educativo válido." };
  if (!incluye(DISPONIBILIDAD, disp)) return { ok: false, error: "Elige una disponibilidad válida." };

  const min = numeroCop(raw.salario_min);
  const max = numeroCop(raw.salario_max);
  if (min === "invalido" || max === "invalido") return { ok: false, error: "El salario solo lleva números." };
  if ((min ?? 0) > 100_000_000 || (max ?? 0) > 100_000_000) return { ok: false, error: "Revisa el salario: parece demasiado alto." };
  if (min != null && max != null && max < min) return { ok: false, error: "El salario máximo no puede ser menor que el mínimo." };

  const contrato = g("tiene_contrato");
  return {
    ok: true,
    datos: {
      titulo,
      area: incluye(AREAS, area) ? area : "otro",
      ciudad: (CIUDADES as readonly string[]).includes(ciudad) ? ciudad : CIUDADES[0],
      tipo: tipo as VacanteInput["tipo"],
      modalidad: modalidad as VacanteInput["modalidad"],
      nivel_educativo_min: nivel as VacanteInput["nivel_educativo_min"],
      disponibilidad_requerida: disp as VacanteInput["disponibilidad_requerida"],
      salario_min: min,
      salario_max: max,
      tiene_contrato: contrato === "on" || contrato === "true",
      descripcion,
      requisitos,
    },
  };
}

/** Subconjunto de campos editables de una fila, para `diffCampos`. */
export function camposVacante(v: Partial<Record<keyof VacanteInput, unknown>>): Record<string, unknown> {
  return Object.fromEntries(CAMPOS_VACANTE.map((k) => [k, v[k] ?? null]));
}

/** URL http(s) válida (se antepone https:// si falta). null = vacío. */
export function normalizarSitioWeb(v: string | null | undefined): { ok: true; url: string | null } | { ok: false } {
  const s = String(v ?? "").trim();
  if (!s) return { ok: true, url: null };
  const conEsquema = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(conEsquema);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".") || /\s/.test(s)) return { ok: false };
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false };
  }
}

/* ------------------------------------------------------------
   Destacar
   ------------------------------------------------------------ */

export type PuedeDestacar = { ok: true } | { ok: false; motivo: string };

export function evaluarDestacar(p: { empresaVerificada: boolean; esPublica: boolean }): PuedeDestacar {
  if (!p.empresaVerificada)
    return { ok: false, motivo: "Solo las empresas verificadas pueden destacar vacantes. Solicita la verificación en tu perfil." };
  if (!p.esPublica)
    return { ok: false, motivo: "Solo puedes destacar una vacante publicada y aprobada (visible en el portal)." };
  return { ok: true };
}

export function destacadasRestantes(incluidasMes: number, usadasMes: number): number {
  return Math.max(0, incluidasMes - usadasMes);
}

/* ------------------------------------------------------------
   Pipeline: filtros (Empresa Pro)
   ------------------------------------------------------------ */

export type FiltrosPipeline = {
  scoreMin: number | null;
  estado: EstadoPostulacion | null;
  nivel: string | null;
  ciudad: string | null;
};

export function parseFiltrosPipeline(sp: Record<string, string | string[] | undefined>): FiltrosPipeline {
  const uno = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || null;
  };
  const score = Number(uno("score"));
  const estado = uno("estado");
  const nivel = uno("nivel");
  const ciudad = uno("ciudad");
  return {
    scoreMin: Number.isFinite(score) && score > 0 ? Math.min(100, Math.round(score)) : null,
    estado: estado && ESTADOS_POSTULACION.some((e) => e.value === estado) ? (estado as EstadoPostulacion) : null,
    nivel: nivel && incluye(NIVELES_EDUCATIVOS, nivel) ? nivel : null,
    ciudad: ciudad && (CIUDADES as readonly string[]).includes(ciudad) ? ciudad : null,
  };
}

export function hayFiltros(f: FiltrosPipeline): boolean {
  return f.scoreMin != null || f.estado != null || f.nivel != null || f.ciudad != null;
}

type CandidatoFiltrable = {
  score: number;
  postulacion: Pick<Postulacion, "estado">;
  candidato: { nivel_educativo: string; ciudad: string };
};

export function filtrarCandidatos<T extends CandidatoFiltrable>(lista: T[], f: FiltrosPipeline): T[] {
  return lista.filter(
    (c) =>
      (f.scoreMin == null || c.score >= f.scoreMin) &&
      (f.estado == null || c.postulacion.estado === f.estado) &&
      (f.nivel == null || c.candidato.nivel_educativo === f.nivel) &&
      (f.ciudad == null || c.candidato.ciudad === f.ciudad),
  );
}

/* ------------------------------------------------------------
   CSV (exportación Pro)
   ------------------------------------------------------------ */

/** BOM UTF-8 para que Excel abra bien las tildes. */
export const BOM_UTF8 = "\uFEFF";

/**
 * Escapa una celda: neutraliza inyección de fórmulas (= + - @ tab CR al inicio)
 * anteponiendo un apóstrofo, y cita con comillas si hace falta.
 */
export function escaparCeldaCsv(valor: unknown): string {
  let s = valor == null ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",;\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function generarCsv(encabezados: string[], filas: unknown[][]): string {
  const lineas = [encabezados, ...filas].map((f) => f.map(escaparCeldaCsv).join(","));
  return BOM_UTF8 + lineas.join("\r\n") + "\r\n";
}

/* ------------------------------------------------------------
   Acceso ampliado: candidato anonimizado
   ------------------------------------------------------------ */

export type CandidatoAnonimo = {
  /** Id interno para invitar; nunca se muestra. */
  id: string;
  iniciales: string;
  ciudad: string;
  nivel_educativo: string;
  area_interes: string;
  disponibilidad: string;
  score: number;
  detalle: DetalleMatch;
  puedeInvitar: boolean;
};

export function anonimizarCandidato(
  c: Pick<Candidato, "id" | "nombre" | "ciudad" | "nivel_educativo" | "area_interes" | "disponibilidad" | "wsp_opt_in">,
  detalle: DetalleMatch,
): CandidatoAnonimo {
  return {
    id: c.id,
    iniciales: iniciales(c.nombre) || "?",
    ciudad: c.ciudad,
    nivel_educativo: c.nivel_educativo,
    area_interes: c.area_interes,
    disponibilidad: c.disponibilidad,
    score: detalle.score,
    detalle,
    puedeInvitar: c.wsp_opt_in,
  };
}

export const MAX_INVITACIONES_DIA = 20;

/** Inicio del día en Colombia (UTC-5, sin horario de verano) como ISO UTC. */
export function inicioDiaColombia(ahora = new Date()): string {
  const offsetMs = 5 * 3_600_000;
  const local = new Date(ahora.getTime() - offsetMs);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() + offsetMs).toISOString();
}

/* ------------------------------------------------------------
   Analítica (pura)
   ------------------------------------------------------------ */

/** Postulaciones / vistas en %, con un decimal. null si no hay vistas. */
export function tasaConversion(postulaciones: number, vistas: number): number | null {
  if (!vistas) return null;
  return Math.round((postulaciones / vistas) * 1000) / 10;
}

/** Orden de avance del pipeline (descartado/retirada no son etapas). */
export const ETAPAS_EMBUDO = ["enviada", "vista", "contactado", "en_entrevista", "contratado"] as const;
export type EtapaEmbudo = (typeof ETAPAS_EMBUDO)[number];

/** Etapa más avanzada que alcanzó una postulación según su historial y su estado actual. */
export function etapaMaxima(estados: string[]): number {
  let max = 0;
  for (const e of estados) {
    const i = (ETAPAS_EMBUDO as readonly string[]).indexOf(e);
    if (i > max) max = i;
  }
  return max;
}

export type PasoEmbudo = { etapa: EtapaEmbudo; label: string; cantidad: number; porcentaje: number };

/** Embudo acumulado: cuántas postulaciones llegaron al menos a cada etapa. */
export function construirEmbudo(etapasMaximas: number[]): PasoEmbudo[] {
  const total = etapasMaximas.length;
  return ETAPAS_EMBUDO.map((etapa, i) => {
    const cantidad = etapasMaximas.filter((m) => m >= i).length;
    return {
      etapa,
      label: ESTADOS_POSTULACION.find((e) => e.value === etapa)?.label ?? etapa,
      cantidad,
      porcentaje: total ? Math.round((cantidad / total) * 100) : 0,
    };
  });
}

export function conteoPorEstado(estados: string[]): { estado: EstadoPostulacion; label: string; cantidad: number }[] {
  return ESTADOS_POSTULACION.map((e) => ({
    estado: e.value,
    label: e.label,
    cantidad: estados.filter((x) => x === e.value).length,
  }));
}

export type Reparto = { clave: string; cantidad: number; porcentaje: number };

export function distribucionFuentes(fuentes: (string | null | undefined)[]): Reparto[] {
  const total = fuentes.length;
  const conteo = new Map<Fuente, number>(FUENTES.map((f) => [f, 0]));
  for (const f of fuentes) {
    const n = normalizarFuente(f);
    conteo.set(n, (conteo.get(n) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([clave, cantidad]) => ({ clave, cantidad, porcentaje: total ? Math.round((cantidad / total) * 100) : 0 }))
    .sort((a, b) => b.cantidad - a.cantidad || a.clave.localeCompare(b.clave));
}

export const RANGOS_SCORE = [
  { clave: "0-39", min: 0, max: 39 },
  { clave: "40-59", min: 40, max: 59 },
  { clave: "60-79", min: 60, max: 79 },
  { clave: "80-100", min: 80, max: 100 },
] as const;

export function distribucionScore(scores: number[]): Reparto[] {
  const total = scores.length;
  return RANGOS_SCORE.map((r) => {
    const cantidad = scores.filter((s) => s >= r.min && s <= r.max).length;
    return { clave: r.clave, cantidad, porcentaje: total ? Math.round((cantidad / total) * 100) : 0 };
  });
}

export function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const o = [...valores].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
}

/**
 * Horas entre la publicación y la primera postulación de cada vacante
 * (solo vacantes publicadas que ya recibieron al menos una).
 */
export function horasHastaPrimeraPostulacion(
  vacantes: { id: string; publicada_en: string | null }[],
  postulaciones: { vacante_id: string; creado_en: string }[],
): number[] {
  const primera = new Map<string, number>();
  for (const p of postulaciones) {
    const t = new Date(p.creado_en).getTime();
    const actual = primera.get(p.vacante_id);
    if (actual == null || t < actual) primera.set(p.vacante_id, t);
  }
  const horas: number[] = [];
  for (const v of vacantes) {
    if (!v.publicada_en) continue;
    const t = primera.get(v.id);
    if (t == null) continue;
    horas.push(Math.max(0, Math.round(((t - new Date(v.publicada_en).getTime()) / 3_600_000) * 10) / 10));
  }
  return horas;
}

/** % de vacantes publicadas alguna vez que tienen ≥1 postulación. */
export function porcentajeConPostulacion(vacantes: { publicada_en: string | null; total_postulaciones: number }[]): number | null {
  const publicadas = vacantes.filter((v) => v.publicada_en);
  if (!publicadas.length) return null;
  return Math.round((publicadas.filter((v) => v.total_postulaciones > 0).length / publicadas.length) * 100);
}

export function formatHoras(h: number | null): string {
  if (h == null) return "—";
  if (h < 1) return "menos de 1 hora";
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} días`;
}

/* ============================================================
   Consultas (server, service-role)
   ============================================================ */

/** Empresa de la sesión o redirección (candidato → su feed; sin sesión → login). */
export async function requerirEmpresa(next: string): Promise<Empresa> {
  const empresa = await getEmpresa();
  if (empresa) return empresa;
  const sesion = await getUsuario();
  if (sesion?.tipo === "candidato") redirect("/mis-vacantes");
  if (!sesion) redirect(`/login?next=${encodeURIComponent(next)}`);
  redirect("/registro-empresa");
}

/** Vacante solo si pertenece a la empresa. */
export async function getVacantePropia(empresaId: string, vacanteId: string): Promise<Vacante | null> {
  if (!/^[0-9a-f-]{36}$/i.test(vacanteId)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("vacantes").select("*").eq("id", vacanteId).eq("empresa_id", empresaId).maybeSingle();
  return (data as Vacante) ?? null;
}

export async function getHistorialDePostulaciones(ids: string[]): Promise<Map<string, PostulacionHistorial[]>> {
  const mapa = new Map<string, PostulacionHistorial[]>();
  if (!ids.length) return mapa;
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulacion_historial")
    .select("*")
    .in("postulacion_id", ids)
    .order("creado_en", { ascending: true });
  for (const h of (data ?? []) as PostulacionHistorial[]) {
    const lista = mapa.get(h.postulacion_id) ?? [];
    lista.push(h);
    mapa.set(h.postulacion_id, lista);
  }
  return mapa;
}

/** Postulaciones retiradas por el candidato (sección aparte del pipeline). */
export async function getPostulacionesRetiradas(vacante: Vacante): Promise<CandidatoMatch[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("postulaciones")
    .select("*, candidato:candidatos(id, nombre, ciudad, nivel_educativo, area_interes, experiencia, disponibilidad, whatsapp, plan)")
    .eq("vacante_id", vacante.id)
    .eq("estado", "retirada")
    .order("estado_actualizado_en", { ascending: false });
  type Fila = Postulacion & { candidato: CandidatoMatch["candidato"] | null };
  return ((data ?? []) as unknown as Fila[])
    .filter((r) => r.candidato)
    .map(({ candidato, ...postulacion }) => {
      const detalle = postulacion.match_detalle ?? evaluarMatch(perfilDe(candidato!), vacante);
      return { postulacion, candidato: candidato!, score: Number(postulacion.score_match ?? detalle.score), detalle };
    });
}

/** Invitaciones de hoy para la vacante y candidatos ya invitados alguna vez. */
export async function getInvitacionesVacante(vacanteId: string): Promise<{ hoy: number; invitados: Set<string> }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("eventos")
    .select("meta, creado_en")
    .eq("tipo", "invitacion_candidato")
    .eq("entidad", "vacantes")
    .eq("entidad_id", vacanteId)
    .limit(2000);
  const desde = new Date(inicioDiaColombia()).getTime();
  const filas = (data ?? []) as { meta: { candidato_id?: string } | null; creado_en: string }[];
  return {
    hoy: filas.filter((f) => new Date(f.creado_en).getTime() >= desde).length,
    invitados: new Set(filas.map((f) => f.meta?.candidato_id).filter((x): x is string => !!x)),
  };
}

/**
 * Acceso ampliado (Pro): candidatos activos que aceptaron ser visibles, no
 * postulados y con match recomendable. Devuelve datos ANONIMIZADOS.
 */
export async function getCandidatosSugeridos(vacante: Vacante, limite = 50): Promise<CandidatoAnonimo[]> {
  const admin = createAdminClient();
  let q = admin
    .from("candidatos")
    .select("id, nombre, ciudad, nivel_educativo, area_interes, disponibilidad, wsp_opt_in")
    .eq("activo", true)
    .eq("perfil_visible_empresas", true)
    .limit(1000);
  // El área y la ciudad pesan 70 puntos: sin ellas nadie llega al umbral.
  q = q.eq("area_interes", vacante.area);
  if (vacante.modalidad !== "remoto") q = q.eq("ciudad", vacante.ciudad);

  const [{ data: candidatos }, { data: postulados }] = await Promise.all([
    q,
    admin.from("postulaciones").select("candidato_id").eq("vacante_id", vacante.id),
  ]);
  const yaPostulados = new Set(((postulados ?? []) as { candidato_id: string }[]).map((p) => p.candidato_id));

  type Fila = Pick<Candidato, "id" | "nombre" | "ciudad" | "nivel_educativo" | "area_interes" | "disponibilidad" | "wsp_opt_in">;
  return ((candidatos ?? []) as Fila[])
    .filter((c) => !yaPostulados.has(c.id))
    .map((c) => anonimizarCandidato(c, evaluarMatch(perfilDe(c), vacante)))
    .filter((c) => esRecomendable(c.detalle))
    .sort((a, b) => b.score - a.score)
    .slice(0, limite);
}

/* ---------------- Analítica ---------------- */

export type FilaAnaliticaVacante = {
  id: string;
  titulo: string;
  estado: Vacante["estado"];
  vistas: number;
  postulaciones: number;
  conversion: number | null;
};

export type AnaliticaBasica = {
  totalVistas: number;
  totalPostulaciones: number;
  conversion: number | null;
  vacantes: FilaAnaliticaVacante[];
};

export type AnaliticaAvanzada = {
  embudo: PasoEmbudo[];
  porEstado: ReturnType<typeof conteoPorEstado>;
  fuentesVistas: Reparto[];
  fuentesPostulaciones: Reparto[];
  distribucionScore: Reparto[];
  medianaHorasPrimeraPostulacion: number | null;
  vacantesConPostulacion: number | null;
};

export async function getAnaliticaEmpresa(
  empresaId: string,
  avanzada: boolean,
): Promise<{ basica: AnaliticaBasica; avanzada: AnaliticaAvanzada | null }> {
  const admin = createAdminClient();
  const { data: vacData } = await admin
    .from("vacantes")
    .select("id, titulo, estado, vistas, publicada_en, creado_en")
    .eq("empresa_id", empresaId)
    .order("creado_en", { ascending: false });
  const vacantes = (vacData ?? []) as Pick<Vacante, "id" | "titulo" | "estado" | "vistas" | "publicada_en" | "creado_en">[];
  const ids = vacantes.map((v) => v.id);

  type PostFila = Pick<Postulacion, "id" | "vacante_id" | "estado" | "score_match" | "fuente" | "creado_en">;
  let postulaciones: PostFila[] = [];
  if (ids.length) {
    const { data } = await admin
      .from("postulaciones")
      .select("id, vacante_id, estado, score_match, fuente, creado_en")
      .in("vacante_id", ids)
      .limit(10000);
    postulaciones = (data ?? []) as PostFila[];
  }

  const porVacante = new Map<string, number>();
  for (const p of postulaciones) {
    if (p.estado === "retirada") continue;
    porVacante.set(p.vacante_id, (porVacante.get(p.vacante_id) ?? 0) + 1);
  }
  const filas: FilaAnaliticaVacante[] = vacantes.map((v) => {
    const n = porVacante.get(v.id) ?? 0;
    return { id: v.id, titulo: v.titulo, estado: v.estado, vistas: v.vistas, postulaciones: n, conversion: tasaConversion(n, v.vistas) };
  });
  const totalVistas = filas.reduce((s, f) => s + f.vistas, 0);
  const totalPostulaciones = filas.reduce((s, f) => s + f.postulaciones, 0);
  const basica: AnaliticaBasica = {
    totalVistas,
    totalPostulaciones,
    conversion: tasaConversion(totalPostulaciones, totalVistas),
    vacantes: filas,
  };
  if (!avanzada) return { basica, avanzada: null };

  const activas = postulaciones.filter((p) => p.estado !== "retirada");
  const historial = await getHistorialDePostulaciones(activas.map((p) => p.id));
  const etapas = activas.map((p) => etapaMaxima([p.estado, ...(historial.get(p.id) ?? []).map((h) => h.estado_nuevo)]));

  let fuentesVistas: (string | null)[] = [];
  if (ids.length) {
    const { data } = await admin
      .from("eventos")
      .select("meta")
      .eq("tipo", "vacante_vista")
      .in("entidad_id", ids)
      .limit(20000);
    fuentesVistas = ((data ?? []) as { meta: { fuente?: string } | null }[]).map((e) => e.meta?.fuente ?? null);
  }

  return {
    basica,
    avanzada: {
      embudo: construirEmbudo(etapas),
      porEstado: conteoPorEstado(postulaciones.map((p) => p.estado)),
      fuentesVistas: distribucionFuentes(fuentesVistas),
      fuentesPostulaciones: distribucionFuentes(activas.map((p) => p.fuente)),
      distribucionScore: distribucionScore(activas.map((p) => Number(p.score_match ?? 0))),
      medianaHorasPrimeraPostulacion: mediana(horasHastaPrimeraPostulacion(vacantes, postulaciones)),
      vacantesConPostulacion: porcentajeConPostulacion(
        vacantes.map((v) => ({ publicada_en: v.publicada_en, total_postulaciones: porVacante.get(v.id) ?? 0 })),
      ),
    },
  };
}
