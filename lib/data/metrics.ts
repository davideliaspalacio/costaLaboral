import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffConPermiso, type Permiso } from "@/lib/roles";
import { sumarDiasHabiles } from "@/lib/legal/dias-habiles";
import { log } from "@/lib/log";
import {
  KPIS,
  candidatosConVacanteRelevante,
  conPagoAprobado,
  construirKpi,
  contarVistas,
  empresasQueVuelven,
  resumirUsoIA,
  sumarRecomendacionesMostradas,
  tiempoPrimeraPostulacionHoras,
  vacantesConPostulacion,
  vacantesSinIncidentes,
  type EntradaKpi,
  type FilaIA,
  type KpiId,
  type KpiResultado,
  type Rango,
  type ResumenIA,
} from "@/lib/data/kpis";
import { DIAS_ALERTA_SOLICITUD } from "@/components/admin/labels";

/* ============================================================
   Consultas de métricas, colas, KPIs y uso de IA del panel.
   Autorizan en código (service-role). Todas acotadas por fecha y
   con tope de filas; el cálculo vive en lib/data/kpis.ts (puro).
   ============================================================ */

const DIA_MS = 86_400_000;
const PAGINA = 1000; // max_rows de PostgREST
const TOPE_FILAS = 20_000;

async function exigir(permiso: Permiso) {
  const staff = await getStaffConPermiso(permiso);
  if (!staff) throw new Error("No autorizado: permiso requerido " + permiso);
  return staff;
}

type Respuesta<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/** Trae filas en páginas de 1000 hasta `tope`. Devuelve también si se truncó. */
async function traerPaginado<T>(
  consulta: (desde: number, hasta: number) => Respuesta<T>,
  tope = TOPE_FILAS,
): Promise<{ filas: T[]; truncado: boolean }> {
  const filas: T[] = [];
  for (let desde = 0; desde < tope; desde += PAGINA) {
    const { data, error } = await consulta(desde, Math.min(desde + PAGINA, tope) - 1);
    if (error) {
      log.error("admin_consulta_fallo", { err: error.message });
      break;
    }
    filas.push(...(data ?? []));
    if (!data || data.length < PAGINA) return { filas, truncado: false };
  }
  return { filas, truncado: filas.length >= tope };
}

type ConsultaConteo = ReturnType<ReturnType<ReturnType<typeof createAdminClient>["from"]>["select"]>;

async function contar(tabla: string, filtro?: (q: ConsultaConteo) => ConsultaConteo): Promise<number> {
  const admin = createAdminClient();
  let q = admin.from(tabla).select("*", { count: "exact", head: true });
  if (filtro) q = filtro(q);
  const { count } = await q;
  return count ?? 0;
}

/* ---------------- Métricas generales ---------------- */

export type Metricas = {
  candidatos: number;
  empresas: number;
  vacantesPublicas: number;
  vacantesTotal: number;
  postulaciones: number;
  notifEnviadas: number;
  notifLeidas: number;
  lecturaNotif: number; // %
  vistasPromedio: number;
  ratioCandidatosVacante: number;
};

export async function getMetricas(): Promise<Metricas> {
  await exigir("ver");
  const admin = createAdminClient();

  const [candidatos, empresas, vacantesTotal, vacantesPublicas, postulaciones, notifEnviadas, notifLeidas] =
    await Promise.all([
      contar("candidatos"),
      contar("empresas"),
      contar("vacantes"),
      contar("vacantes", (q) => q.eq("es_publica", true)),
      contar("postulaciones"),
      contar("notificaciones_wsp"),
      contar("notificaciones_wsp", (q) => q.eq("leido", true)),
    ]);

  // Vistas promedio de las vacantes públicas (acotado por tope).
  const { filas } = await traerPaginado<{ vistas: number | null }>(
    (d, h) => admin.from("vacantes").select("vistas").eq("es_publica", true).range(d, h),
    5000,
  );
  const totalVistas = filas.reduce((s, r) => s + (r.vistas ?? 0), 0);

  return {
    candidatos,
    empresas,
    vacantesTotal,
    vacantesPublicas,
    postulaciones,
    notifEnviadas,
    notifLeidas,
    lecturaNotif: notifEnviadas ? Math.round((notifLeidas / notifEnviadas) * 100) : 0,
    vistasPromedio: filas.length ? Math.round(totalVistas / filas.length) : 0,
    ratioCandidatosVacante: vacantesPublicas ? +(candidatos / vacantesPublicas).toFixed(1) : 0,
  };
}

/* ---------------- Colas pendientes (dashboard) ---------------- */

export type ColasPendientes = {
  vacantesRevision: number;
  vacantesReportadas: number;
  reportesAbiertos: number;
  verificacionesRevision: number;
  solicitudesPorVencer: number;
  solicitudesVencidas: number;
};

const SOLICITUD_ABIERTA = ["recibida", "en_tramite"];

export async function getColasPendientes(ahora = new Date()): Promise<ColasPendientes> {
  await exigir("ver");
  const limiteAlerta = sumarDiasHabiles(ahora, DIAS_ALERTA_SOLICITUD).toISOString();
  const ya = ahora.toISOString();
  const [vacantesRevision, vacantesReportadas, reportesAbiertos, verificacionesRevision, solicitudesPorVencer, solicitudesVencidas] =
    await Promise.all([
      contar("vacantes", (q) => q.eq("estado_moderacion", "pendiente")),
      contar("vacantes", (q) => q.eq("estado_moderacion", "reportada")),
      contar("reportes_vacante", (q) => q.eq("estado", "abierto")),
      contar("empresas", (q) => q.eq("verificacion", "en_revision")),
      contar("solicitudes_titular", (q) => q.in("estado", SOLICITUD_ABIERTA).gte("vence_en", ya).lte("vence_en", limiteAlerta)),
      contar("solicitudes_titular", (q) => q.in("estado", SOLICITUD_ABIERTA).lt("vence_en", ya)),
    ]);
  return { vacantesRevision, vacantesReportadas, reportesAbiertos, verificacionesRevision, solicitudesPorVencer, solicitudesVencidas };
}

/* ---------------- KPIs ---------------- */

export type ResultadoKpis = { kpis: KpiResultado[]; truncado: boolean; generadoEn: string };

const SIN_WSP = "Sin datos: requiere integración WhatsApp (sección 9).";

function trozos<T>(arr: T[], n = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export async function getKpis(rango: Rango, ahora = new Date()): Promise<ResultadoKpis> {
  await exigir("ver_kpis");
  const admin = createAdminClient();
  const desde = rango.desde.toISOString();
  const hasta = rango.hasta.toISOString();
  const hasta60 = new Date(Math.min(rango.hasta.getTime() + 60 * DIA_MS, ahora.getTime())).toISOString();
  let truncado = false;
  const marcar = <T>(r: { filas: T[]; truncado: boolean }) => {
    truncado ||= r.truncado;
    return r.filas;
  };

  const [
    candidatos,
    vacantesVisibles,
    vistas,
    mostradas,
    postulacionesRango,
    postulacionesWsp,
    vacantesPublicadas,
    vacantesHistoricas,
    actividadEmpresas,
    candidatosNuevos,
    pagosCandidatos,
    vacantesActivasRango,
    pagosEmpresas,
    aprobaciones,
    rechazosPosteriores,
    reportesConfirmados,
  ] = await Promise.all([
    traerPaginado<{ ciudad: string; area_interes: string; nivel_educativo: string; disponibilidad: string }>((d, h) =>
      admin.from("candidatos").select("ciudad, area_interes, nivel_educativo, disponibilidad").eq("activo", true).order("id").range(d, h),
    ).then(marcar),
    traerPaginado<{ ciudad: string; area: string; nivel_educativo_min: string; modalidad: string; disponibilidad_requerida: string }>(
      (d, h) =>
        admin
          .from("vacantes")
          .select("ciudad, area, nivel_educativo_min, modalidad, disponibilidad_requerida")
          .eq("es_publica", true)
          .order("id")
          .range(d, h),
      5000,
    ).then(marcar),
    traerPaginado<{ fuente: string | null }>(
      (d, h) =>
        admin.from("eventos").select("fuente:meta->>fuente").eq("tipo", "vacante_vista").gte("creado_en", desde).lte("creado_en", hasta).order("creado_en").range(d, h),
      100_000,
    ).then(marcar),
    traerPaginado<{ cantidad: string | null }>((d, h) =>
      admin.from("eventos").select("cantidad:meta->>cantidad").eq("tipo", "recomendaciones_mostradas").gte("creado_en", desde).lte("creado_en", hasta).order("creado_en").range(d, h),
    ).then(marcar),
    contar("postulaciones", (q) => q.gte("creado_en", desde).lte("creado_en", hasta)),
    contar("postulaciones", (q) => q.eq("fuente", "whatsapp").gte("creado_en", desde).lte("creado_en", hasta)),
    traerPaginado<{ id: string; publicada_en: string | null }>((d, h) =>
      admin.from("vacantes").select("id, publicada_en").gte("publicada_en", desde).lte("publicada_en", hasta).order("id").range(d, h),
    ).then(marcar),
    // Primera vacante de cada empresa + actividad hasta 60 días después del rango.
    traerPaginado<{ empresa_id: string; creado_en: string; publicada_en: string | null }>((d, h) =>
      admin.from("vacantes").select("empresa_id, creado_en, publicada_en").lte("creado_en", hasta60).order("creado_en").range(d, h),
    ).then(marcar),
    traerPaginado<{ actor_id: string; creado_en: string }>((d, h) =>
      admin
        .from("audit_log")
        .select("actor_id, creado_en")
        .eq("actor_tipo", "empresa")
        .in("accion", ["postulacion.estado_cambiado", "vacante.publicada", "vacante.creada", "vacante.reanudada", "vacante.reabierta"])
        .gte("creado_en", desde)
        .lte("creado_en", hasta60)
        .order("id")
        .range(d, h),
    ).then(marcar),
    traerPaginado<{ id: string }>((d, h) =>
      admin.from("candidatos").select("id").gte("creado_en", desde).lte("creado_en", hasta).order("id").range(d, h),
    ).then(marcar),
    traerPaginado<{ propietario_id: string; concepto: string; estado: string }>((d, h) =>
      admin
        .from("pagos")
        .select("propietario_id, concepto, estado")
        .eq("propietario_tipo", "candidato")
        .eq("estado", "aprobado")
        .in("concepto", ["suscripcion", "renovacion"])
        .gte("creado_en", desde)
        .order("id")
        .range(d, h),
    ).then(marcar),
    traerPaginado<{ empresa_id: string }>((d, h) =>
      admin
        .from("vacantes")
        .select("empresa_id")
        .not("publicada_en", "is", null)
        .lte("publicada_en", hasta)
        .or(`cerrada_en.is.null,cerrada_en.gte.${desde}`)
        .order("id")
        .range(d, h),
    ).then(marcar),
    traerPaginado<{ propietario_id: string; concepto: string; estado: string }>((d, h) =>
      admin
        .from("pagos")
        .select("propietario_id, concepto, estado")
        .eq("propietario_tipo", "empresa")
        .eq("estado", "aprobado")
        .in("concepto", ["vacante_destacada", "suscripcion", "renovacion"])
        .gte("aprobado_en", desde)
        .lte("aprobado_en", hasta)
        .order("id")
        .range(d, h),
    ).then(marcar),
    traerPaginado<{ entidad_id: string; creado_en: string }>((d, h) =>
      admin
        .from("audit_log")
        .select("entidad_id, creado_en")
        .eq("accion", "vacante.moderada")
        .eq("despues->>estado_moderacion", "aprobada")
        .gte("creado_en", desde)
        .lte("creado_en", hasta)
        .order("id")
        .range(d, h),
    ).then(marcar),
    traerPaginado<{ entidad_id: string; creado_en: string }>((d, h) =>
      admin
        .from("audit_log")
        .select("entidad_id, creado_en")
        .eq("accion", "vacante.moderada")
        .eq("despues->>estado_moderacion", "rechazada")
        .gte("creado_en", desde)
        .order("id")
        .range(d, h),
    ).then(marcar),
    traerPaginado<{ vacante_id: string; resuelto_en: string | null }>((d, h) =>
      admin.from("reportes_vacante").select("vacante_id, resuelto_en").eq("estado", "resuelto").gte("resuelto_en", desde).order("id").range(d, h),
    ).then(marcar),
  ]);

  // Postulaciones de las vacantes publicadas en el rango (por lotes de ids).
  const postulacionesDeVacantes: { vacante_id: string; creado_en: string }[] = [];
  for (const lote of trozos(vacantesPublicadas.map((v) => v.id))) {
    const r = await traerPaginado<{ vacante_id: string; creado_en: string }>((d, h) =>
      admin.from("postulaciones").select("vacante_id, creado_en").in("vacante_id", lote).order("id").range(d, h),
    );
    postulacionesDeVacantes.push(...marcar(r));
  }

  // Cohorte de empresas: primera vacante creada dentro del rango.
  // Postgres devuelve "+00:00" con microsegundos: comparar como fechas, no como texto.
  const primera: Record<string, string> = {};
  const yaVista = new Set<string>();
  for (const v of vacantesHistoricas) {
    if (yaVista.has(v.empresa_id)) continue;
    yaVista.add(v.empresa_id); // ordenadas por creado_en: la primera es la más antigua
    const t = Date.parse(v.creado_en);
    if (t >= rango.desde.getTime() && t <= rango.hasta.getTime()) primera[v.empresa_id] = v.creado_en;
  }
  const actividades = [
    ...vacantesHistoricas.flatMap((v) => [
      { empresa_id: v.empresa_id, en: v.creado_en },
      ...(v.publicada_en ? [{ empresa_id: v.empresa_id, en: v.publicada_en }] : []),
    ]),
    ...actividadEmpresas.map((a) => ({ empresa_id: a.actor_id, en: a.creado_en })),
  ];
  const cohorteIncompleta = rango.hasta.getTime() + 60 * DIA_MS > ahora.getTime();

  const vistasEventos = vistas.map((v) => ({ meta: { fuente: v.fuente } }));
  const vistasWsp = contarVistas(vistasEventos, "whatsapp");
  const tfa = tiempoPrimeraPostulacionHoras(vacantesPublicadas, postulacionesDeVacantes);

  const entradas: Record<KpiId, { entrada: EntradaKpi; nota?: string }> = {
    candidatos_relevantes: { entrada: candidatosConVacanteRelevante(candidatos, vacantesVisibles) },
    ctr_recomendacion: {
      entrada: {
        num: contarVistas(vistasEventos, "recomendacion"),
        den: sumarRecomendacionesMostradas(mostradas.map((m) => ({ meta: { cantidad: m.cantidad } }))),
      },
    },
    postulacion_vista: { entrada: { num: postulacionesRango, den: vistas.length } },
    lectura_digest_wsp: { entrada: { sinDatos: SIN_WSP } },
    postulacion_clic_wsp: {
      entrada: vistasWsp > 0 ? { num: postulacionesWsp, den: vistasWsp } : { sinDatos: SIN_WSP },
    },
    vacantes_con_postulacion: {
      entrada: vacantesConPostulacion(vacantesPublicadas.map((v) => v.id), postulacionesDeVacantes),
    },
    empresas_vuelven: {
      entrada: empresasQueVuelven(primera, actividades, 60),
      nota: cohorteIncompleta ? "Cohorte incompleta: aún no pasan 60 días desde el final del rango." : undefined,
    },
    free_a_pago: {
      entrada: conPagoAprobado(candidatosNuevos.map((c) => c.id), pagosCandidatos, ["suscripcion", "renovacion"]),
    },
    compra_empresa: {
      entrada: conPagoAprobado(vacantesActivasRango.map((v) => v.empresa_id), pagosEmpresas, ["vacante_destacada", "suscripcion", "renovacion"]),
    },
    tiempo_primera_postulacion: {
      entrada: { valor: tfa.mediana, muestras: tfa.muestras },
      nota: tfa.muestras ? `Mediana sobre ${tfa.muestras} vacantes con postulaciones.` : undefined,
    },
    vacantes_sin_incidentes: {
      entrada: vacantesSinIncidentes(
        aprobaciones.map((a) => ({ vacante_id: a.entidad_id, en: a.creado_en })),
        [
          ...rechazosPosteriores.map((r) => ({ vacante_id: r.entidad_id, en: r.creado_en })),
          ...reportesConfirmados.filter((r) => r.resuelto_en).map((r) => ({ vacante_id: r.vacante_id, en: r.resuelto_en! })),
        ],
      ),
    },
  };

  return {
    kpis: KPIS.map((def) => construirKpi(def, entradas[def.id].entrada, entradas[def.id].nota)),
    truncado,
    generadoEn: ahora.toISOString(),
  };
}

/* ---------------- Uso de IA ---------------- */

export type UsoIA = {
  resumen: ResumenIA;
  nombres: Record<string, string>;
  truncado: boolean;
};

export async function getUsoIA(rango: Rango, trm: number): Promise<UsoIA> {
  await exigir("ver_ia");
  const admin = createAdminClient();
  const { filas, truncado } = await traerPaginado<FilaIA>(
    (d, h) =>
      admin
        .from("ia_uso")
        .select(
          "actor_id, feature, modelo, modelo_servido, plan, input_tokens, output_tokens, cache_creation_tokens, cache_read_tokens, costo_usd, latencia_ms, estado, creado_en",
        )
        .gte("creado_en", rango.desde.toISOString())
        .lte("creado_en", rango.hasta.toISOString())
        .order("creado_en", { ascending: false })
        .range(d, h),
    50_000,
  );
  const resumen = resumirUsoIA(filas, { trm, hasta: rango.hasta, dias: 30 });

  const ids = resumen.topUsuarios.map((u) => u.actorId);
  const nombres: Record<string, string> = {};
  if (ids.length) {
    const [{ data: cands }, { data: emps }] = await Promise.all([
      admin.from("candidatos").select("id, nombre").in("id", ids),
      admin.from("empresas").select("id, nombre_negocio").in("id", ids),
    ]);
    for (const c of cands ?? []) nombres[c.id] = c.nombre;
    for (const e of emps ?? []) nombres[e.id] = e.nombre_negocio;
  }
  return { resumen, nombres, truncado };
}
