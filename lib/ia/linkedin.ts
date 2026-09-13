import "server-only";
import { generarEstructurado, hayCredenciales } from "./cliente";
import { ContenidoLinkedInSchema, SalidaLinkedInAvanzadoSchema, SalidaLinkedInBasicoSchema } from "./esquemas";
import { MODELO_LOCAL } from "./hv";
import { PROMPT_VERSION, SISTEMA_LINKEDIN, mensajeUsuarioLinkedIn } from "./prompts/linkedin";
import { linkedinRespaldo } from "./respaldo";
import { registrarUsoIA } from "./uso";
import { VALIDACION_VERSION, validarLinkedIn } from "./validacion";
import type {
  ContenidoLinkedIn,
  EstadoIA,
  FuenteLinkedIn,
  NivelLinkedIn,
  ResultadoValidacion,
  ValidacionGuardada,
} from "./tipos";

/* ============================================================
   Generación del perfil de LinkedIn (básico o avanzado), con la
   misma validación anti-invención y el mismo tracking que la HV.
   ============================================================ */

export type GeneracionLinkedIn = {
  contenido: ContenidoLinkedIn;
  generadoPorIa: boolean;
  estado: EstadoIA;
  modelo: string;
  promptVersion: string;
  validacion: ValidacionGuardada;
  usoId: string | null;
};

export async function generarContenidoLinkedIn(
  fuente: FuenteLinkedIn,
  nivel: NivelLinkedIn,
  ctx: { actorId: string; plan: string },
): Promise<GeneracionLinkedIn> {
  const schema = nivel === "avanzado" ? SalidaLinkedInAvanzadoSchema : SalidaLinkedInBasicoSchema;
  const llamada = await generarEstructurado<ContenidoLinkedIn>({
    schema,
    sistema: SISTEMA_LINKEDIN,
    usuario: mensajeUsuarioLinkedIn(fuente, nivel),
  });

  let estado: EstadoIA = llamada.estado;
  let error = llamada.error;
  let contenido: ContenidoLinkedIn;
  let generadoPorIa = false;
  let resultado: ResultadoValidacion<ContenidoLinkedIn>;

  if (llamada.estado === "ok" && llamada.datos) {
    resultado = validarLinkedIn(llamada.datos, fuente, nivel);
    const limites = ContenidoLinkedInSchema.safeParse(resultado.saneado);
    if (!resultado.ok || !limites.success) {
      estado = "validacion_fallida";
      error = !limites.success ? "limites_excedidos" : `problemas_graves_${resultado.graves}`;
    }
    if (limites.success) {
      contenido = limites.data;
      generadoPorIa = true;
    } else {
      contenido = linkedinRespaldo(fuente, nivel);
    }
  } else {
    contenido = linkedinRespaldo(fuente, nivel);
    resultado = validarLinkedIn(contenido, fuente, nivel);
  }

  const usoId = await registrarUsoIA({
    actorId: ctx.actorId,
    feature: "linkedin_generar",
    entidad: "linkedin_perfiles",
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

  const validacion: ValidacionGuardada = {
    version: VALIDACION_VERSION,
    ok: resultado.ok,
    graves: resultado.graves,
    problemas: resultado.problemas,
    estado_ia: estado,
    validado_en: new Date().toISOString(),
  };

  return {
    contenido,
    generadoPorIa,
    estado,
    modelo: generadoPorIa ? (llamada.modeloServido ?? llamada.modelo) : MODELO_LOCAL,
    promptVersion: PROMPT_VERSION,
    validacion,
    usoId,
  };
}
