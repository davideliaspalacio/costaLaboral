/* ============================================================
   Días hábiles en Colombia (zona America/Bogotá, UTC-5 sin DST).
   Plazos de Habeas Data (Ley 1581/2012):
     - Consulta: 10 días hábiles, prorrogable 5 (art. 14).
     - Reclamo:  15 días hábiles, prorrogable 8 (art. 15).
   Festivos: Ley 51 de 1983 ("Ley Emiliani") + fechas de Pascua.
   ============================================================ */

const OFFSET_BOGOTA_MS = -5 * 3_600_000;
const DIA_MS = 86_400_000;

export const PLAZOS_HABEAS_DATA = {
  consulta: { dias: 10, prorroga: 5 },
  reclamo: { dias: 15, prorroga: 8 },
} as const;

/** Tipos de solicitud que se tramitan como consulta; el resto son reclamos. */
export function claseSolicitud(tipo: string): "consulta" | "reclamo" {
  return tipo === "consulta" || tipo === "prueba_autorizacion" ? "consulta" : "reclamo";
}

/** Fecha civil (año, mes 1-12, día) → clave "YYYY-MM-DD". */
function clave(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function desdeUTC(ms: number): { y: number; m: number; d: number; dow: number } {
  const f = new Date(ms);
  return { y: f.getUTCFullYear(), m: f.getUTCMonth() + 1, d: f.getUTCDate(), dow: f.getUTCDay() };
}

/** Domingo de Pascua (algoritmo gregoriano anónimo). Devuelve ms UTC a medianoche. */
function pascua(anio: number): number {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(anio, mes - 1, dia);
}

/** Traslada al lunes siguiente si no cae en lunes (Ley Emiliani). */
function aLunes(ms: number): number {
  const dow = new Date(ms).getUTCDay();
  return dow === 1 ? ms : ms + (((8 - dow) % 7) || 7) * DIA_MS;
}

const cache = new Map<number, Set<string>>();

export function festivosColombia(anio: number): Set<string> {
  const guardado = cache.get(anio);
  if (guardado) return guardado;

  const fechas: number[] = [
    Date.UTC(anio, 0, 1), // Año nuevo
    Date.UTC(anio, 4, 1), // Día del trabajo
    Date.UTC(anio, 6, 20), // Independencia
    Date.UTC(anio, 7, 7), // Batalla de Boyacá
    Date.UTC(anio, 11, 8), // Inmaculada Concepción
    Date.UTC(anio, 11, 25), // Navidad
    aLunes(Date.UTC(anio, 0, 6)), // Reyes Magos
    aLunes(Date.UTC(anio, 2, 19)), // San José
    aLunes(Date.UTC(anio, 5, 29)), // San Pedro y San Pablo
    aLunes(Date.UTC(anio, 7, 15)), // Asunción de la Virgen
    aLunes(Date.UTC(anio, 9, 12)), // Día de la Raza
    aLunes(Date.UTC(anio, 10, 1)), // Todos los Santos
    aLunes(Date.UTC(anio, 10, 11)), // Independencia de Cartagena
  ];
  const p = pascua(anio);
  fechas.push(
    p - 3 * DIA_MS, // Jueves Santo
    p - 2 * DIA_MS, // Viernes Santo
    aLunes(p + 39 * DIA_MS), // Ascensión del Señor
    aLunes(p + 60 * DIA_MS), // Corpus Christi
    aLunes(p + 68 * DIA_MS), // Sagrado Corazón
  );

  const set = new Set(fechas.map((ms) => {
    const f = desdeUTC(ms);
    return clave(f.y, f.m, f.d);
  }));
  cache.set(anio, set);
  return set;
}

/** ¿El día civil de Bogotá que contiene `fecha` es hábil? */
export function esDiaHabil(fecha: Date): boolean {
  const f = desdeUTC(fecha.getTime() + OFFSET_BOGOTA_MS);
  if (f.dow === 0 || f.dow === 6) return false;
  return !festivosColombia(f.y).has(clave(f.y, f.m, f.d));
}

/**
 * Vencimiento: cuenta `dias` hábiles desde el día siguiente a `desde`
 * y devuelve el final (23:59:59.999 hora Bogotá) del último día.
 */
export function sumarDiasHabiles(desde: Date, dias: number): Date {
  const local = desdeUTC(desde.getTime() + OFFSET_BOGOTA_MS);
  let cursor = Date.UTC(local.y, local.m - 1, local.d); // medianoche civil (en "UTC ficticio")
  let restantes = dias;
  while (restantes > 0) {
    cursor += DIA_MS;
    const f = desdeUTC(cursor);
    const habil = f.dow !== 0 && f.dow !== 6 && !festivosColombia(f.y).has(clave(f.y, f.m, f.d));
    if (habil) restantes--;
  }
  return new Date(cursor + DIA_MS - 1 - OFFSET_BOGOTA_MS);
}
