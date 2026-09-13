/* ============================================================
   Precios de la API de Anthropic (USD por millón de tokens) y
   cálculo de costo por llamada. Puro.

   - Escritura de caché: 5 min = 1,25× input; 1 h = 2× input.
   - Lectura de caché: 0,1× input.
   - Los tokens de thinking vienen dentro de output_tokens.
   - Con fallbacks del servidor, `usage.iterations` es la fuente de
     verdad por intento: cada intento se cobra con la tarifa de SU
     modelo; los intentos rechazados antes de producir salida no se
     cobran. Sin iterations se usa el `usage` de nivel superior.
   ============================================================ */

export type Tarifa = { input: number; output: number };

export const PRECIOS: Record<string, Tarifa> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export const FACTOR_CACHE_ESCRITURA_5M = 1.25;
export const FACTOR_CACHE_ESCRITURA_1H = 2;
export const FACTOR_CACHE_LECTURA = 0.1;

export type UsoTokens = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation?: { ephemeral_5m_input_tokens?: number | null; ephemeral_1h_input_tokens?: number | null } | null;
};

export type IteracionUso = UsoTokens & { type: string; model?: string | null };

export type UsoConIteraciones = UsoTokens & { iterations?: IteracionUso[] | null };

/** Tarifa de un modelo; acepta alias con sufijo (ej. "claude-haiku-4-5-20251001"). */
export function tarifaDe(modelo: string | null | undefined): Tarifa | null {
  if (!modelo) return null;
  if (PRECIOS[modelo]) return PRECIOS[modelo];
  const clave = Object.keys(PRECIOS)
    .filter((k) => modelo.startsWith(`${k}-`))
    .sort((a, b) => b.length - a.length)[0];
  return clave ? PRECIOS[clave] : null;
}

const n = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

/** Costo en USD de un tramo de uso con una tarifa. */
export function costoTramo(tarifa: Tarifa, u: UsoTokens): number {
  const porToken = (usdMTok: number) => usdMTok / 1_000_000;
  const escrituraTotal = n(u.cache_creation_input_tokens);
  const e5 = n(u.cache_creation?.ephemeral_5m_input_tokens);
  const e1h = n(u.cache_creation?.ephemeral_1h_input_tokens);
  const sinDesglose = Math.max(0, escrituraTotal - e5 - e1h);
  const escritura =
    (e5 + sinDesglose) * FACTOR_CACHE_ESCRITURA_5M * porToken(tarifa.input) +
    e1h * FACTOR_CACHE_ESCRITURA_1H * porToken(tarifa.input);
  return (
    n(u.input_tokens) * porToken(tarifa.input) +
    n(u.output_tokens) * porToken(tarifa.output) +
    escritura +
    n(u.cache_read_input_tokens) * FACTOR_CACHE_LECTURA * porToken(tarifa.input)
  );
}

const redondear = (v: number) => Math.round(v * 1_000_000) / 1_000_000;

/**
 * Costo total en USD de una respuesta.
 * @param modelo Modelo pedido (se usa si una iteración no trae su propio modelo).
 * @param opciones.stopReason stop_reason final: una negativa sin salida no se cobra.
 */
export function costoUsd(
  modelo: string,
  usage: UsoConIteraciones | null | undefined,
  opciones: { stopReason?: string | null } = {},
): number {
  if (!usage) return 0;
  const iteraciones = usage.iterations ?? [];

  if (iteraciones.length > 0) {
    const ultima = iteraciones.length - 1;
    let total = 0;
    iteraciones.forEach((it, i) => {
      const esIntentoDeModelo = it.type === "message" || it.type === "fallback_message";
      const rechazadoSinSalida =
        esIntentoDeModelo && n(it.output_tokens) === 0 && (i < ultima || opciones.stopReason === "refusal");
      if (rechazadoSinSalida) return;
      const tarifa = tarifaDe(it.model ?? modelo);
      if (tarifa) total += costoTramo(tarifa, it);
    });
    return redondear(total);
  }

  if (opciones.stopReason === "refusal" && n(usage.output_tokens) === 0) return 0;
  const tarifa = tarifaDe(modelo);
  return tarifa ? redondear(costoTramo(tarifa, usage)) : 0;
}

/** Suma de tokens a registrar en ia_uso (todas las iteraciones, cobradas o no). */
export function totalesTokens(usage: UsoConIteraciones | null | undefined): {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
} {
  if (!usage) return { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 };
  const fuentes: UsoTokens[] = usage.iterations?.length ? usage.iterations : [usage];
  return fuentes.reduce(
    (acc, u) => ({
      input: acc.input + n(u.input_tokens),
      output: acc.output + n(u.output_tokens),
      cacheCreation: acc.cacheCreation + n(u.cache_creation_input_tokens),
      cacheRead: acc.cacheRead + n(u.cache_read_input_tokens),
    }),
    { input: 0, output: 0, cacheCreation: 0, cacheRead: 0 },
  );
}
