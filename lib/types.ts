/* ============================================================
   Tipos de dominio de CostaLaboral. Coinciden con el esquema
   SQL en supabase/migrations. `id` de candidato/empresa == auth.uid().
   ============================================================ */
import type {
  Modalidad,
  Disponibilidad,
  NivelEducativo,
  PlanId,
  EstadoPostulacion,
} from "./constants";

export type Candidato = {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string;
  ciudad: string;
  barrio: string | null;
  nivel_educativo: NivelEducativo;
  area_interes: string;
  experiencia: string | null; // texto libre — base para el match IA de Fase 2
  disponibilidad: Disponibilidad;
  plan: PlanId;
  plan_vence: string | null;
  postulaciones_usadas: number;
  creado_en: string;
  activo: boolean;
};

export type Empresa = {
  id: string;
  nombre_negocio: string;
  nombre_contacto: string;
  email: string;
  whatsapp: string;
  ciudad: string;
  sector: string;
  verificada: boolean;
  creado_en: string;
};

export type Vacante = {
  id: string;
  empresa_id: string;
  titulo: string;
  descripcion: string;
  requisitos: string;
  ciudad: string;
  modalidad: Modalidad;
  area: string;
  nivel_educativo_min: NivelEducativo;
  salario_min: number | null;
  salario_max: number | null;
  tiene_contrato: boolean;
  activa: boolean;
  expira_en: string;
  creado_en: string;
  vistas: number;
};

export type VacanteConEmpresa = Vacante & {
  empresa: Pick<Empresa, "id" | "nombre_negocio" | "sector" | "verificada" | "whatsapp">;
};

export type Postulacion = {
  id: string;
  candidato_id: string;
  vacante_id: string;
  estado: EstadoPostulacion;
  estado_seguimiento: string;
  score_match: number | null;
  match_razon: string | null;
  mensaje: string | null;
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

/** Candidato + score, para el panel de empresa. */
export type CandidatoMatch = {
  postulacion: Postulacion;
  candidato: Pick<
    Candidato,
    "id" | "nombre" | "ciudad" | "nivel_educativo" | "area_interes" | "experiencia" | "disponibilidad" | "whatsapp"
  >;
  score: number;
};
