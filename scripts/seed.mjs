// Datos semilla para CostaLaboral (entorno LOCAL).
// Uso:  node --env-file=.env.local scripts/seed.mjs
// Crea usuarios de auth + perfiles + vacantes + postulaciones + notificaciones.
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Corre: node --env-file=.env.local scripts/seed.mjs");
  process.exit(1);
}
const db = createClient(URL, KEY, { auth: { persistSession: false } });
const PASS = "costalaboral";

const PESO = { ciudad: 40, area: 30, nivel: 20, disp: 10 };
const RANK = { bachiller: 1, tecnico: 2, tecnologo: 3, universitario: 4, profesional: 5 };
const score = (c, v) => {
  let s = 0;
  if (v.modalidad === "remoto" || c.ciudad === v.ciudad) s += PESO.ciudad;
  if (c.area_interes === v.area) s += PESO.area;
  if (RANK[c.nivel_educativo] >= RANK[v.nivel_educativo_min]) s += PESO.nivel;
  if (c.disponibilidad === "inmediata") s += PESO.disp;
  return s;
};
const elegible = (c, v) =>
  (v.modalidad === "remoto" || c.ciudad === v.ciudad) &&
  c.area_interes === v.area &&
  RANK[c.nivel_educativo] >= RANK[v.nivel_educativo_min];

// Encuentra o crea un usuario de auth con email confirmado.
async function upsertUser(email, tipo, nombre) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASS,
    email_confirm: true,
    user_metadata: { tipo, nombre },
  });
  if (!error) return data.user.id;
  // Ya existe: búscalo.
  let page = 1;
  for (;;) {
    const { data: list } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    const u = list?.users?.find((x) => x.email === email);
    if (u) return u.id;
    if (!list?.users?.length || list.users.length < 1000) break;
    page++;
  }
  throw new Error("No se pudo crear ni encontrar " + email);
}

const EMPRESAS = [
  { key: "corralito", email: "corralito@demo.co", nombre_negocio: "Restaurante El Corralito", nombre_contacto: "Doña Rosa", whatsapp: "+573015550101", ciudad: "Cartagena", sector: "alimentos" },
  { key: "d1", email: "d1barranquilla@demo.co", nombre_negocio: "Tienda D1 · Barranquilla Norte", nombre_contacto: "Mario Gómez", whatsapp: "+573015550102", ciudad: "Barranquilla", sector: "comercio" },
  { key: "caribe", email: "constructoracaribe@demo.co", nombre_negocio: "Constructora Caribe SAS", nombre_contacto: "Ing. Pardo", whatsapp: "+573015550103", ciudad: "Santa Marta", sector: "construccion" },
  { key: "merced", email: "clinicamerced@demo.co", nombre_negocio: "Clínica La Merced", nombre_contacto: "Talento Humano", whatsapp: "+573015550104", ciudad: "Barranquilla", sector: "salud" },
  { key: "transcaribe", email: "transcaribe@demo.co", nombre_negocio: "TransCaribe Express", nombre_contacto: "Pedro Julio", whatsapp: "+573015550105", ciudad: "Cartagena", sector: "transporte" },
  { key: "nomada", email: "nomadatech@demo.co", nombre_negocio: "NómadaTech", nombre_contacto: "Sara Lopez", whatsapp: "+573015550106", ciudad: "Barranquilla", sector: "servicios" },
];

const VACANTES = [
  { empresa: "corralito", titulo: "Auxiliar de cocina", area: "alimentos", ciudad: "Cartagena", modalidad: "presencial", nivel_educativo_min: "bachiller", salario_min: 1300000, salario_max: 1600000, tiene_contrato: true, descripcion: "Apoyo en la preparación de platos típicos costeños, alistamiento de insumos y limpieza de cocina.", requisitos: "Manejo básico de cocina. Manipulación de alimentos (deseable). Disponibilidad fines de semana." },
  { empresa: "corralito", titulo: "Mesero / Mesera", area: "servicios", ciudad: "Cartagena", modalidad: "presencial", nivel_educativo_min: "bachiller", salario_min: 1300000, salario_max: null, tiene_contrato: false, descripcion: "Atención en mesa, toma de pedidos y servicio al cliente en restaurante turístico.", requisitos: "Buena actitud, agilidad y buena presentación." },
  { empresa: "d1", titulo: "Vendedor de mostrador", area: "ventas", ciudad: "Barranquilla", modalidad: "presencial", nivel_educativo_min: "bachiller", salario_min: 1300000, salario_max: 1500000, tiene_contrato: true, descripcion: "Atención al cliente, manejo de caja y organización de producto en tienda de barrio.", requisitos: "Bachiller, experiencia en ventas deseable, honestidad con el manejo de dinero." },
  { empresa: "d1", titulo: "Auxiliar de bodega", area: "logistica", ciudad: "Barranquilla", modalidad: "presencial", nivel_educativo_min: "bachiller", salario_min: 1300000, salario_max: 1450000, tiene_contrato: true, descripcion: "Recepción de mercancía, alistamiento de pedidos y control de inventario.", requisitos: "Bachiller. Capacidad para levantar peso. Puntualidad." },
  { empresa: "caribe", titulo: "Ayudante de obra", area: "construccion", ciudad: "Santa Marta", modalidad: "presencial", nivel_educativo_min: "bachiller", salario_min: 1400000, salario_max: 1700000, tiene_contrato: true, descripcion: "Apoyo general en obra: mezcla, transporte de materiales y limpieza del sitio.", requisitos: "Experiencia en construcción deseable. Trabajo en equipo." },
  { empresa: "merced", titulo: "Auxiliar de enfermería", area: "salud", ciudad: "Barranquilla", modalidad: "presencial", nivel_educativo_min: "tecnico", salario_min: 1600000, salario_max: 2000000, tiene_contrato: true, descripcion: "Cuidado básico de pacientes, toma de signos vitales y apoyo al personal médico.", requisitos: "Técnico en enfermería con rethus vigente. Turnos rotativos." },
  { empresa: "transcaribe", titulo: "Conductor de reparto", area: "transporte", ciudad: "Cartagena", modalidad: "por_dias", nivel_educativo_min: "bachiller", salario_min: 1400000, salario_max: null, tiene_contrato: false, descripcion: "Reparto de mercancía en la ciudad. Pago por días trabajados.", requisitos: "Licencia C1 vigente. Conocimiento de la ciudad." },
  { empresa: "nomada", titulo: "Soporte técnico remoto", area: "tecnologia", ciudad: "Barranquilla", modalidad: "remoto", nivel_educativo_min: "tecnologo", salario_min: 2000000, salario_max: 2800000, tiene_contrato: true, descripcion: "Atención a usuarios por chat y llamada, diagnóstico de incidencias y documentación.", requisitos: "Tecnólogo en sistemas. Inglés básico. Internet estable." },
  { empresa: "d1", titulo: "Asesor comercial", area: "ventas", ciudad: "Barranquilla", modalidad: "hibrido", nivel_educativo_min: "bachiller", salario_min: 1500000, salario_max: 2200000, tiene_contrato: true, descripcion: "Prospección y cierre de ventas, seguimiento a clientes y cumplimiento de metas.", requisitos: "Orientación a resultados. Comunicación asertiva." },
];

const CANDIDATOS = [
  { email: "maria@demo.co", nombre: "María García", whatsapp: "+573101110001", ciudad: "Barranquilla", nivel_educativo: "bachiller", area_interes: "ventas", disponibilidad: "inmediata", plan: "gratis", experiencia: "2 años como vendedora en almacén de ropa. Manejo de caja y atención al cliente." },
  { email: "carlos@demo.co", nombre: "Carlos Támara", whatsapp: "+573101110002", ciudad: "Cartagena", nivel_educativo: "tecnico", area_interes: "alimentos", disponibilidad: "inmediata", plan: "camelleitor", experiencia: "Ayudante de cocina 3 años en restaurante de mariscos. Curso de manipulación de alimentos." },
  { email: "luisa@demo.co", nombre: "Luisa Fernández", whatsapp: "+573101110003", ciudad: "Barranquilla", nivel_educativo: "tecnologo", area_interes: "salud", disponibilidad: "en_2_semanas", plan: "gratis", experiencia: "Técnica en enfermería, prácticas en clínica. Rethus vigente." },
  { email: "andres@demo.co", nombre: "Andrés Movil", whatsapp: "+573101110004", ciudad: "Barranquilla", nivel_educativo: "bachiller", area_interes: "logistica", disponibilidad: "inmediata", plan: "gratis", experiencia: "Auxiliar de bodega en supermercado. Manejo de inventario." },
  { email: "dayana@demo.co", nombre: "Dayana Ríos", whatsapp: "+573101110005", ciudad: "Cartagena", nivel_educativo: "universitario", area_interes: "servicios", disponibilidad: "inmediata", plan: "berraco_pro", experiencia: "Estudiante de administración. Experiencia en atención al cliente y turismo." },
  { email: "jorge@demo.co", nombre: "Jorge Polo", whatsapp: "+573101110006", ciudad: "Santa Marta", nivel_educativo: "bachiller", area_interes: "construccion", disponibilidad: "inmediata", plan: "gratis", experiencia: "5 años en obra como ayudante y luego oficial de acabados." },
  { email: "kevin@demo.co", nombre: "Kevin Support", whatsapp: "+573101110007", ciudad: "Barranquilla", nivel_educativo: "tecnologo", area_interes: "tecnologia", disponibilidad: "inmediata", plan: "camelleitor", experiencia: "Tecnólogo en sistemas. Mesa de ayuda 2 años. Inglés B1." },
  { email: "andrea@demo.co", nombre: "Andrea Cortés", whatsapp: "+573101110008", ciudad: "Cartagena", nivel_educativo: "bachiller", area_interes: "transporte", disponibilidad: "inmediata", plan: "gratis", experiencia: "Conductor con licencia C1. Reparto en moto y camioneta." },
];

async function main() {
  console.log("→ Limpiando datos de dominio…");
  await db.from("eventos").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("notificaciones_wsp").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("postulaciones").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await db.from("vacantes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const eventos = [];

  console.log("→ Empresas…");
  const empresaIds = {};
  for (const e of EMPRESAS) {
    const id = await upsertUser(e.email, "empresa", e.nombre_contacto);
    empresaIds[e.key] = id;
    await db.from("empresas").upsert({
      id, nombre_negocio: e.nombre_negocio, nombre_contacto: e.nombre_contacto,
      email: e.email, whatsapp: e.whatsapp, ciudad: e.ciudad, sector: e.sector, verificada: true,
    });
  }

  console.log("→ Vacantes…");
  const vacantes = [];
  for (const v of VACANTES) {
    const { data, error } = await db.from("vacantes").insert({
      empresa_id: empresaIds[v.empresa], titulo: v.titulo, descripcion: v.descripcion,
      requisitos: v.requisitos, ciudad: v.ciudad, modalidad: v.modalidad, area: v.area,
      nivel_educativo_min: v.nivel_educativo_min, salario_min: v.salario_min,
      salario_max: v.salario_max, tiene_contrato: v.tiene_contrato,
      vistas: Math.floor(5 + Math.abs(Math.sin(v.titulo.length) * 60)),
    }).select().single();
    if (error) { console.error("  ✗ vacante", v.titulo, "→", error.message); continue; }
    vacantes.push(data);
  }

  console.log("→ Candidatos…");
  const candidatos = [];
  for (const c of CANDIDATOS) {
    const id = await upsertUser(c.email, "candidato", c.nombre);
    const plan_vence = c.plan === "gratis" ? null : new Date(Date.now() + 90 * 86400000).toISOString();
    await db.from("candidatos").upsert({
      id, nombre: c.nombre, email: c.email, whatsapp: c.whatsapp, ciudad: c.ciudad,
      nivel_educativo: c.nivel_educativo, area_interes: c.area_interes,
      disponibilidad: c.disponibilidad, experiencia: c.experiencia, plan: c.plan, plan_vence,
    });
    candidatos.push({ ...c, id });
  }

  // Cuenta del dueño/admin con el correo real (también es candidato para explorar la UX).
  const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0].trim();
  if (adminEmail) {
    const id = await upsertUser(adminEmail, "candidato", "Equipo CostaLaboral");
    await db.from("candidatos").upsert({
      id, nombre: "Equipo CostaLaboral", email: adminEmail, whatsapp: "+573100000000",
      ciudad: "Barranquilla", nivel_educativo: "universitario", area_interes: "ventas",
      disponibilidad: "inmediata", plan: "berraco_pro",
      plan_vence: new Date(Date.now() + 90 * 86400000).toISOString(),
    });
    candidatos.push({ id, ciudad: "Barranquilla", area_interes: "ventas", nivel_educativo: "universitario", disponibilidad: "inmediata" });
    await db.from("staff").upsert({ user_id: id, rol: "super_admin", nombre: "Equipo CostaLaboral" });
    console.log(`   Cuenta admin/candidato: ${adminEmail} / ${PASS}`);
  }

  console.log("→ Postulaciones + notificaciones (matching)…");
  let nPost = 0, nNotif = 0;
  for (const v of vacantes) {
    for (const c of candidatos) {
      if (!elegible(c, v)) continue;
      const s = score(c, v);
      // Notificación WhatsApp del match
      await db.from("notificaciones_wsp").insert({
        candidato_id: c.id, vacante_id: v.id, tipo: "enlace_real",
        mensaje: `Parcero ${c.nombre || ""}, hay una vacante de ${v.titulo} en ${v.ciudad} que encaja contigo. Míralas: http://localhost:3000/v/${v.id}`,
      });
      nNotif++;
      eventos.push({ tipo: "notif_enviada", actor_tipo: "sistema", entidad: "vacantes", entidad_id: v.id, meta: { titulo: v.titulo } });
      // ~70% de los elegibles se postulan
      if (Math.abs(Math.sin(s + v.titulo.length)) > 0.3) {
        const estados = ["enviada", "vista_empresa", "en_proceso", "seleccionado"];
        const seg = ["nuevo", "contactado", "en_entrevista", "contratado"];
        const i = s >= 100 ? 3 : s >= 90 ? 2 : s >= 70 ? 1 : 0;
        const { error } = await db.from("postulaciones").insert({
          candidato_id: c.id, vacante_id: v.id, score_match: s,
          match_razon: "misma ciudad, misma área, nivel educativo cumplido",
          estado: estados[i], estado_seguimiento: seg[i],
        });
        if (!error) {
          nPost++;
          eventos.push({ tipo: "postulacion", actor_id: c.id, actor_tipo: "candidato", entidad: "vacantes", entidad_id: v.id, meta: { score: s } });
        }
      }
    }
  }

  for (const e of EMPRESAS) eventos.push({ tipo: "registro_empresa", actor_id: empresaIds[e.key], actor_tipo: "empresa", entidad: "empresas", entidad_id: empresaIds[e.key], meta: { sector: e.sector, ciudad: e.ciudad } });
  for (const v of vacantes) eventos.push({ tipo: "vacante_publicada", actor_id: v.empresa_id, actor_tipo: "empresa", entidad: "vacantes", entidad_id: v.id, meta: { titulo: v.titulo, ciudad: v.ciudad } });
  for (const c of candidatos) if (c.email) eventos.push({ tipo: "registro_candidato", actor_id: c.id, actor_tipo: "candidato", entidad: "candidatos", entidad_id: c.id, meta: {} });
  if (eventos.length) await db.from("eventos").insert(eventos);

  console.log(`\n✅ Listo. ${EMPRESAS.length} empresas, ${vacantes.length} vacantes, ${candidatos.length} candidatos, ${nPost} postulaciones, ${nNotif} notificaciones, ${eventos.length} eventos.`);
  console.log(`   Login demo candidato: maria@demo.co / ${PASS}`);
  console.log(`   Login demo empresa:   corralito@demo.co / ${PASS}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
