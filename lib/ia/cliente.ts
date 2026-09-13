import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { costoUsd, type UsoConIteraciones } from "./precios";

/* ============================================================
   Cliente de IA desacoplado (Anthropic, SDK oficial). Solo servidor.

   Decisiones:
   - Modelo: ANTHROPIC_MODEL (por defecto claude-opus-5). Pensamiento
     adaptativo por defecto del modelo; effort por defecto (high).
   - Salida estructurada: output_config.format con betaZodOutputFormat
     (decodificación restringida al JSON Schema del esquema zod).
     Usamos `beta.messages.create` y validamos nosotros con zod en vez
     de `beta.messages.parse`: parse lanza una excepción si el texto no
     es JSON válido (p. ej. negativa a mitad de salida o max_tokens) y
     con eso perderíamos `usage` y el costo de la llamada. Así siempre
     revisamos stop_reason primero y registramos tokens en todo caso.
   - Negativas: fallbacks del servidor `fallbacks: "default"` con la beta
     server-side-fallback-2026-07-01 (compatible con create + formato
     estructurado) en los modelos que la soportan. Si aun así la cadena
     se niega, stop_reason === "refusal" → estado "rechazo".
   - max_tokens 16000 (no streaming, dentro del timeout del SDK).
   ============================================================ */

export const MODELO_POR_DEFECTO = "claude-opus-5";
export const MAX_TOKENS = 16_000;
const MODELOS_CON_FALLBACK = new Set(["claude-opus-5", "claude-fable-5-1"]);
const BETA_FALLBACK = "server-side-fallback-2026-07-01";

export function modeloConfigurado(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || MODELO_POR_DEFECTO;
}

export function hayCredenciales(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export type EstadoLlamada = "ok" | "rechazo" | "error" | "sin_credenciales";

export type ResultadoLlamada<T> = {
  estado: EstadoLlamada;
  datos: T | null;
  modelo: string;
  modeloServido: string | null;
  usage: UsoConIteraciones | null;
  stopReason: string | null;
  requestId: string | null;
  latenciaMs: number;
  costoUsd: number;
  /** Código corto sin datos personales. */
  error: string | null;
};

let cliente: Anthropic | null = null;
function getCliente(): Anthropic {
  cliente ??= new Anthropic({ timeout: 180_000, maxRetries: 2 });
  return cliente;
}

/** Código de error estable y sin contenido del candidato. */
export function describirError(err: unknown): string {
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (err instanceof Anthropic.APIConnectionError) return "conexion";
  if (err instanceof Anthropic.APIError) {
    const tipo = (err.error as { error?: { type?: string } } | undefined)?.error?.type;
    return ["api", err.status ?? "sin_status", tipo].filter(Boolean).join("_");
  }
  if (err instanceof SyntaxError) return "json_invalido";
  return err instanceof Error ? `excepcion_${err.name}` : "excepcion";
}

export async function generarEstructurado<T>(opciones: {
  schema: z.ZodType<T>;
  sistema: string;
  usuario: string;
}): Promise<ResultadoLlamada<T>> {
  const modelo = modeloConfigurado();
  const inicio = Date.now();
  const vacio = {
    datos: null,
    modelo,
    modeloServido: null,
    usage: null,
    stopReason: null,
    requestId: null,
    costoUsd: 0,
  };

  if (!hayCredenciales()) {
    return { ...vacio, estado: "sin_credenciales", latenciaMs: 0, error: null };
  }

  try {
    const conFallback = MODELOS_CON_FALLBACK.has(modelo);
    const resp = await getCliente().beta.messages.create({
      model: modelo,
      max_tokens: MAX_TOKENS,
      system: opciones.sistema,
      messages: [{ role: "user", content: opciones.usuario }],
      output_config: { format: betaZodOutputFormat(opciones.schema) },
      ...(conFallback ? { betas: [BETA_FALLBACK], fallbacks: "default" as const } : {}),
    });

    const usage = resp.usage as unknown as UsoConIteraciones;
    const base = {
      modelo,
      modeloServido: resp.model ?? null,
      usage,
      stopReason: resp.stop_reason ?? null,
      requestId: resp._request_id ?? null,
      latenciaMs: Date.now() - inicio,
      costoUsd: costoUsd(modelo, usage, { stopReason: resp.stop_reason }),
    };

    if (resp.stop_reason === "refusal") {
      return { ...base, estado: "rechazo", datos: null, error: `refusal_${resp.stop_details?.category ?? "sin_categoria"}` };
    }
    if (resp.stop_reason === "max_tokens") {
      return { ...base, estado: "error", datos: null, error: "max_tokens" };
    }

    const texto = resp.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch {
      return { ...base, estado: "error", datos: null, error: "json_invalido" };
    }
    const parsed = opciones.schema.safeParse(json);
    if (!parsed.success) {
      return { ...base, estado: "error", datos: null, error: "esquema_invalido" };
    }
    return { ...base, estado: "ok", datos: parsed.data, error: null };
  } catch (err) {
    return { ...vacio, estado: "error", latenciaMs: Date.now() - inicio, error: describirError(err) };
  }
}
