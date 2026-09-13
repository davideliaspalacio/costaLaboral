/* ============================================================
   Tipos de la capa de IA (hoja de vida + LinkedIn). Puros: se
   pueden importar desde cliente y servidor.
   ============================================================ */

export type FeatureIA = "hv_generar" | "linkedin_generar";

export type EstadoIA = "ok" | "error" | "validacion_fallida" | "rechazo" | "sin_credenciales" | "fallback_local";

/* ---------------- Entrada del cuestionario ---------------- */

export type ExperienciaEntrada = {
  cargo: string;
  empresa: string;
  periodo: string;
  /** "Qué hacías", con las palabras del candidato. */
  descripcion: string;
};

/** Respuestas exactas del cuestionario (se guardan en hojas_de_vida.datos_fuente.entrada). */
export type EntradaHV = {
  cargoObjetivo: string;
  aniosExperiencia: number;
  experiencia: ExperienciaEntrada[];
  habilidades: string[];
  educacion: string[];
};

/** Contexto del perfil (sin datos de contacto ni nombre: no se envían al modelo). */
export type PerfilFuente = {
  ciudad: string;
  area: string;
  nivelEducativo: string;
};

export type DatosFuenteHV = {
  entrada: EntradaHV;
  perfil: PerfilFuente;
};

/* ---------------- Hoja de vida ---------------- */

export type ExperienciaHV = {
  cargo: string;
  empresa: string;
  periodo: string;
  logros: string[];
};

/** Contenido estructurado (coincide con hojas_de_vida.contenido). */
export type ContenidoHV = {
  resumen: string;
  habilidades: string[];
  experiencia: ExperienciaHV[];
  educacion: string[];
  logros: string[];
};

/* ---------------- LinkedIn ---------------- */

export type NivelLinkedIn = "basico" | "avanzado";

export type ExperienciaLinkedIn = {
  cargo: string;
  empresa: string;
  descripcion: string;
};

export type ContenidoLinkedIn = {
  titular: string;
  acerca: string;
  /** Solo avanzado. */
  titulares_alternativos?: string[];
  habilidades?: string[];
  experiencias?: ExperienciaLinkedIn[];
  palabras_clave?: string[];
};

/** Fuente de la generación de LinkedIn (linkedin_perfiles.fuente). */
export type FuenteLinkedIn = {
  tipo: "hoja_de_vida" | "perfil";
  hojaDeVidaId: string | null;
  perfil: PerfilFuente & { cargoObjetivo: string; experienciaLibre: string };
  /** Entrada exacta del cuestionario de la HV, si existe. */
  entrada: EntradaHV | null;
  /** Contenido de la HV aprobada por el candidato. */
  contenidoHV: ContenidoHV | null;
};

/* ---------------- Validación anti-invención ---------------- */

export type CodigoProblema =
  | "experiencia_inventada"
  | "experiencia_omitida"
  | "periodo_alterado"
  | "campo_restaurado"
  | "educacion_inventada"
  | "cifra_inventada"
  | "credencial_inventada"
  | "habilidad_no_aportada";

export type ProblemaValidacion = {
  codigo: CodigoProblema;
  severidad: "grave" | "leve";
  seccion: string;
  /** Referencia posicional (ej. "#2"). Nunca texto del candidato. */
  ref?: string;
};

export type ResultadoValidacion<T> = {
  ok: boolean;
  graves: number;
  problemas: ProblemaValidacion[];
  saneado: T;
};

/** Lo que se guarda en hojas_de_vida.validacion / linkedin_perfiles.validacion. */
export type ValidacionGuardada = {
  version: string;
  ok: boolean;
  graves: number;
  problemas: ProblemaValidacion[];
  estado_ia: EstadoIA;
  validado_en: string;
};
