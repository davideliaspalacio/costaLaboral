/* Etiquetas legibles para el área de empresa (puras, usables en cliente y servidor). */
import {
  AREAS,
  DISPONIBILIDAD,
  ESTADOS_VACANTE,
  MODALIDADES,
  NIVELES_EDUCATIVOS,
  SECTORES,
  TIPOS_EMPLEO,
  type TonoEstado,
} from "@/lib/constants";

type Opcion = { value: string; label: string };
const buscar = (lista: readonly Opcion[], v: string | null | undefined) => lista.find((x) => x.value === v)?.label ?? v ?? "—";

export const labelArea = (v?: string | null) => buscar(AREAS, v);
export const labelTipo = (v?: string | null) => buscar(TIPOS_EMPLEO, v);
export const labelModalidad = (v?: string | null) => buscar(MODALIDADES, v);
export const labelNivel = (v?: string | null) => buscar(NIVELES_EDUCATIVOS, v);
export const labelDisponibilidad = (v?: string | null) => buscar(DISPONIBILIDAD, v);
export const labelSector = (v?: string | null) => buscar(SECTORES, v);
export const labelEstadoVacante = (v?: string | null) => buscar(ESTADOS_VACANTE, v);

export const LABEL_FUENTE: Record<string, string> = {
  recomendacion: "Recomendación",
  busqueda: "Búsqueda",
  whatsapp: "WhatsApp",
  directo: "Directo",
  compartido: "Compartido",
};

export const LABEL_FACTOR: Record<string, string> = {
  ciudad: "Ciudad",
  area: "Área",
  educacion: "Educación",
  disponibilidad: "Disponibilidad",
};

export const MODERACION: Record<string, { label: string; tono: TonoEstado }> = {
  aprobada: { label: "Aprobada", tono: "success" },
  pendiente: { label: "En revisión", tono: "sol" },
  rechazada: { label: "Rechazada", tono: "danger" },
  reportada: { label: "Oculta por reportes", tono: "danger" },
};

export const VERIFICACION: Record<string, { label: string; tono: TonoEstado }> = {
  sin_verificar: { label: "Sin verificar", tono: "neutral" },
  en_revision: { label: "Verificación en revisión", tono: "sol" },
  verificada: { label: "Verificada", tono: "success" },
  rechazada: { label: "Verificación rechazada", tono: "danger" },
};

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });
}

export function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
}
