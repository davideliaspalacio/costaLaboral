import "server-only";
import { generarEstructurado, hayCredenciales } from "./cliente";
import { ContenidoHVSchema, SalidaHVModeloSchema } from "./esquemas";
import { PROMPT_VERSION, SISTEMA_HV, mensajeUsuarioHV } from "./prompts/hv";
import { hvRespaldo } from "./respaldo";
import { registrarUsoIA } from "./uso";
import { VALIDACION_VERSION, validarHV } from "./validacion";
import type { ContenidoHV, DatosFuenteHV, EstadoIA, ResultadoValidacion, ValidacionGuardada } from "./tipos";

/* ============================================================
   Generación de hoja de vida: llamada → validación anti-invención →
   (saneado | respaldo determinista) → registro en ia_uso.
   ============================================================ */

export const MODELO_LOCAL = "local-determinista";

export type GeneracionHV = {
  contenido: ContenidoHV;
  generadaPorIa: boolean;
  estado: EstadoIA;
  modelo: string;
  promptVersion: string;
  validacion: ValidacionGuardada;
  usoId: string | null;
};

function guardable(v: ResultadoValidacion<unknown>, estado: EstadoIA): ValidacionGuardada {
  return {
    version: VALIDACION_VERSION,
    ok: v.ok,
    graves: v.graves,
    problemas: v.problemas,
    estado_ia: estado,
    validado_en: new Date().toISOString(),
  };
}

export async function generarContenidoHV(
  fuente: DatosFuenteHV,
  ctx: { actorId: string; plan: string },
): Promise<GeneracionHV> {
  const llamada = await generarEstructurado({
    schema: SalidaHVModeloSchema,
    sistema: SISTEMA_HV,
    usuario: mensajeUsuarioHV(fuente),
  });

  let estado: EstadoIA = llamada.estado;
  let error = llamada.error;
  let contenido: ContenidoHV;
  let generadaPorIa = false;
  let resultado: ResultadoValidacion<ContenidoHV>;

  if (llamada.estado === "ok" && llamada.datos) {
    resultado = validarHV(llamada.datos, fuente);
    const limites = ContenidoHVSchema.safeParse(resultado.saneado);
    if (!resultado.ok || !limites.success) {
      estado = "validacion_fallida";
      error = !limites.success ? "limites_excedidos" : `problemas_graves_${resultado.graves}`;
    }
    if (limites.success) {
      contenido = limites.data;
      generadaPorIa = true;
    } else {
      contenido = hvRespaldo(fuente);
    }
  } else {
    contenido = hvRespaldo(fuente);
    resultado = validarHV(contenido, fuente);
  }

  const modeloGuardado = generadaPorIa ? (llamada.modeloServido ?? llamada.modelo) : MODELO_LOCAL;

  const usoId = await registrarUsoIA({
    actorId: ctx.actorId,
    feature: "hv_generar",
    entidad: "hojas_de_vida",
    modelo: hayCredenciales() ? llamada.modelo : MODELO_LOCAL,
    modeloServido: llamada.modeloServido,
    promptVersion: PROMPT_VERSION,
    plan: ctx.plan,
    usage: llamada.usage,
    costoUsd: llamada.costoUsd,
    latenciaMs: llamada.latenciaMs,
    estado,
    error,
    requestId: llamada.requestId,
  });

  return {
    contenido,
    generadaPorIa,
    estado,
    modelo: modeloGuardado,
    promptVersion: PROMPT_VERSION,
    validacion: guardable(resultado, estado),
    usoId,
  };
}
