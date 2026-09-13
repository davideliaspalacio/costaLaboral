/* ============================================================
   KPIs del MVP (sección 14/15 de la spec) y resumen de uso de IA.
   SOLO funciones puras (sin BD ni server-only) para poder probarlas.
   Las consultas que las alimentan viven en lib/data/metrics.ts.
   Valores porcentuales en 0–100; tiempos en horas.
   ============================================================ */
import { evaluarMatch, type PerfilCandidato, type PerfilVacante } from "@/lib/matching";
import { UMBRAL_RECOMENDACION } from "@/lib/constants";

const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;
const OFFSET_BOGOTA_MS = -5 * HORA_MS;

/* ---------------- Rango de fechas (día civil de Bogotá) ---------------- */

export type Rango = { desde: Date; hasta: Date; desdeStr: string; hastaStr: string };

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" del día civil en Bogotá que contiene `fecha`. */
export function fechaBogota(fecha: Date): string {
  return new Date(fecha.getTime() + OFFSET_BOGOTA_MS).toISOString().slice(0, 10);
}

/** Inicio (00:00 Bogotá) del día "YYYY-MM-DD". */
export function inicioDiaBogota(dia: string): Date {
  return new Date(Date.parse(`${dia}T00:00:00.000Z`) - OFFSET_BOGOTA_MS);
}

/**
 * Rango inclusivo por días civiles. Sin parámetros válidos: los últimos
 * `diasDefault` días terminando hoy. `hasta` es el final (23:59:59.999) del día.
 */
export function rangoFechas(
  params: { desde?: string | null; hasta?: string | null },
  diasDefault = 30,
  ahora = new Date(),
): Rango {
  const hoy = fechaBogota(ahora);
  let hastaStr = params.hasta && RE_FECHA.test(params.hasta) ? params.hasta : hoy;
  let desdeStr =
    params.desde && RE_FECHA.test(params.desde)
      ? params.desde
      : fechaBogota(new Date(inicioDiaBogota(hastaStr).getTime() - (diasDefault - 1) * DIA_MS));
  if (desdeStr > hastaStr) [desdeStr, hastaStr] = [hastaStr, desdeStr];
  return {
    desde: inicioDiaBogota(desdeStr),
    hasta: new Date(inicioDiaBogota(hastaStr).getTime() + DIA_MS - 1),
    desdeStr,
    hastaStr,
  };
}

/* ---------------- Utilidades numéricas ---------------- */

/** Porcentaje 0–100 o null si no hay denominador. */
export function porcentaje(num: number, den: number): number | null {
  return den > 0 ? (num / den) * 100 : null;
}

export function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Percentil p (0–100) por el método nearest-rank. */
export function percentil(valores: number[], p: number): number | null {
  if (!valores.length) return null;
  const v = [...valores].sort((a, b) => a - b);
  const rank = Math.ceil((Math.min(100, Math.max(0, p)) / 100) * v.length);
  return v[Math.max(0, rank - 1)];
}

/* ---------------- Metas y semáforo ---------------- */

export type MetaKpi =
  | { tipo: "min"; valor: number } // más es mejor: > valor
  | { tipo: "max"; valor: number } // menos es mejor: < valor
  | { tipo: "rango"; min: number; max: number }; // esperado entre min y max

export type Semaforo = "verde" | "amarillo" | "rojo" | "sin_datos";

/**
 * - min: verde ≥ meta · amarillo ≥ 75 % de la meta · rojo por debajo.
 * - max: verde ≤ meta · amarillo ≤ 150 % de la meta · rojo por encima.
 * - rango: verde ≥ mínimo (superarlo también es bueno) · amarillo ≥ la mitad del mínimo.
 */
export function evaluarSemaforo(valor: number | null, meta: MetaKpi): Semaforo {
  if (valor == null || Number.isNaN(valor)) return "sin_datos";
  switch (meta.tipo) {
    case "min":
      return valor >= meta.valor ? "verde" : valor >= meta.valor * 0.75 ? "amarillo" : "rojo";
    case "max":
      return valor <= meta.valor ? "verde" : valor <= meta.valor * 1.5 ? "amarillo" : "rojo";
    case "rango":
      return valor >= meta.min ? "verde" : valor >= meta.min / 2 ? "amarillo" : "rojo";
  }
}

export function textoMeta(meta: MetaKpi, formato: FormatoKpi): string {
  const u = formato === "pct" ? "%" : " h";
  if (meta.tipo === "min") return `> ${meta.valor}${u}`;
  if (meta.tipo === "max") return `< ${meta.valor}${u}`;
  return `${meta.min}–${meta.max}${u}`;
}

/* ---------------- Cálculos de cada KPI ---------------- */

export type Fraccion = { num: number; den: number };

/** Candidatos con al menos una vacante visible con score ≥ umbral. */
export function candidatosConVacanteRelevante(
  candidatos: PerfilCandidato[],
  vacantes: PerfilVacante[],
  umbral = UMBRAL_RECOMENDACION,
): Fraccion {
  let num = 0;
  for (const c of candidatos) {
    if (vacantes.some((v) => evaluarMatch(c, v).score >= umbral)) num++;
  }
  return { num, den: candidatos.length };
}

type EventoMeta = { meta?: Record<string, unknown> | null };

export function fuenteDeEvento(e: EventoMeta): string {
  const f = e.meta?.fuente;
  return typeof f === "string" && f ? f : "directo";
}

/** Vistas de ficha, opcionalmente solo de una fuente. */
export function contarVistas(eventos: EventoMeta[], fuente?: string): number {
  return fuente ? eventos.filter((e) => fuenteDeEvento(e) === fuente).length : eventos.length;
}

/** Suma de `meta.cantidad` de los eventos recomendaciones_mostradas. */
export function sumarRecomendacionesMostradas(eventos: EventoMeta[]): number {
  return eventos.reduce((s, e) => {
    const n = Number(e.meta?.cantidad);
    return s + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

/** Vacantes (publicadas en el periodo) con al menos una postulación. */
export function vacantesConPostulacion(
  vacanteIds: string[],
  postulaciones: { vacante_id: string }[],
): Fraccion {
  const con = new Set(postulaciones.map((p) => p.vacante_id));
  return { num: vacanteIds.filter((id) => con.has(id)).length, den: vacanteIds.length };
}

/** Mediana de horas entre publicación y primera postulación (solo vacantes con postulaciones). */
export function tiempoPrimeraPostulacionHoras(
  vacantes: { id: string; publicada_en: string | null }[],
  postulaciones: { vacante_id: string; creado_en: string }[],
): { mediana: number | null; muestras: number } {
  const primera = new Map<string, number>();
  for (const p of postulaciones) {
    const t = Date.parse(p.creado_en);
    const prev = primera.get(p.vacante_id);
    if (prev == null || t < prev) primera.set(p.vacante_id, t);
  }
  const horas: number[] = [];
  for (const v of vacantes) {
    if (!v.publicada_en) continue;
    const t = primera.get(v.id);
    if (t == null) continue;
    horas.push(Math.max(0, (t - Date.parse(v.publicada_en)) / HORA_MS));
  }
  return { mediana: mediana(horas), muestras: horas.length };
}

/**
 * Empresas cuya primera actividad cae en el periodo y que vuelven a tener
 * actividad entre 1 y `ventanaDias` días después de esa primera actividad.
 */
export function empresasQueVuelven(
  primeraActividad: Record<string, string>,
  actividades: { empresa_id: string; en: string }[],
  ventanaDias = 60,
): Fraccion {
  const vuelven = new Set<string>();
  for (const a of actividades) {
    const inicio = primeraActividad[a.empresa_id];
    if (!inicio) continue;
    const diff = Date.parse(a.en) - Date.parse(inicio);
    if (diff >= DIA_MS && diff <= ventanaDias * DIA_MS) vuelven.add(a.empresa_id);
  }
  return { num: vuelven.size, den: Object.keys(primeraActividad).length };
}

type PagoMin = { propietario_id: string; concepto: string; estado: string };

/** Propietarios del grupo con al menos un pago aprobado de alguno de los conceptos. */
export function conPagoAprobado(propietarios: string[], pagos: PagoMin[], conceptos: string[]): Fraccion {
  const pagaron = new Set(
    pagos.filter((p) => p.estado === "aprobado" && conceptos.includes(p.concepto)).map((p) => p.propietario_id),
  );
  const unicos = [...new Set(propietarios)];
  return { num: unicos.filter((id) => pagaron.has(id)).length, den: unicos.length };
}

/**
 * Vacantes aprobadas en moderación sin incidentes posteriores (reporte
 * confirmado o rechazo después de la aprobación). Se toma la primera aprobación.
 */
export function vacantesSinIncidentes(
  aprobaciones: { vacante_id: string; en: string }[],
  incidentes: { vacante_id: string; en: string }[],
): Fraccion {
  const primera = new Map<string, number>();
  for (const a of aprobaciones) {
    const t = Date.parse(a.en);
    const prev = primera.get(a.vacante_id);
    if (prev == null || t < prev) primera.set(a.vacante_id, t);
  }
  const conIncidente = new Set<string>();
  for (const i of incidentes) {
    const t = primera.get(i.vacante_id);
    if (t != null && Date.parse(i.en) > t) conIncidente.add(i.vacante_id);
  }
  return { num: primera.size - conIncidente.size, den: primera.size };
}

/* ---------------- Catálogo de KPIs ---------------- */

export type FormatoKpi = "pct" | "horas";

export type KpiId =
  | "candidatos_relevantes"
  | "ctr_recomendacion"
  | "postulacion_vista"
  | "lectura_digest_wsp"
  | "postulacion_clic_wsp"
  | "vacantes_con_postulacion"
  | "empresas_vuelven"
  | "free_a_pago"
  | "compra_empresa"
  | "tiempo_primera_postulacion"
  | "vacantes_sin_incidentes";

export type KpiDefinicion = {
  id: KpiId;
  nombre: string;
  formato: FormatoKpi;
  meta: MetaKpi;
  definicion: string;
};

export const KPIS: KpiDefinicion[] = [
  {
    id: "candidatos_relevantes",
    nombre: "Candidatos con ≥1 vacante relevante",
    formato: "pct",
    meta: { tipo: "min", valor: 60 },
    definicion: `Candidatos activos con al menos una vacante visible (publicada y aprobada) con score ≥ ${UMBRAL_RECOMENDACION}, sobre el total de candidatos activos. Foto al momento de la consulta (no depende del rango).`,
  },
  {
    id: "ctr_recomendacion",
    nombre: "CTR desde recomendación",
    formato: "pct",
    meta: { tipo: "min", valor: 8 },
    definicion:
      "Eventos vacante_vista con meta.fuente = \"recomendacion\" ÷ suma de meta.cantidad de los eventos recomendaciones_mostradas, en el rango.",
  },
  {
    id: "postulacion_vista",
    nombre: "Postulación / vista",
    formato: "pct",
    meta: { tipo: "min", valor: 10 },
    definicion: "Postulaciones creadas en el rango ÷ eventos vacante_vista en el rango (todas las fuentes).",
  },
  {
    id: "lectura_digest_wsp",
    nombre: "Lectura del digest de WhatsApp",
    formato: "pct",
    meta: { tipo: "min", valor: 40 },
    definicion: "Digests leídos ÷ digests entregados por la API de WhatsApp en el rango.",
  },
  {
    id: "postulacion_clic_wsp",
    nombre: "Postulación / clic WhatsApp",
    formato: "pct",
    meta: { tipo: "min", valor: 15 },
    definicion:
      "Postulaciones con fuente = \"whatsapp\" ÷ eventos vacante_vista con meta.fuente = \"whatsapp\", en el rango.",
  },
  {
    id: "vacantes_con_postulacion",
    nombre: "Vacantes con ≥1 postulación",
    formato: "pct",
    meta: { tipo: "min", valor: 70 },
    definicion:
      "Vacantes con publicada_en dentro del rango que tienen al menos una postulación (hasta hoy) ÷ vacantes publicadas en el rango.",
  },
  {
    id: "empresas_vuelven",
    nombre: "Empresas que vuelven en 60 días",
    formato: "pct",
    meta: { tipo: "min", valor: 30 },
    definicion:
      "Empresas cuya primera vacante se creó en el rango y que, entre 1 y 60 días después, crean o publican otra vacante o cambian estados de postulaciones ÷ empresas de esa cohorte.",
  },
  {
    id: "free_a_pago",
    nombre: "Free → pago (candidatos)",
    formato: "pct",
    meta: { tipo: "rango", min: 2, max: 5 },
    definicion:
      "Candidatos registrados en el rango con al menos un pago aprobado de suscripción o renovación (hasta hoy) ÷ candidatos registrados en el rango.",
  },
  {
    id: "compra_empresa",
    nombre: "Compra de destacado / Pro (empresas)",
    formato: "pct",
    meta: { tipo: "rango", min: 5, max: 15 },
    definicion:
      "Empresas activas (con alguna vacante publicada durante el rango) con un pago aprobado en el rango de vacante destacada, suscripción o renovación ÷ empresas activas.",
  },
  {
    id: "tiempo_primera_postulacion",
    nombre: "Tiempo a la primera postulación",
    formato: "horas",
    meta: { tipo: "max", valor: 48 },
    definicion:
      "Mediana de horas entre publicada_en y la primera postulación, para vacantes publicadas en el rango que ya tienen postulaciones.",
  },
  {
    id: "vacantes_sin_incidentes",
    nombre: "Vacantes sin incidentes tras moderación",
    formato: "pct",
    meta: { tipo: "min", valor: 95 },
    definicion:
      "Vacantes aprobadas por moderación en el rango (auditoría vacante.moderada → aprobada) sin reportes confirmados ni rechazo posterior a la aprobación ÷ vacantes aprobadas en el rango.",
  },
];

export type KpiResultado = KpiDefinicion & {
  valor: number | null;
  semaforo: Semaforo;
  num?: number;
  den?: number;
  /** Detalle del cálculo o motivo de "sin datos". */
  nota?: string;
};

export type EntradaKpi = Fraccion | { valor: number | null; muestras?: number } | { sinDatos: string };

export function construirKpi(def: KpiDefinicion, entrada: EntradaKpi, nota?: string): KpiResultado {
  if ("sinDatos" in entrada) {
    return { ...def, valor: null, semaforo: "sin_datos", nota: entrada.sinDatos };
  }
  if ("den" in entrada) {
    const valor = porcentaje(entrada.num, entrada.den);
    return {
      ...def,
      valor,
      semaforo: evaluarSemaforo(valor, def.meta),
      num: entrada.num,
      den: entrada.den,
      nota: valor == null ? (nota ?? "Sin datos en el rango.") : nota,
    };
  }
  return {
    ...def,
    valor: entrada.valor,
    semaforo: evaluarSemaforo(entrada.valor, def.meta),
    den: entrada.muestras,
    nota: entrada.valor == null ? (nota ?? "Sin datos en el rango.") : nota,
  };
}

export function formatearKpi(valor: number | null, formato: FormatoKpi): string {
  if (valor == null) return "—";
  if (formato === "horas") return `${valor < 10 ? valor.toFixed(1) : Math.round(valor)} h`;
  return `${valor < 10 ? valor.toFixed(1) : Math.round(valor)}%`;
}

/* ---------------- Uso de IA ---------------- */

export type FilaIA = {
  actor_id: string | null;
  feature: string;
  modelo: string | null;
  modelo_servido: string | null;
  plan: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number;
  cache_read_tokens: number;
  costo_usd: number | string;
  latencia_ms: number | null;
  estado: string;
  creado_en: string;
};

export type GrupoIA = { clave: string; llamadas: number; costoUsd: number };

export type ResumenIA = {
  llamadas: number;
  costoUsd: number;
  costoCop: number;
  trm: number;
  costoPromedioUsd: number | null;
  tokens: { input: number; output: number; cacheCreacion: number; cacheLectura: number };
  latenciaMediaMs: number | null;
  latenciaP95Ms: number | null;
  tasas: { error: number | null; validacionFallida: number | null; rechazo: number | null; sinCredenciales: number | null };
  porFeature: GrupoIA[];
  porModelo: (GrupoIA & { pedido: string; servido: string })[];
  porPlan: GrupoIA[];
  porDia: { fecha: string; llamadas: number; costoUsd: number }[];
  topUsuarios: (GrupoIA & { actorId: string })[];
};

function agrupar(filas: FilaIA[], clave: (f: FilaIA) => string): Map<string, GrupoIA> {
  const m = new Map<string, GrupoIA>();
  for (const f of filas) {
    const k = clave(f);
    const g = m.get(k) ?? { clave: k, llamadas: 0, costoUsd: 0 };
    g.llamadas++;
    g.costoUsd += Number(f.costo_usd) || 0;
    m.set(k, g);
  }
  return m;
}

const porCosto = (a: GrupoIA, b: GrupoIA) => b.costoUsd - a.costoUsd || b.llamadas - a.llamadas;

/** Agrega filas de ia_uso. `porDia` cubre los `dias` días que terminan en `hasta`. */
export function resumirUsoIA(
  filas: FilaIA[],
  opciones: { trm: number; hasta: Date; dias?: number },
): ResumenIA {
  const { trm, hasta, dias = 30 } = opciones;
  const llamadas = filas.length;
  const costoUsd = filas.reduce((s, f) => s + (Number(f.costo_usd) || 0), 0);
  const latencias = filas.map((f) => f.latencia_ms).filter((l): l is number => typeof l === "number");
  const tasa = (estado: string) => porcentaje(filas.filter((f) => f.estado === estado).length, llamadas);

  const modelos = new Map<string, GrupoIA & { pedido: string; servido: string }>();
  for (const f of filas) {
    const pedido = f.modelo ?? "—";
    const servido = f.modelo_servido ?? "—";
    const k = `${pedido}→${servido}`;
    const g = modelos.get(k) ?? { clave: k, pedido, servido, llamadas: 0, costoUsd: 0 };
    g.llamadas++;
    g.costoUsd += Number(f.costo_usd) || 0;
    modelos.set(k, g);
  }

  const diasMap = new Map<string, { llamadas: number; costoUsd: number }>();
  for (const f of filas) {
    const d = fechaBogota(new Date(f.creado_en));
    const g = diasMap.get(d) ?? { llamadas: 0, costoUsd: 0 };
    g.llamadas++;
    g.costoUsd += Number(f.costo_usd) || 0;
    diasMap.set(d, g);
  }
  const ultimo = inicioDiaBogota(fechaBogota(hasta)).getTime();
  const porDia: ResumenIA["porDia"] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const fecha = fechaBogota(new Date(ultimo - i * DIA_MS));
    porDia.push({ fecha, ...(diasMap.get(fecha) ?? { llamadas: 0, costoUsd: 0 }) });
  }

  return {
    llamadas,
    costoUsd,
    costoCop: costoUsd * trm,
    trm,
    costoPromedioUsd: llamadas ? costoUsd / llamadas : null,
    tokens: {
      input: filas.reduce((s, f) => s + (f.input_tokens || 0), 0),
      output: filas.reduce((s, f) => s + (f.output_tokens || 0), 0),
      cacheCreacion: filas.reduce((s, f) => s + (f.cache_creation_tokens || 0), 0),
      cacheLectura: filas.reduce((s, f) => s + (f.cache_read_tokens || 0), 0),
    },
    latenciaMediaMs: latencias.length ? latencias.reduce((s, l) => s + l, 0) / latencias.length : null,
    latenciaP95Ms: percentil(latencias, 95),
    tasas: {
      error: tasa("error"),
      validacionFallida: tasa("validacion_fallida"),
      rechazo: tasa("rechazo"),
      sinCredenciales: tasa("sin_credenciales"),
    },
    porFeature: [...agrupar(filas, (f) => f.feature).values()].sort(porCosto),
    porModelo: [...modelos.values()].sort(porCosto),
    porPlan: [...agrupar(filas, (f) => f.plan ?? "sin_plan").values()].sort(porCosto),
    porDia,
    topUsuarios: [...agrupar(filas.filter((f) => f.actor_id), (f) => f.actor_id!).values()]
      .sort(porCosto)
      .slice(0, 10)
      .map((g) => ({ ...g, actorId: g.clave })),
  };
}
