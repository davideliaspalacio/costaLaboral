// Datos semilla para CostaLaboral (entorno LOCAL) — esquema Spec MVP v2.
// Uso:  node --env-file=.env.local scripts/seed.mjs
// Crea usuarios de auth + perfiles + vacantes (con estados y moderación) +
// suscripciones + postulaciones con detalle de match + eventos para KPIs.
// audit_log y consentimientos son append-only: el seed no los borra.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Corre: node --env-file=.env.local scripts/seed.mjs");
  process.exit(1);
}
const db = createClient(URL, KEY, { auth: { persistSession: false } });
const PASS = "costalaboral";
const DIA = 86_400_000;
const hace = (dias) => new Date(Date.now() - dias * DIA).toISOString();
const en = (dias) => new Date(Date.now() + dias * DIA).toISOString();

// ---- Match v2 (debe coincidir con lib/matching.ts) ----
const PESO = { ciudad: 40, area: 30, educacion: 20, disponibilidad: 10 };
const RANK_NIVEL = { bachiller: 1, tecnico: 2, tecnologo: 3, universitario: 4, profesional: 5 };
const RANK_DISP = { inmediata: 1, en_2_semanas: 2, en_1_mes: 3 };
function evaluarMatch(c, v) {
  const f = (factor, compatibilidad, explicacion) => ({ factor, peso: PESO[factor], compatibilidad, puntos: PESO[factor] * compatibilidad, explicacion });
  const ciudad = v.modalidad === "remoto" || c.ciudad === v.ciudad ? f("ciudad", 1, "Ciudad compatible") : f("ciudad", 0, `La vacante es en ${v.ciudad}`);
  const area = c.area_interes === v.area ? f("area", 1, "Coincide con tu área de interés") : f("area", 0, "Área distinta");
  const dn = (RANK_NIVEL[c.nivel_educativo] ?? 0) - (RANK_NIVEL[v.nivel_educativo_min] ?? 0);
  const educacion = dn >= 0 ? f("educacion", 1, "Cumples el nivel mínimo") : dn === -1 ? f("educacion", 0.5, "A un nivel del mínimo") : f("educacion", 0, "No cumple el nivel mínimo");
  const dd = (RANK_DISP[c.disponibilidad] ?? 0) - (RANK_DISP[v.disponibilidad_requerida] ?? 3);
  const disponibilidad = dd <= 0 ? f("disponibilidad", 1, "Puedes empezar a tiempo") : dd === 1 ? f("disponibilidad", 0.5, "Un poco más tarde") : f("disponibilidad", 0, "No coincide");
  const factores = [ciudad, area, educacion, disponibilidad];
  return { version: "v2-2026-09", score: factores.reduce((s, x) => s + x.puntos, 0), factores };
}

// Encuentra o crea un usuario de auth con email confirmado.
async function upsertUser(email, tipo, nombre) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASS,
    email_confirm: true,
    user_metadata: { tipo, nombre },
  });
  if (!error) return { id: data.user.id, nuevo: true };
  let page = 1;
  for (;;) {
    const { data: list } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const u = list?.users?.find((x) => x.email === email);
    if (u) return { id: u.id, nuevo: false };
    if (!list?.users?.length || list.users.length < 1000) break;
    page++;
  }
  throw new Error("No se pudo crear ni encontrar " + email);
}

async function consentir(titular_id, titular_tipo, finalidades) {
  await db.from("consentimientos").insert(
    finalidades.map((finalidad) => ({ titular_id, titular_tipo, finalidad, otorgado: true, version_documento: "2026-09-14", canal: "seed" })),
  );
}

const EMPRESAS = [
  { key: "corralito", email: "corralito@demo.co", nombre_negocio: "Restaurante El Corralito", nombre_contacto: "Doña Rosa", whatsapp: "+573015550101", ciudad: "Cartagena", sector: "alimentos", verificacion: "verificada", razon_social: "El Corralito SAS", nit: "900123456-8" },
  { key: "d1", email: "d1barranquilla@demo.co", nombre_negocio: "Tienda D1 · Barranquilla Norte", nombre_contacto: "Mario Gómez", whatsapp: "+573015550102", ciudad: "Barranquilla", sector: "comercio", verificacion: "verificada", plan: "pro" },
  { key: "caribe", email: "constructoracaribe@demo.co", nombre_negocio: "Constructora Caribe SAS", nombre_contacto: "Ing. Pardo", whatsapp: "+573015550103", ciudad: "Santa Marta", sector: "construccion", verificacion: "verificada" },
  { key: "merced", email: "clinicamerced@demo.co", nombre_negocio: "Clínica La Merced", nombre_contacto: "Talento Humano", whatsapp: "+573015550104", ciudad: "Barranquilla", sector: "salud", verificacion: "verificada" },
  { key: "transcaribe", email: "transcaribe@demo.co", nombre_negocio: "TransCaribe Express", nombre_contacto: "Pedro Julio", whatsapp: "+573015550105", ciudad: "Cartagena", sector: "transporte", verificacion: "en_revision", razon_social: "TransCaribe Express SAS", nit: "901234567-1" },
  { key: "nomada", email: "nomadatech@demo.co", nombre_negocio: "NómadaTech", nombre_contacto: "Sara Lopez", whatsapp: "+573015550106", ciudad: "Barranquilla", sector: "servicios", verificacion: "sin_verificar" },
];

const V = (o) => ({ modalidad: "presencial", tipo: "tiempo_completo", nivel_educativo_min: "bachiller", disponibilidad_requerida: "en_1_mes", estado: "publicada", estado_moderacion: "aprobada", publicadaHaceDias: 3, ...o });
const VACANTES = [
  V({ empresa: "corralito", titulo: "Auxiliar de cocina", area: "alimentos", ciudad: "Cartagena", salario_min: 1423500, salario_max: 1600000, tiene_contrato: true, disponibilidad_requerida: "inmediata", publicadaHaceDias: 5, destacadaDias: 6, descripcion: "Apoyo en la preparación de platos típicos costeños, alistamiento de insumos y limpieza de cocina.", requisitos: "Manejo básico de cocina. Manipulación de alimentos (deseable). Disponibilidad fines de semana." }),
  V({ empresa: "corralito", titulo: "Mesero / Mesera", area: "servicios", ciudad: "Cartagena", tipo: "medio_tiempo", salario_min: 900000, salario_max: null, tiene_contrato: false, publicadaHaceDias: 2, descripcion: "Atención en mesa, toma de pedidos y servicio al cliente en restaurante turístico.", requisitos: "Actitud de servicio, agilidad y trabajo en equipo." }),
  V({ empresa: "d1", titulo: "Vendedor de mostrador", area: "ventas", ciudad: "Barranquilla", salario_min: 1423500, salario_max: 1500000, tiene_contrato: true, disponibilidad_requerida: "inmediata", publicadaHaceDias: 8, descripcion: "Atención al cliente, manejo de caja y organización de producto en tienda de barrio.", requisitos: "Bachiller, experiencia en ventas deseable, honestidad con el manejo de dinero." }),
  V({ empresa: "d1", titulo: "Auxiliar de bodega", area: "logistica", ciudad: "Barranquilla", salario_min: 1423500, salario_max: 1450000, tiene_contrato: true, publicadaHaceDias: 12, descripcion: "Recepción de mercancía, alistamiento de pedidos y control de inventario.", requisitos: "Bachiller. Capacidad para levantar peso. Puntualidad." }),
  V({ empresa: "caribe", titulo: "Ayudante de obra", area: "construccion", ciudad: "Santa Marta", tipo: "temporal", salario_min: 1450000, salario_max: 1700000, tiene_contrato: true, disponibilidad_requerida: "inmediata", publicadaHaceDias: 4, descripcion: "Apoyo general en obra: mezcla, transporte de materiales y limpieza del sitio.", requisitos: "Experiencia en construcción deseable. Trabajo en equipo." }),
  V({ empresa: "merced", titulo: "Auxiliar de enfermería", area: "salud", ciudad: "Barranquilla", nivel_educativo_min: "tecnico", disponibilidad_requerida: "en_2_semanas", salario_min: 1700000, salario_max: 2000000, tiene_contrato: true, publicadaHaceDias: 6, descripcion: "Cuidado básico de pacientes, toma de signos vitales y apoyo al personal médico.", requisitos: "Técnico en enfermería con RETHUS vigente. Turnos rotativos." }),
  V({ empresa: "transcaribe", titulo: "Conductor de reparto", area: "transporte", ciudad: "Cartagena", tipo: "por_dias", salario_min: 1450000, salario_max: null, tiene_contrato: false, estado_moderacion: "pendiente", publicadaHaceDias: 1, descripcion: "Reparto de mercancía en la ciudad. Pago por días trabajados.", requisitos: "Licencia C1 vigente. Conocimiento de la ciudad." }),
  V({ empresa: "nomada", titulo: "Soporte técnico remoto", area: "tecnologia", ciudad: "Barranquilla", modalidad: "remoto", nivel_educativo_min: "tecnologo", salario_min: 2000000, salario_max: 2800000, tiene_contrato: true, estado_moderacion: "pendiente", motivo_moderacion: null, publicadaHaceDias: 1, descripcion: "Atención a usuarios por chat y llamada, diagnóstico de incidencias y documentación.", requisitos: "Tecnólogo en sistemas. Inglés básico. Internet estable." }),
  V({ empresa: "d1", titulo: "Asesor comercial", area: "ventas", ciudad: "Barranquilla", modalidad: "hibrido", salario_min: 1500000, salario_max: 2200000, tiene_contrato: true, publicadaHaceDias: 10, descripcion: "Prospección y cierre de ventas, seguimiento a clientes y cumplimiento de metas.", requisitos: "Orientación a resultados. Comunicación asertiva." }),
  V({ empresa: "d1", titulo: "Cajero(a) fin de semana", area: "ventas", ciudad: "Barranquilla", tipo: "por_dias", estado: "borrador", publicadaHaceDias: null, salario_min: 120000, salario_max: null, tiene_contrato: false, descripcion: "Manejo de caja sábados y domingos.", requisitos: "Experiencia en caja." }),
  V({ empresa: "caribe", titulo: "Almacenista de obra", area: "logistica", ciudad: "Santa Marta", estado: "cerrada", motivo_cierre: "contratado", publicadaHaceDias: 40, salario_min: 1600000, salario_max: 1800000, tiene_contrato: true, descripcion: "Control de materiales y herramientas en obra.", requisitos: "Experiencia en inventarios." }),
];

const CANDIDATOS = [
  { email: "maria@demo.co", nombre: "María García", whatsapp: "+573101110001", ciudad: "Barranquilla", nivel_educativo: "bachiller", area_interes: "ventas", disponibilidad: "inmediata", plan: "gratis", visible: true, experiencia: "2 años como vendedora en almacén de ropa. Manejo de caja y atención al cliente." },
  { email: "carlos@demo.co", nombre: "Carlos Támara", whatsapp: "+573101110002", ciudad: "Cartagena", nivel_educativo: "tecnico", area_interes: "alimentos", disponibilidad: "inmediata", plan: "camelleitor", visible: true, experiencia: "Ayudante de cocina 3 años en restaurante de mariscos. Curso de manipulación de alimentos." },
  { email: "luisa@demo.co", nombre: "Luisa Fernández", whatsapp: "+573101110003", ciudad: "Barranquilla", nivel_educativo: "tecnologo", area_interes: "salud", disponibilidad: "en_2_semanas", plan: "gratis", visible: false, experiencia: "Técnica en enfermería, prácticas en clínica. RETHUS vigente." },
  { email: "andres@demo.co", nombre: "Andrés Movil", whatsapp: "+573101110004", ciudad: "Barranquilla", nivel_educativo: "bachiller", area_interes: "logistica", disponibilidad: "inmediata", plan: "gratis", visible: true, experiencia: "Auxiliar de bodega en supermercado. Manejo de inventario." },
  { email: "dayana@demo.co", nombre: "Dayana Ríos", whatsapp: "+573101110005", ciudad: "Cartagena", nivel_educativo: "universitario", area_interes: "servicios", disponibilidad: "inmediata", plan: "berraco_pro", visible: true, experiencia: "Estudiante de administración. Experiencia en atención al cliente y turismo." },
  { email: "jorge@demo.co", nombre: "Jorge Polo", whatsapp: "+573101110006", ciudad: "Santa Marta", nivel_educativo: "bachiller", area_interes: "construccion", disponibilidad: "inmediata", plan: "gratis", visible: false, experiencia: "5 años en obra como ayudante y luego oficial de acabados." },
  { email: "kevin@demo.co", nombre: "Kevin Support", whatsapp: "+573101110007", ciudad: "Barranquilla", nivel_educativo: "tecnologo", area_interes: "tecnologia", disponibilidad: "inmediata", plan: "camelleitor", visible: true, experiencia: "Tecnólogo en sistemas. Mesa de ayuda 2 años. Inglés B1." },
  { email: "andrea@demo.co", nombre: "Andrea Cortés", whatsapp: "+573101110008", ciudad: "Cartagena", nivel_educativo: "bachiller", area_interes: "transporte", disponibilidad: "en_1_mes", plan: "gratis", visible: false, experiencia: "Conductor con licencia C1. Reparto en moto y camioneta." },
];

const PERIODO_PLAN = { camelleitor: 90, berraco_pro: 90, pro: 30 };

async function suscribir(propietario_id, propietario_tipo, plan) {
  await db.from("suscripciones").update({ estado: "canceled", cancelada_en: new Date().toISOString() }).eq("propietario_id", propietario_id).in("estado", ["active", "past_due"]);
  if (plan === "gratis") return;
  const { data: s } = await db.from("suscripciones").insert({
    propietario_id, propietario_tipo, plan, proveedor: "seed", estado: "active",
    periodo_inicio: hace(10), periodo_fin: en(PERIODO_PLAN[plan] - 10),
  }).select("id").single();
  const producto = plan === "pro" ? "plan_empresa_pro" : `plan_${plan}`;
  const monto = { camelleitor: 29900, berraco_pro: 49900, pro: 99000 }[plan];
  await db.from("pagos").insert({
    referencia: `SEED-${plan}-${propietario_id.slice(0, 8)}-${Date.now()}`, suscripcion_id: s?.id, propietario_id, propietario_tipo,
    concepto: "suscripcion", producto, proveedor: "seed", monto, estado: "aprobado", aprobado_en: hace(10),
  });
}

async function main() {
  console.log("→ Limpiando datos de dominio…");
  const todo = "00000000-0000-0000-0000-000000000000";
  await db.from("eventos").delete().neq("id", todo);
  await db.from("notificaciones_wsp").delete().neq("id", todo);
  await db.from("vacantes").delete().neq("id", todo); // cascada: postulaciones, historial, reportes
  await db.from("pagos").delete().in("proveedor", ["seed"]);
  await db.from("suscripciones").delete().in("proveedor", ["seed", "migracion"]);
  const eventos = [];

  console.log("→ Empresas…");
  const empresaIds = {};
  for (const e of EMPRESAS) {
    const { id, nuevo } = await upsertUser(e.email, "empresa", e.nombre_contacto);
    empresaIds[e.key] = id;
    await db.from("empresas").upsert({
      id, nombre_negocio: e.nombre_negocio, nombre_contacto: e.nombre_contacto, email: e.email, whatsapp: e.whatsapp,
      ciudad: e.ciudad, sector: e.sector, verificacion: e.verificacion, razon_social: e.razon_social ?? null, nit: e.nit ?? null,
      verificada_en: e.verificacion === "verificada" ? hace(30) : null,
      verificacion_solicitada_en: e.verificacion === "en_revision" ? hace(1) : null,
      plan: e.plan ?? "gratis",
    });
    if (nuevo) await consentir(id, "empresa", ["tratamiento_datos", "terminos"]);
    await suscribir(id, "empresa", e.plan ?? "gratis");
  }

  console.log("→ Vacantes…");
  const vacantes = [];
  for (const v of VACANTES) {
    const publicada_en = v.publicadaHaceDias == null ? null : hace(v.publicadaHaceDias);
    const { data, error } = await db.from("vacantes").insert({
      empresa_id: empresaIds[v.empresa], titulo: v.titulo, descripcion: v.descripcion, requisitos: v.requisitos,
      ciudad: v.ciudad, modalidad: v.modalidad, tipo: v.tipo, area: v.area, nivel_educativo_min: v.nivel_educativo_min,
      disponibilidad_requerida: v.disponibilidad_requerida, salario_min: v.salario_min, salario_max: v.salario_max,
      tiene_contrato: v.tiene_contrato, estado: v.estado, estado_moderacion: v.estado_moderacion,
      motivo_moderacion: v.estado_moderacion === "pendiente" ? "Empresa sin verificar: revisión previa" : null,
      motivo_cierre: v.motivo_cierre ?? null, cerrada_en: v.estado === "cerrada" ? hace(2) : null,
      publicada_en, creado_en: publicada_en ?? new Date().toISOString(),
      expira_en: new Date((publicada_en ? Date.parse(publicada_en) : Date.now()) + 60 * DIA).toISOString(),
      destacada_hasta: v.destacadaDias ? en(v.destacadaDias) : null,
      vistas: Math.floor(5 + Math.abs(Math.sin(v.titulo.length) * 60)),
    }).select().single();
    if (error) { console.error("  ✗ vacante", v.titulo, "→", error.message); continue; }
    vacantes.push(data);
    if (data.estado === "publicada") eventos.push({ tipo: "vacante_publicada", actor_id: data.empresa_id, actor_tipo: "empresa", entidad: "vacantes", entidad_id: data.id, meta: { titulo: data.titulo, ciudad: data.ciudad }, creado_en: publicada_en });
  }

  console.log("→ Candidatos…");
  const candidatos = [];
  const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0].trim();
  const lista = adminEmail
    ? [...CANDIDATOS, { email: adminEmail, nombre: "Equipo CostaLaboral", whatsapp: "+573100000000", ciudad: "Barranquilla", nivel_educativo: "universitario", area_interes: "ventas", disponibilidad: "inmediata", plan: "berraco_pro", visible: false, experiencia: null, admin: true }]
    : CANDIDATOS;
  for (const c of lista) {
    const { id, nuevo } = await upsertUser(c.email, "candidato", c.nombre);
    await db.from("candidatos").upsert({
      id, nombre: c.nombre, email: c.email, whatsapp: c.whatsapp, ciudad: c.ciudad, nivel_educativo: c.nivel_educativo,
      area_interes: c.area_interes, disponibilidad: c.disponibilidad, experiencia: c.experiencia, plan: c.plan,
      wsp_opt_in: true, wsp_opt_in_en: hace(20), perfil_visible_empresas: c.visible, mayor_de_edad: true, activo: true,
    });
    if (nuevo) await consentir(id, "candidato", ["tratamiento_datos", "terminos", "mayoria_edad", "whatsapp"]);
    await suscribir(id, "candidato", c.plan);
    candidatos.push({ ...c, id });
    eventos.push({ tipo: "registro_candidato", actor_id: id, actor_tipo: "candidato", entidad: "candidatos", entidad_id: id, meta: {}, creado_en: hace(20) });
    if (c.admin) {
      await db.from("staff").upsert({ user_id: id, rol: "super_admin", nombre: "Equipo CostaLaboral" });
      console.log(`   Cuenta admin/candidato: ${adminEmail} / ${PASS}`);
    }
  }

  console.log("→ Postulaciones, historial y eventos de KPIs…");
  const FLUJO = ["enviada", "vista", "contactado", "en_entrevista", "contratado"];
  let nPost = 0;
  for (const v of vacantes.filter((x) => x.estado === "publicada" && x.estado_moderacion === "aprobada")) {
    const recomendados = [];
    for (const c of candidatos) {
      const detalle = evaluarMatch(c, v);
      if (detalle.score < 60) continue;
      recomendados.push(v.id);
      eventos.push({ tipo: "recomendaciones_mostradas", actor_id: c.id, actor_tipo: "candidato", meta: { cantidad: 1, vacante_ids: [v.id] }, creado_en: hace(2) });
      const fuente = detalle.score >= 90 ? "recomendacion" : "busqueda";
      eventos.push({ tipo: "vacante_vista", actor_id: c.id, actor_tipo: "candidato", entidad: "vacantes", entidad_id: v.id, meta: { fuente }, creado_en: hace(2) });
      if (Math.abs(Math.sin(detalle.score + v.titulo.length)) <= 0.3) continue;
      const pasos = detalle.score >= 100 ? 4 : detalle.score >= 90 ? 3 : detalle.score >= 70 ? 1 : 0;
      const creado = new Date(Date.parse(v.publicada_en) + (6 + nPost) * 3_600_000).toISOString();
      const { data: p, error } = await db.from("postulaciones").insert({
        candidato_id: c.id, vacante_id: v.id, score_match: detalle.score, match_detalle: detalle, fuente,
        estado: FLUJO[pasos], estado_actualizado_en: hace(1), creado_en: creado,
      }).select("id").single();
      if (error) { console.error("  ✗ postulación", error.message); continue; }
      nPost++;
      const historial = [{ postulacion_id: p.id, estado_anterior: null, estado_nuevo: "enviada", actor_id: c.id, actor_tipo: "candidato", creado_en: creado }];
      for (let i = 1; i <= pasos; i++) historial.push({ postulacion_id: p.id, estado_anterior: FLUJO[i - 1], estado_nuevo: FLUJO[i], actor_id: v.empresa_id, actor_tipo: "empresa" });
      await db.from("postulacion_historial").insert(historial);
      eventos.push({ tipo: "postulacion", actor_id: c.id, actor_tipo: "candidato", entidad: "vacantes", entidad_id: v.id, meta: { score: detalle.score, fuente }, creado_en: creado });
      if (c.wsp_opt_in !== false) {
        await db.from("notificaciones_wsp").insert({ candidato_id: c.id, vacante_id: v.id, tipo: "enlace_real", mensaje: `Hola ${c.nombre}, hay una vacante de ${v.titulo} en ${v.ciudad} que encaja con tu perfil: http://localhost:3000/v/${v.id}?src=whatsapp` });
      }
    }
  }

  // Un reporte abierto para probar la cola de moderación.
  const reportable = vacantes.find((v) => v.titulo === "Mesero / Mesera");
  const reportante = candidatos.find((c) => c.email === "maria@demo.co");
  if (reportable && reportante) {
    await db.from("reportes_vacante").insert({ vacante_id: reportable.id, reportante_id: reportante.id, motivo: "datos_falsos", detalle: "El salario no coincide con lo que dicen por teléfono." });
  }

  for (const e of EMPRESAS) eventos.push({ tipo: "registro_empresa", actor_id: empresaIds[e.key], actor_tipo: "empresa", entidad: "empresas", entidad_id: empresaIds[e.key], meta: { sector: e.sector, ciudad: e.ciudad }, creado_en: hace(30) });
  for (let i = 0; i < eventos.length; i += 500) await db.from("eventos").insert(eventos.slice(i, i + 500));

  console.log(`\n✅ Listo. ${EMPRESAS.length} empresas, ${vacantes.length} vacantes, ${candidatos.length} candidatos, ${nPost} postulaciones, ${eventos.length} eventos.`);
  console.log(`   Candidato gratis:   maria@demo.co / ${PASS}`);
  console.log(`   Candidato Pro:      dayana@demo.co / ${PASS}`);
  console.log(`   Empresa verificada: corralito@demo.co / ${PASS}  ·  Empresa Pro: d1barranquilla@demo.co`);
  console.log(`   Empresa sin verificar (vacante en revisión): nomadatech@demo.co / ${PASS}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
