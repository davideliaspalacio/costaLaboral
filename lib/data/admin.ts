import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffConPermiso, type Permiso } from "@/lib/roles";
import { fechaBogota, inicioDiaBogota } from "@/lib/data/kpis";
import type { EventoTipo } from "@/lib/eventos";

/**
 * Capa de datos del panel de administración. Todas las consultas usan
 * `createAdminClient` (service-role) y autorizan en código con el permiso
 * de la sección: sin permiso se lanza un error para no filtrar datos.
 * Todas las listas están paginadas o con tope.
 */
async function requireStaff(permiso: Permiso = "ver") {
  const staff = await getStaffConPermiso(permiso);
  if (!staff) throw new Error("No autorizado: se requiere el permiso " + permiso);
  return staff;
}

export const POR_PAGINA = 20;
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Paginado<T> = { items: T[]; total: number; page: number; totalPaginas: number };

function rangoPagina(page: number, porPagina = POR_PAGINA) {
  const pagina = Math.max(1, Math.floor(page) || 1);
  const from = (pagina - 1) * porPagina;
  return { pagina, from, to: from + porPagina - 1 };
}

function paginado<T>(items: T[], total: number, pagina: number, porPagina = POR_PAGINA): Paginado<T> {
  return { items, total, page: pagina, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
}

/** Quita caracteres con significado en los filtros `or` de PostgREST. */
function terminoSeguro(q?: string): string | null {
  const t = q?.replace(/[,()*%\\]/g, " ").trim();
  return t ? t.slice(0, 80) : null;
}

type ConsultaConteo = ReturnType<ReturnType<ReturnType<typeof createAdminClient>["from"]>["select"]>;

async function contar(tabla: string, filtro?: (q: ConsultaConteo) => ConsultaConteo): Promise<number> {
  const admin = createAdminClient();
  let q = admin.from(tabla).select("*", { count: "exact", head: true });
  if (filtro) q = filtro(q);
  const { count } = await q;
  return count ?? 0;
}

/** Nombre visible de candidatos/empresas por id (sin copiar correos). */
async function nombresDePropietarios(ids: string[]): Promise<Record<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  if (!unicos.length) return {};
  const admin = createAdminClient();
  const [{ data: c }, { data: e }] = await Promise.all([
    admin.from("candidatos").select("id, nombre").in("id", unicos),
    admin.from("empresas").select("id, nombre_negocio").in("id", unicos),
  ]);
  const out: Record<string, string> = {};
  for (const x of c ?? []) out[x.id] = x.nombre;
  for (const x of e ?? []) out[x.id] = x.nombre_negocio;
  return out;
}

/* ---------------- Métricas avanzadas (dashboard) ---------------- */

export type EventoPorTipo = { tipo: string; total: number };
export type PuntoSerie = { fecha: string; total: number };

export type MetricasAvanzadas = {
  candidatosActivos: number;
  empresasVerificadas: number;
  vacantesPublicas: number;
  eventosPorTipo: EventoPorTipo[];
  serie14d: PuntoSerie[];
};

/** Conteos + eventos de los últimos 14 días agrupados por tipo y por día (tope 10.000). */
export async function getMetricasAvanzadas(ahora = new Date()): Promise<MetricasAvanzadas> {
  await requireStaff("ver");
  const admin = createAdminClient();

  const [candidatosActivos, empresasVerificadas, vacantesPublicas] = await Promise.all([
    contar("candidatos", (q) => q.eq("activo", true)),
    contar("empresas", (q) => q.eq("verificacion", "verificada")),
    contar("vacantes", (q) => q.eq("es_publica", true)),
  ]);

  const hoy = fechaBogota(ahora);
  const desde = new Date(inicioDiaBogota(hoy).getTime() - 13 * 86_400_000);

  const porTipo = new Map<string, number>();
  const porDia = new Map<string, number>();
  for (let from = 0; from < 10_000; from += 1000) {
    const { data } = await admin
      .from("eventos")
      .select("tipo, creado_en")
      .gte("creado_en", desde.toISOString())
      .order("creado_en", { ascending: false })
      .range(from, from + 999);
    for (const e of (data ?? []) as { tipo: string; creado_en: string }[]) {
      porTipo.set(e.tipo, (porTipo.get(e.tipo) ?? 0) + 1);
      const dia = fechaBogota(new Date(e.creado_en));
      porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
    }
    if (!data || data.length < 1000) break;
  }

  const serie14d: PuntoSerie[] = [];
  for (let i = 0; i < 14; i++) {
    const key = fechaBogota(new Date(desde.getTime() + i * 86_400_000));
    serie14d.push({ fecha: key, total: porDia.get(key) ?? 0 });
  }

  return {
    candidatosActivos,
    empresasVerificadas,
    vacantesPublicas,
    eventosPorTipo: [...porTipo.entries()].map(([tipo, total]) => ({ tipo, total })).sort((a, b) => b.total - a.total),
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

/** Eventos más recientes (paginación por cursor `antes` = creado_en). */
export async function getEventosRecientes(
  limite = 20,
  tipo?: string,
  antes?: string,
): Promise<{ items: EventoRow[]; siguiente: string | null }> {
  await requireStaff("ver");
  const admin = createAdminClient();
  const tope = Math.min(Math.max(1, limite), 200);
  let q = admin
    .from("eventos")
    .select("id, tipo, actor_id, actor_tipo, entidad, entidad_id, meta, creado_en")
    .order("creado_en", { ascending: false })
    .limit(tope + 1);
  if (tipo) q = q.eq("tipo", tipo);
  if (antes && !Number.isNaN(Date.parse(antes))) q = q.lt("creado_en", antes);
  const { data } = await q;
  const filas = (data ?? []) as EventoRow[];
  const items = filas.slice(0, tope);
  return { items, siguiente: filas.length > tope ? items[items.length - 1].creado_en : null };
}

/* ---------------- Candidatos ---------------- */

export type CandidatoRow = {
  id: string;
  nombre: string;
  ciudad: string;
  area_interes: string;
  nivel_educativo: string;
  plan: string;
  activo: boolean;
  wsp_opt_in: boolean;
  creado_en: string;
  suscripcion: { plan: string; estado: string; periodo_fin: string } | null;
};

/** Lista paginada de candidatos con búsqueda por nombre/ciudad y su suscripción vigente. */
export async function listarCandidatos({ q, page = 1 }: { q?: string; page?: number }): Promise<Paginado<CandidatoRow>> {
  await requireStaff("ver");
  const admin = createAdminClient();
  const { pagina, from, to } = rangoPagina(page);

  let query = admin
    .from("candidatos")
    .select("id, nombre, ciudad, area_interes, nivel_educativo, plan, activo, wsp_opt_in, creado_en", { count: "exact" })
    .order("creado_en", { ascending: false })
    .range(from, to);
  const termino = terminoSeguro(q);
  if (termino) query = query.or(`nombre.ilike.%${termino}%,ciudad.ilike.%${termino}%`);

  const { data, count } = await query;
  const filas = (data ?? []) as Omit<CandidatoRow, "suscripcion">[];
  const subs = new Map<string, CandidatoRow["suscripcion"]>();
  if (filas.length) {
    const { data: s } = await admin
      .from("suscripciones")
      .select("propietario_id, plan, estado, periodo_fin")
      .in("propietario_id", filas.map((c) => c.id))
      .in("estado", ["active", "past_due"]);
    for (const x of s ?? []) subs.set(x.propietario_id, { plan: x.plan, estado: x.estado, periodo_fin: x.periodo_fin });
  }
  return paginado(
    filas.map((c) => ({ ...c, suscripcion: subs.get(c.id) ?? null })),
    count ?? 0,
    pagina,
  );
}

/* ---------------- Empresas y verificación ---------------- */

export const ESTADOS_VERIFICACION = ["en_revision", "sin_verificar", "verificada", "rechazada"] as const;

export type EmpresaRow = {
  id: string;
  nombre_negocio: string;
  razon_social: string | null;
  nit: string | null;
  sitio_web: string | null;
  sector: string;
  ciudad: string;
  verificacion: string;
  verificacion_solicitada_en: string | null;
  verificada_en: string | null;
  verificacion_nota: string | null;
  plan: string;
  creado_en: string;
  total_vacantes: number;
};

export async function listarEmpresas({
  verificacion,
  q,
  page = 1,
}: {
  verificacion?: string;
  q?: string;
  page?: number;
}): Promise<Paginado<EmpresaRow>> {
  await requireStaff("ver");
  const admin = createAdminClient();
  const { pagina, from, to } = rangoPagina(page);

  let query = admin
    .from("empresas")
    .select(
      "id, nombre_negocio, razon_social, nit, sitio_web, sector, ciudad, verificacion, verificacion_solicitada_en, verificada_en, verificacion_nota, plan, creado_en, vacantes(count)",
      { count: "exact" },
    )
    .range(from, to);
  if (verificacion) query = query.eq("verificacion", verificacion);
  // La cola se atiende por orden de llegada.
  query =
    verificacion === "en_revision"
      ? query.order("verificacion_solicitada_en", { ascending: true, nullsFirst: false })
      : query.order("creado_en", { ascending: false });
  const termino = terminoSeguro(q);
  if (termino) query = query.or(`nombre_negocio.ilike.%${termino}%,razon_social.ilike.%${termino}%,nit.ilike.%${termino}%`);

  const { data, count } = await query;
  type FilaEmpresa = Omit<EmpresaRow, "total_vacantes"> & { vacantes?: { count: number }[] };
  const items: EmpresaRow[] = ((data ?? []) as unknown as FilaEmpresa[]).map(({ vacantes, ...e }) => ({
    ...e,
    total_vacantes: vacantes?.[0]?.count ?? 0,
  }));
  return paginado(items, count ?? 0, pagina);
}

export async function getConteosVerificacion(): Promise<Record<string, number>> {
  await requireStaff("ver");
  const conteos = await Promise.all(ESTADOS_VERIFICACION.map((e) => contar("empresas", (q) => q.eq("verificacion", e))));
  const out: Record<string, number> = { todas: conteos.reduce((s, n) => s + n, 0) };
  ESTADOS_VERIFICACION.forEach((e, i) => (out[e] = conteos[i]));
  return out;
}

/* ---------------- Vacantes (moderación) ---------------- */

export const ESTADOS_MODERACION_FILTRO = ["pendiente", "reportada", "rechazada", "aprobada"] as const;

export type ReporteResumen = { id: string; motivo: string; detalle: string | null; creado_en: string };

export type VacanteRow = {
  id: string;
  titulo: string;
  ciudad: string;
  area: string;
  estado: string;
  es_publica: boolean;
  estado_moderacion: string;
  motivo_moderacion: string | null;
  creado_en: string;
  publicada_en: string | null;
  empresa_id: string;
  empresa_nombre: string;
  empresa_verificacion: string;
  reportes: ReporteResumen[];
};

export async function listarVacantes({
  estado,
  page = 1,
}: {
  estado?: string;
  page?: number;
}): Promise<Paginado<VacanteRow>> {
  await requireStaff("moderar");
  const admin = createAdminClient();
  const { pagina, from, to } = rangoPagina(page);

  let query = admin
    .from("vacantes")
    .select(
      "id, titulo, ciudad, area, estado, es_publica, estado_moderacion, motivo_moderacion, creado_en, publicada_en, empresa_id, empresa:empresas(nombre_negocio, verificacion)",
      { count: "exact" },
    )
    .order("creado_en", { ascending: estado === "pendiente" })
    .range(from, to);
  if (estado) query = query.eq("estado_moderacion", estado);

  const { data, count } = await query;
  type FilaModeracion = Omit<VacanteRow, "empresa_nombre" | "empresa_verificacion" | "reportes"> & {
    empresa: { nombre_negocio: string; verificacion: string } | null;
  };
  const filas = (data ?? []) as unknown as FilaModeracion[];

  const reportes = new Map<string, ReporteResumen[]>();
  if (filas.length) {
    const { data: r } = await admin
      .from("reportes_vacante")
      .select("id, vacante_id, motivo, detalle, creado_en")
      .in("vacante_id", filas.map((v) => v.id))
      .eq("estado", "abierto")
      .order("creado_en", { ascending: false })
      .limit(500);
    for (const x of r ?? []) {
      const lista = reportes.get(x.vacante_id) ?? [];
      lista.push({ id: x.id, motivo: x.motivo, detalle: x.detalle, creado_en: x.creado_en });
      reportes.set(x.vacante_id, lista);
    }
  }

  const items: VacanteRow[] = filas.map((v) => ({
    id: v.id,
    titulo: v.titulo,
    ciudad: v.ciudad,
    area: v.area,
    estado: v.estado,
    es_publica: v.es_publica,
    estado_moderacion: v.estado_moderacion,
    motivo_moderacion: v.motivo_moderacion,
    creado_en: v.creado_en,
    publicada_en: v.publicada_en,
    empresa_id: v.empresa_id,
    empresa_nombre: v.empresa?.nombre_negocio ?? "—",
    empresa_verificacion: v.empresa?.verificacion ?? "sin_verificar",
    reportes: reportes.get(v.id) ?? [],
  }));
  return paginado(items, count ?? 0, pagina);
}

/** Conteos por estado de moderación (para las pestañas de filtro). */
export async function getConteosModeracion(): Promise<Record<string, number>> {
  await requireStaff("moderar");
  const conteos = await Promise.all(
    ESTADOS_MODERACION_FILTRO.map((e) => contar("vacantes", (q) => q.eq("estado_moderacion", e))),
  );
  const out: Record<string, number> = { todas: conteos.reduce((s, n) => s + n, 0) };
  ESTADOS_MODERACION_FILTRO.forEach((e, i) => (out[e] = conteos[i]));
  return out;
}

/* ---------------- Reportes abiertos agrupados ---------------- */

export type GrupoReportes = {
  vacante: {
    id: string;
    titulo: string;
    ciudad: string;
    estado: string;
    estado_moderacion: string;
    empresa_nombre: string;
  };
  total: number;
  motivos: { motivo: string; total: number }[];
  reportes: ReporteResumen[];
  ultimo: string;
};

const TOPE_REPORTES = 1000;

export async function listarReportesAbiertos(): Promise<{ grupos: GrupoReportes[]; truncado: boolean }> {
  await requireStaff("moderar");
  const admin = createAdminClient();
  const { data } = await admin
    .from("reportes_vacante")
    .select("id, vacante_id, motivo, detalle, creado_en")
    .eq("estado", "abierto")
    .order("creado_en", { ascending: false })
    .limit(TOPE_REPORTES);
  const filas = (data ?? []) as (ReporteResumen & { vacante_id: string })[];
  if (!filas.length) return { grupos: [], truncado: false };

  const ids = [...new Set(filas.map((r) => r.vacante_id))];
  const vacantes = new Map<string, GrupoReportes["vacante"]>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: v } = await admin
      .from("vacantes")
      .select("id, titulo, ciudad, estado, estado_moderacion, empresa:empresas(nombre_negocio)")
      .in("id", ids.slice(i, i + 200));
    type FilaVacante = Omit<GrupoReportes["vacante"], "empresa_nombre"> & { empresa: { nombre_negocio: string } | null };
    for (const x of (v ?? []) as unknown as FilaVacante[]) {
      vacantes.set(x.id, {
        id: x.id,
        titulo: x.titulo,
        ciudad: x.ciudad,
        estado: x.estado,
        estado_moderacion: x.estado_moderacion,
        empresa_nombre: x.empresa?.nombre_negocio ?? "—",
      });
    }
  }

  const grupos = new Map<string, GrupoReportes>();
  for (const r of filas) {
    const vacante = vacantes.get(r.vacante_id);
    if (!vacante) continue;
    const g = grupos.get(r.vacante_id) ?? { vacante, total: 0, motivos: [], reportes: [], ultimo: r.creado_en };
    g.total++;
    g.reportes.push({ id: r.id, motivo: r.motivo, detalle: r.detalle, creado_en: r.creado_en });
    const m = g.motivos.find((x) => x.motivo === r.motivo);
    if (m) m.total++;
    else g.motivos.push({ motivo: r.motivo, total: 1 });
    grupos.set(r.vacante_id, g);
  }
  const lista = [...grupos.values()]
    .map((g) => ({ ...g, motivos: g.motivos.sort((a, b) => b.total - a.total) }))
    .sort((a, b) => b.total - a.total || b.ultimo.localeCompare(a.ultimo));
  return { grupos: lista, truncado: filas.length >= TOPE_REPORTES };
}

/* ---------------- Auditoría ---------------- */

export type AuditRow = {
  id: number;
  actor_id: string | null;
  actor_tipo: string;
  actor_email: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  request_id: string | null;
  creado_en: string;
};

export type FiltrosAuditoria = {
  accion?: string;
  entidad?: string;
  entidadId?: string;
  actor?: string;
  desde?: string;
  hasta?: string;
  cursor?: string;
};

export const AUDITORIA_POR_PAGINA = 50;
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Auditoría con filtros y paginación por cursor sobre `id` (descendente). */
export async function listarAuditoria(f: FiltrosAuditoria): Promise<{ items: AuditRow[]; siguiente: string | null }> {
  await requireStaff("ver_auditoria");
  const admin = createAdminClient();
  let q = admin
    .from("audit_log")
    .select("id, actor_id, actor_tipo, actor_email, accion, entidad, entidad_id, antes, despues, metadata, ip, user_agent, request_id, creado_en")
    .order("id", { ascending: false })
    .limit(AUDITORIA_POR_PAGINA + 1);

  if (f.accion) q = q.eq("accion", f.accion);
  if (f.entidad) q = q.eq("entidad", f.entidad);
  if (f.entidadId) q = q.eq("entidad_id", f.entidadId.trim());
  const actor = f.actor?.trim();
  if (actor) {
    if (RE_UUID.test(actor)) q = q.eq("actor_id", actor);
    else q = q.ilike("actor_email", `%${actor.replace(/[%_\\]/g, "")}%`);
  }
  if (f.desde && RE_FECHA.test(f.desde)) q = q.gte("creado_en", inicioDiaBogota(f.desde).toISOString());
  if (f.hasta && RE_FECHA.test(f.hasta)) q = q.lt("creado_en", new Date(inicioDiaBogota(f.hasta).getTime() + 86_400_000).toISOString());
  if (f.cursor && /^\d+$/.test(f.cursor)) q = q.lt("id", Number(f.cursor));

  const { data } = await q;
  const filas = (data ?? []) as AuditRow[];
  const items = filas.slice(0, AUDITORIA_POR_PAGINA);
  return { items, siguiente: filas.length > AUDITORIA_POR_PAGINA ? String(items[items.length - 1].id) : null };
}

/** Historial de auditoría de una entidad concreta (para fichas de detalle). */
export async function getAuditoriaDeEntidad(entidad: string, entidadId: string, limite = 50): Promise<AuditRow[]> {
  await requireStaff("ver");
  const admin = createAdminClient();
  const { data } = await admin
    .from("audit_log")
    .select("id, actor_id, actor_tipo, actor_email, accion, entidad, entidad_id, antes, despues, metadata, ip, user_agent, request_id, creado_en")
    .eq("entidad", entidad)
    .eq("entidad_id", entidadId)
    .order("id", { ascending: false })
    .limit(limite);
  return (data ?? []) as AuditRow[];
}

/* ---------------- Pagos y suscripciones ---------------- */

export type PagoRow = {
  id: string;
  referencia: string;
  propietario_id: string;
  propietario_tipo: string;
  propietario_nombre: string | null;
  concepto: string;
  producto: string;
  proveedor: string;
  monto: number;
  moneda: string;
  estado: string;
  aprobado_en: string | null;
  creado_en: string;
};

export async function listarPagos({
  estado,
  concepto,
  desde,
  hasta,
  page = 1,
}: {
  estado?: string;
  concepto?: string;
  desde?: string;
  hasta?: string;
  page?: number;
}): Promise<Paginado<PagoRow>> {
  await requireStaff("ver_pagos");
  const admin = createAdminClient();
  const { pagina, from, to } = rangoPagina(page);
  let q = admin
    .from("pagos")
    .select("id, referencia, propietario_id, propietario_tipo, concepto, producto, proveedor, monto, moneda, estado, aprobado_en, creado_en", {
      count: "exact",
    })
    .order("creado_en", { ascending: false })
    .range(from, to);
  if (estado) q = q.eq("estado", estado);
  if (concepto) q = q.eq("concepto", concepto);
  if (desde && RE_FECHA.test(desde)) q = q.gte("creado_en", inicioDiaBogota(desde).toISOString());
  if (hasta && RE_FECHA.test(hasta)) q = q.lt("creado_en", new Date(inicioDiaBogota(hasta).getTime() + 86_400_000).toISOString());

  const { data, count } = await q;
  const filas = (data ?? []) as Omit<PagoRow, "propietario_nombre">[];
  const nombres = await nombresDePropietarios(filas.map((p) => p.propietario_id));
  return paginado(
    filas.map((p) => ({ ...p, propietario_nombre: nombres[p.propietario_id] ?? null })),
    count ?? 0,
    pagina,
  );
}

export type SuscripcionRow = {
  id: string;
  propietario_id: string;
  propietario_tipo: string;
  propietario_nombre: string | null;
  plan: string;
  proveedor: string;
  estado: string;
  periodo_inicio: string;
  periodo_fin: string;
  cancelar_al_final: boolean;
  cancelada_en: string | null;
};

export async function listarSuscripciones({
  estado,
  plan,
  page = 1,
}: {
  estado?: string;
  plan?: string;
  page?: number;
}): Promise<Paginado<SuscripcionRow>> {
  await requireStaff("ver_pagos");
  const admin = createAdminClient();
  const { pagina, from, to } = rangoPagina(page, 10);
  let q = admin
    .from("suscripciones")
    .select("id, propietario_id, propietario_tipo, plan, proveedor, estado, periodo_inicio, periodo_fin, cancelar_al_final, cancelada_en", {
      count: "exact",
    })
    .order("periodo_fin", { ascending: true })
    .range(from, to);
  if (estado) q = q.eq("estado", estado);
  if (plan) q = q.eq("plan", plan);
  const { data, count } = await q;
  const filas = (data ?? []) as Omit<SuscripcionRow, "propietario_nombre">[];
  const nombres = await nombresDePropietarios(filas.map((s) => s.propietario_id));
  return paginado(
    filas.map((s) => ({ ...s, propietario_nombre: nombres[s.propietario_id] ?? null })),
    count ?? 0,
    pagina,
    10,
  );
}

export type TotalesPagosMes = {
  mes: string;
  total: number;
  cantidad: number;
  porConcepto: { concepto: string; total: number; cantidad: number }[];
  reembolsado: number;
};

/** Totales de pagos aprobados en el mes calendario actual (Bogotá). */
export async function getTotalesPagosMes(ahora = new Date()): Promise<TotalesPagosMes> {
  await requireStaff("ver_pagos");
  const admin = createAdminClient();
  const mes = fechaBogota(ahora).slice(0, 7);
  const inicio = inicioDiaBogota(`${mes}-01`).toISOString();

  const aprobados: { monto: number; concepto: string }[] = [];
  for (let from = 0; from < 20_000; from += 1000) {
    const { data } = await admin
      .from("pagos")
      .select("monto, concepto")
      .eq("estado", "aprobado")
      .gte("aprobado_en", inicio)
      .order("id")
      .range(from, from + 999);
    aprobados.push(...((data ?? []) as { monto: number; concepto: string }[]));
    if (!data || data.length < 1000) break;
  }
  const { data: reemb } = await admin
    .from("pagos")
    .select("monto")
    .eq("estado", "reembolsado")
    .gte("actualizado_en", inicio)
    .limit(5000);

  const conceptos = new Map<string, { concepto: string; total: number; cantidad: number }>();
  for (const p of aprobados) {
    const c = conceptos.get(p.concepto) ?? { concepto: p.concepto, total: 0, cantidad: 0 };
    c.total += p.monto;
    c.cantidad++;
    conceptos.set(p.concepto, c);
  }
  return {
    mes,
    total: aprobados.reduce((s, p) => s + p.monto, 0),
    cantidad: aprobados.length,
    porConcepto: [...conceptos.values()].sort((a, b) => b.total - a.total),
    reembolsado: (reemb ?? []).reduce((s, p) => s + (p.monto as number), 0),
  };
}

/* ---------------- Solicitudes de titulares ---------------- */

export const ESTADOS_SOLICITUD = ["recibida", "en_tramite", "respondida", "cerrada"] as const;

export type SolicitudRow = {
  id: string;
  radicado: string;
  titular_id: string | null;
  nombre: string;
  tipo_documento: string;
  numero_documento: string;
  email: string;
  telefono: string | null;
  tipo: string;
  descripcion: string;
  estado: string;
  vence_en: string;
  prorrogada: boolean;
  respuesta: string | null;
  respondida_en: string | null;
  atendida_por: string | null;
  creado_en: string;
  actualizado_en: string;
};

/** Por defecto solo las abiertas (recibida/en trámite), por vencimiento más próximo. */
export async function listarSolicitudes({
  estado,
  page = 1,
}: {
  estado?: string;
  page?: number;
}): Promise<Paginado<Pick<SolicitudRow, "id" | "radicado" | "nombre" | "tipo" | "estado" | "vence_en" | "prorrogada" | "creado_en">>> {
  await requireStaff("atender_solicitudes");
  const admin = createAdminClient();
  const { pagina, from, to } = rangoPagina(page);
  let q = admin
    .from("solicitudes_titular")
    .select("id, radicado, nombre, tipo, estado, vence_en, prorrogada, creado_en", { count: "exact" })
    .order("vence_en", { ascending: true })
    .range(from, to);
  q = estado === "todas" ? q : estado ? q.eq("estado", estado) : q.in("estado", ["recibida", "en_tramite"]);
  const { data, count } = await q;
  type FilaSolicitud = Pick<SolicitudRow, "id" | "radicado" | "nombre" | "tipo" | "estado" | "vence_en" | "prorrogada" | "creado_en">;
  return paginado((data ?? []) as FilaSolicitud[], count ?? 0, pagina);
}

export async function getSolicitud(id: string): Promise<SolicitudRow | null> {
  await requireStaff("atender_solicitudes");
  if (!RE_UUID.test(id)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("solicitudes_titular").select("*").eq("id", id).maybeSingle();
  return (data as SolicitudRow) ?? null;
}

/* ---------------- Staff ---------------- */

export type StaffRow = {
  user_id: string;
  rol: string;
  nombre: string | null;
  email: string | null;
  creado_en: string;
};

/** Lista del equipo (tabla staff, tope 100). Los super_admin bootstrap por env no aparecen aquí. */
export async function getStaffList(): Promise<StaffRow[]> {
  await requireStaff("gestionar_staff");
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff")
    .select("user_id, rol, nombre, creado_en")
    .order("creado_en", { ascending: true })
    .limit(100);
  const filas = (data ?? []) as Omit<StaffRow, "email">[];
  const correos = await Promise.all(
    filas.map(async (m) => {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id);
      return u?.user?.email ?? null;
    }),
  );
  return filas.map((m, i) => ({ ...m, email: correos[i] }));
}
