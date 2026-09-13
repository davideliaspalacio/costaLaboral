/* ============================================================
   Tipos de dominio de CostaLaboral. Coinciden con el esquema
   SQL en supabase/migrations. `id` de candidato/empresa == auth.uid().
   Columnas "derivadas" (generated) son solo lectura: nunca las escribas.
   ============================================================ */
import type {
  Modalidad,
  TipoEmpleo,
  Disponibilidad,
  NivelEducativo,
  PlanId,
  PlanEmpresaId,
  EstadoPostulacion,
  EstadoVacante,
  EstadoModeracion,
  MotivoCierre,
  Fuente,
} from "./constants";
import type { DetalleMatch } from "./matching";

export type Candidato = {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string;
  ciudad: string;
  barrio: string | null;
  nivel_educativo: NivelEducativo;
  area_interes: string;
  experiencia: string | null;
  disponibilidad: Disponibilidad;
  /** Caché del plan vigente. Fuente de verdad: tabla suscripciones (lib/billing). */
  plan: PlanId;
  activo: boolean;
  wsp_opt_in: boolean;
  wsp_opt_in_en: string | null;
  wsp_opt_out_en: string | null;
  perfil_visible_empresas: boolean;
  mayor_de_edad: boolean;
  creado_en: string;
  actualizado_en: string;
};

export type VerificacionEstado = "sin_verificar" | "en_revision" | "verificada" | "rechazada";

export type Empresa = {
  id: string;
  nombre_negocio: string;
  nombre_contacto: string;
  email: string;
  whatsapp: string;
  ciudad: string;
  sector: string;
  razon_social: string | null;
  nit: string | null;
  descripcion: string | null;
  sitio_web: string | null;
  direccion: string | null;
  verificacion: VerificacionEstado;
  /** Derivada: verificacion === "verificada". Solo lectura. */
  verificada: boolean;
  verificacion_solicitada_en: string | null;
  verificada_en: string | null;
  verificada_por: string | null;
  verificacion_nota: string | null;
  /** Caché del plan vigente. Fuente de verdad: tabla suscripciones. */
  plan: PlanEmpresaId;
  creado_en: string;
  actualizado_en: string;
};

export type Vacante = {
  id: string;
  empresa_id: string;
  titulo: string;
  descripcion: string;
  requisitos: string;
  ciudad: string;
  modalidad: Modalidad;
  tipo: TipoEmpleo;
  area: string;
  nivel_educativo_min: NivelEducativo;
  disponibilidad_requerida: Disponibilidad;
  salario_min: number | null;
  salario_max: number | null;
  tiene_contrato: boolean;
  estado: EstadoVacante;
  estado_moderacion: EstadoModeracion;
  motivo_moderacion: string | null;
  motivo_cierre: MotivoCierre | null;
  /** Derivada: estado = publicada Y estado_moderacion = aprobada. Solo lectura. */
  es_publica: boolean;
  destacada_hasta: string | null;
  publicada_en: string | null;
  cerrada_en: string | null;
  expira_en: string;
  creado_en: string;
  actualizada_en: string;
  vistas: number;
};

export type EmpresaPublica = Pick<Empresa, "id" | "nombre_negocio" | "sector" | "verificada" | "whatsapp">;

export type VacanteConEmpresa = Vacante & { empresa: EmpresaPublica };

export type Postulacion = {
  id: string;
  candidato_id: string;
  vacante_id: string;
  estado: EstadoPostulacion;
  estado_actualizado_en: string;
  score_match: number | null;
  match_detalle: DetalleMatch | null;
  fuente: Fuente | null;
  mensaje: string | null;
  creado_en: string;
};

export type PostulacionHistorial = {
  id: number;
  postulacion_id: string;
  estado_anterior: EstadoPostulacion | null;
  estado_nuevo: EstadoPostulacion;
  actor_id: string | null;
  actor_tipo: "candidato" | "empresa" | "admin" | "sistema";
  nota: string | null;
  creado_en: string;
};

export type NotificacionWsp = {
  id: string;
  candidato_id: string;
  vacante_id: string | null;
  tipo: "enlace_real" | "fomo" | "limite_alcanzado" | "cierre_mes";
  mensaje: string;
  enviado_en: string;
  leido: boolean;
};

/** Candidato postulado + score, para el pipeline de empresa. */
export type CandidatoMatch = {
  postulacion: Postulacion;
  candidato: Pick<
    Candidato,
    "id" | "nombre" | "ciudad" | "nivel_educativo" | "area_interes" | "experiencia" | "disponibilidad" | "whatsapp" | "plan"
  >;
  score: number;
  detalle: DetalleMatch | null;
};
