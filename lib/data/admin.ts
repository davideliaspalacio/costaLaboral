import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaff } from "@/lib/roles";
import type { EventoTipo } from "@/lib/eventos";

/**
 * Capa de datos del panel de administración. Todas las consultas usan
 * `createAdminClient` (service-role) y autorizan en código verificando
 * `getStaff()`: si no hay staff, se lanza un error para no filtrar datos.
 */
async function requireStaff() {
  const staff = await getStaff();
  if (!staff) throw new Error("No autorizado: se requiere sesión de staff.");
  return staff;
}

/* ---------------- Métricas avanzadas ---------------- */

export type EventoPorTipo = { tipo: string; total: number };
export type PuntoSerie = { fecha: string; total: number };

export type MetricasAvanzadas = {
  candidatos: number;
  candidatosActivos: number;
  empresas: number;
  empresasVerificadas: number;
  empresasPendientes: number;
  vacantesTotal: number;
  vacantesActivas: number;
  vacantesPendientes: number;
  vacantesReportadas: number;
  postulaciones: number;
  eventosTotal: number;
  eventosPorTipo: EventoPorTipo[];
  serie14d: PuntoSerie[];
};

async function contar(tabla: string, filtro?: (q: any) => any): Promise<number> {
  const admin = createAdminClient();
  let q = admin.from(tabla).select("*", { count: "exact", head: true });
  if (filtro) q = filtro(q);
  const { count } = await q;
  return count ?? 0;
}

/** Conteos globales + eventos agrupados por tipo + serie de eventos de los últimos 14 días. */
export async function getMetricasAvanzadas(): Promise<MetricasAvanzadas> {
  await requireStaff();
  const admin = createAdminClient();

  const [
    candidatos,
    candidatosActivos,
    empresas,
    empresasVerificadas,
    vacantesTotal,
    vacantesActivas,
    vacantesPendientes,
    vacantesReportadas,
    postulaciones,
    eventosTotal,
  ] = await Promise.all([
    contar("candidatos"),
    contar("candidatos", (q) => q.eq("activo", true)),
    contar("empresas"),
    contar("empresas", (q) => q.eq("verificada", true)),
    contar("vacantes"),
    contar("vacantes", (q) => q.eq("activa", true)),
    contar("vacantes", (q) => q.eq("estado_moderacion", "pendiente")),
    contar("vacantes", (q) => q.eq("estado_moderacion", "reportada")),
    contar("postulaciones"),
    contar("eventos"),
  ]);

  // Eventos de los últimos 14 días — se agrupan en memoria (dataset pequeño en Fase 1).
  const desde = new Date();
  desde.setDate(desde.getDate() - 13);
  desde.setHours(0, 0, 0, 0);

  const { data: eventos } = await admin
    .from("eventos")
    .select("tipo, creado_en")
    .gte("creado_en", desde.toISOString())
    .order("creado_en", { ascending: false })
    .limit(5000);

  const porTipo = new Map<string, number>();
  const porDia = new Map<string, number>();
  for (const e of (eventos ?? []) as { tipo: string; creado_en: string }[]) {
    porTipo.set(e.tipo, (porTipo.get(e.tipo) ?? 0) + 1);
    const dia = new Date(e.creado_en).toISOString().slice(0, 10);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }

  const eventosPorTipo: EventoPorTipo[] = [...porTipo.entries()]
    .map(([tipo, total]) => ({ tipo, total }))
    .sort((a, b) => b.total - a.total);

  const serie14d: PuntoSerie[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(desde);
    d.setDate(desde.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    serie14d.push({ fecha: key, total: porDia.get(key) ?? 0 });
  }

  return {
    candidatos,
    candidatosActivos,
    empresas,
    empresasVerificadas,
    empresasPendientes: empresas - empresasVerificadas,
    vacantesTotal,
    vacantesActivas,
    vacantesPendientes,
    vacantesReportadas,
    postulaciones,
    eventosTotal,
    eventosPorTipo,
    serie14d,
  };
}

/* ---------------- Feed de eventos ---------------- */

export type EventoRow = {
  id: string;
  tipo: EventoTipo | string;
  actor_id: string | null;
  actor_tipo: string | null;
  entidad: string | null;
  entidad_id: string | null;
  meta: Record<string, unknown>;
  creado_en: string;
};

/** Últimos eventos de tracking, opcionalmente filtrados por tipo. */
export async function getEventosRecientes(limite = 20, tipo?: string): Promise<EventoRow[]> {
  await requireStaff();
  const admin = createAdminClient();
  let q = admin
    .from("eventos")
    .select("id, tipo, actor_id, actor_tipo, entidad, entidad_id, meta, creado_en")
    .order("creado_en", { ascending: false })
    .limit(limite);
  if (tipo) q = q.eq("tipo", tipo);
  const { data } = await q;
  return (data ?? []) as EventoRow[];
}

/* ---------------- Listado de candidatos ---------------- */

export type CandidatoRow = {
  id: string;
  nombre: string;
  ciudad: string;
  area_interes: string;
  nivel_educativo: string;
  plan: string;
  activo: boolean;
  creado_en: string;
};

export const CANDIDATOS_POR_PAGINA = 20;

/** Lista paginada de candidatos con búsqueda por nombre/ciudad. */
export async function listarCandidatos({
  q,
  page = 1,
}: {
  q?: string;
  page?: number;
}): Promise<{ items: CandidatoRow[]; total: number; page: number; totalPaginas: number }> {
  await requireStaff();
  const admin = createAdminClient();
  const pagina = Math.max(1, page);
  const from = (pagina - 1) * CANDIDATOS_POR_PAGINA;
  const to = from + CANDIDATOS_POR_PAGINA - 1;

  let query = admin
    .from("candidatos")
    .select("id, nombre, ciudad, area_interes, nivel_educativo, plan, activo, creado_en", {
      count: "exact",
    })
    .order("creado_en", { ascending: false })
    .range(from, to);

  const termino = q?.trim();
  if (termino) {
    const like = `%${termino}%`;
    query = query.or(`nombre.ilike.${like},ciudad.ilike.${like}`);
  }

  const { data, count } = await query;
  const total = count ?? 0;
  return {
    items: (data ?? []) as CandidatoRow[],
    total,
    page: pagina,
    totalPaginas: Math.max(1, Math.ceil(total / CANDIDATOS_POR_PAGINA)),
  };
}

/* ---------------- Listado de empresas ---------------- */

export type EmpresaRow = {
  id: string;
  nombre_negocio: string;
  sector: string;
  ciudad: string;
  verificada: boolean;
  creado_en: string;
  total_vacantes: number;
};

/** Lista de empresas con nº de vacantes; las NO verificadas primero (cola de verificación). */
export async function listarEmpresas(): Promise<EmpresaRow[]> {
  await requireStaff();
  const admin = createAdminClient();
  const { data } = await admin
    .from("empresas")
    .select("id, nombre_negocio, sector, ciudad, verificada, creado_en, vacantes(count)")
    .order("verificada", { ascending: true })
    .order("creado_en", { ascending: false });

  return ((data ?? []) as any[]).map((e) => ({
    id: e.id,
    nombre_negocio: e.nombre_negocio,
    sector: e.sector,
    ciudad: e.ciudad,
    verificada: e.verificada,
    creado_en: e.creado_en,
    total_vacantes: e.vacantes?.[0]?.count ?? 0,
  }));
}

/* ---------------- Listado de vacantes (moderación) ---------------- */

export type VacanteRow = {
  id: string;
  titulo: string;
  ciudad: string;
  area: string;
  activa: boolean;
  estado_moderacion: string;
  motivo_moderacion: string | null;
  creado_en: string;
  empresa_nombre: string;
};

/** Lista de vacantes para moderación, filtrable por estado_moderacion. */
export async function listarVacantes({
  estado,
}: {
  estado?: string;
} = {}): Promise<VacanteRow[]> {
  await requireStaff();
  const admin = createAdminClient();
  let query = admin
    .from("vacantes")
    .select(
      "id, titulo, ciudad, area, activa, estado_moderacion, motivo_moderacion, creado_en, empresa:empresas(nombre_negocio)",
    )
    .order("creado_en", { ascending: false })
    .limit(200);

  if (estado) query = query.eq("estado_moderacion", estado);

  const { data } = await query;
  return ((data ?? []) as any[]).map((v) => ({
    id: v.id,
    titulo: v.titulo,
    ciudad: v.ciudad,
    area: v.area,
    activa: v.activa,
    estado_moderacion: v.estado_moderacion,
    motivo_moderacion: v.motivo_moderacion,
    creado_en: v.creado_en,
    empresa_nombre: v.empresa?.nombre_negocio ?? "—",
  }));
}

/** Conteos por estado de moderación (para las pestañas de filtro). */
export async function getConteosModeracion(): Promise<Record<string, number>> {
  await requireStaff();
  const estados = ["aprobada", "pendiente", "rechazada", "reportada"];
  const conteos = await Promise.all(
    estados.map((e) => contar("vacantes", (q) => q.eq("estado_moderacion", e))),
  );
  const total = await contar("vacantes");
  const out: Record<string, number> = { todas: total };
  estados.forEach((e, i) => (out[e] = conteos[i]));
  return out;
}

/* ---------------- Staff ---------------- */

export type StaffRow = {
  user_id: string;
  rol: string;
  nombre: string | null;
  creado_en: string;
};

/** Lista del equipo (tabla staff). Los super_admin bootstrap por env no aparecen aquí. */
export async function getStaffList(): Promise<StaffRow[]> {
  await requireStaff();
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff")
    .select("user_id, rol, nombre, creado_en")
    .order("creado_en", { ascending: true });
  return (data ?? []) as StaffRow[];
}
