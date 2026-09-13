// Semilla de DEMOSTRACIÓN de CostaLaboral — "plataforma llena".
// Uso local:   pnpm seed
// Uso en nube: SEED_CONFIRMAR=si node --env-file=.env.local scripts/seed.mjs
//
// Crea ~35 empresas, ~150 vacantes, ~260 candidatos con postulaciones e historial,
// suscripciones y pagos, hojas de vida y LinkedIn con su uso de IA, reportes,
// solicitudes de Habeas Data, notificaciones, eventos de KPIs y auditoría.
// Es reproducible (PRNG con semilla fija). Borra y recrea los datos de dominio;
// audit_log y consentimientos son append-only: solo se insertan la primera vez.
// Todas las empresas y personas son ficticias.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Corre: node --env-file=.env.local scripts/seed.mjs");
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(URL) && process.env.SEED_CONFIRMAR !== "si") {
  console.error(`Vas a BORRAR y recrear los datos de dominio en ${URL}.\nSi es un entorno de demostración, corre: SEED_CONFIRMAR=si node --env-file=.env.local scripts/seed.mjs`);
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });
const PASS = "costalaboral";
const SEED_TAG = "demo-v2";
const DIA = 86_400_000;
const HORA = 3_600_000;
const NOW = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const hace = (dias) => NOW - dias * DIA;

/* ---------------- Aleatoriedad reproducible ---------------- */
let semilla = 20260914;
function rnd() {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const entre = (a, b) => a + rnd() * (b - a);
function pesos(obj) {
  const total = Object.values(obj).reduce((s, v) => s + v, 0);
  let r = rnd() * total;
  for (const [k, v] of Object.entries(obj)) if ((r -= v) < 0) return k;
  return Object.keys(obj)[0];
}
function barajar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const slug = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
function codigo(n) {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let o = "";
  for (let i = 0; i < n; i++) o += A[Math.floor(rnd() * A.length)];
  return o;
}
const redondear = (v, paso = 50000) => Math.round(v / paso) * paso;
const ip = () => `${pick(["181", "190", "186"])}.${int(48, 250)}.${int(0, 255)}.${int(1, 254)}`;
const UA = [
  "Mozilla/5.0 (Linux; Android 14; SM-A155M) AppleWebKit/537.36 Chrome/128 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128 Safari/537.36",
];

/* ---------------- Match v2 (debe coincidir con lib/matching.ts) ---------------- */
const PESO = { ciudad: 40, area: 30, educacion: 20, disponibilidad: 10 };
const RANK_NIVEL = { bachiller: 1, tecnico: 2, tecnologo: 3, universitario: 4, profesional: 5 };
const RANK_DISP = { inmediata: 1, en_2_semanas: 2, en_1_mes: 3 };
const LABEL_AREA = { ventas: "Ventas", logistica: "Logística", salud: "Salud", admin: "Administrativo", tecnologia: "Tecnología", alimentos: "Alimentos y cocina", servicios: "Servicio al cliente", construccion: "Construcción", transporte: "Transporte", belleza: "Belleza y estética", educacion: "Educación", otro: "Otro" };
const LABEL_NIVEL = { bachiller: "Bachiller", tecnico: "Técnico SENA", tecnologo: "Tecnólogo", universitario: "Universitario", profesional: "Profesional" };
function evaluarMatch(c, v) {
  const f = (factor, compatibilidad, explicacion) => ({ factor, peso: PESO[factor], compatibilidad, puntos: PESO[factor] * compatibilidad, explicacion });
  const ciudad =
    v.modalidad === "remoto" ? f("ciudad", 1, "Trabajo remoto: aplica desde cualquier ciudad")
    : c.ciudad === v.ciudad ? f("ciudad", 1, `Vives en ${v.ciudad}`)
    : f("ciudad", 0, `La vacante es en ${v.ciudad} y tu ciudad es ${c.ciudad}`);
  const area = c.area_interes === v.area
    ? f("area", 1, `Coincide con tu área de interés (${LABEL_AREA[v.area]})`)
    : f("area", 0, `La vacante es de ${LABEL_AREA[v.area]} y tu área es ${LABEL_AREA[c.area_interes]}`);
  const dn = RANK_NIVEL[c.nivel_educativo] - RANK_NIVEL[v.nivel_educativo_min];
  const educacion = dn >= 0 ? f("educacion", 1, `Cumples el nivel mínimo (${LABEL_NIVEL[v.nivel_educativo_min]})`)
    : dn === -1 ? f("educacion", 0.5, `Estás a un nivel del mínimo pedido (${LABEL_NIVEL[v.nivel_educativo_min]})`)
    : f("educacion", 0, `Piden como mínimo ${LABEL_NIVEL[v.nivel_educativo_min]}`);
  const dd = RANK_DISP[c.disponibilidad] - RANK_DISP[v.disponibilidad_requerida];
  const disponibilidad = dd <= 0 ? f("disponibilidad", 1, "Puedes empezar cuando lo necesitan")
    : dd === 1 ? f("disponibilidad", 0.5, "Tu disponibilidad es un poco más tarde de lo que buscan")
    : f("disponibilidad", 0, "Tu disponibilidad no coincide con la fecha de inicio");
  const factores = [ciudad, area, educacion, disponibilidad];
  return { version: "v2-2026-09", score: factores.reduce((s, x) => s + x.puntos, 0), factores };
}

/* ---------------- Catálogo de puestos por área ---------------- */
// [título, nivel mínimo, salario mínimo, salario máximo]
const PUESTOS = {
  ventas: {
    puestos: [["Vendedor(a) de mostrador", "bachiller", 1423500, 1650000], ["Asesor(a) comercial", "bachiller", 1500000, 2400000], ["Cajero(a)", "bachiller", 1423500, 1550000], ["Impulsador(a) de marca", "bachiller", 1423500, 1800000], ["Ejecutivo(a) de cuenta", "tecnologo", 2200000, 3200000]],
    desc: "Atender y asesorar a los clientes, manejar caja y cumplir las metas de venta del punto. Trabajo en equipo con el líder de tienda.",
    req: "Experiencia en ventas o atención al cliente (deseable). Buena comunicación y orientación a resultados.",
    habilidades: ["Atención al cliente", "Manejo de caja", "Cierre de ventas", "Servicio posventa", "Manejo de inventario", "Negociación"],
    exp: [["Vendedora", "Almacén El Progreso", ["Atendía un promedio de 60 clientes por turno", "Manejo de caja y cuadre diario sin faltantes"]], ["Asesor comercial", "Distribuidora del Caribe", ["Apertura de 25 clientes nuevos en el semestre", "Seguimiento de cartera y pedidos"]]],
  },
  logistica: {
    puestos: [["Auxiliar de bodega", "bachiller", 1423500, 1600000], ["Montacarguista", "bachiller", 1700000, 2100000], ["Coordinador(a) de despachos", "tecnologo", 2300000, 3000000], ["Auxiliar de inventarios", "tecnico", 1600000, 1900000]],
    desc: "Recibir, almacenar y despachar mercancía, alistar pedidos y apoyar el control de inventario de la bodega.",
    req: "Experiencia en bodega o inventarios. Disponibilidad para turnos. Curso de montacargas vigente (según el cargo).",
    habilidades: ["Alistamiento de pedidos", "Control de inventario", "Cargue y descargue", "Excel básico", "Seguridad industrial"],
    exp: [["Auxiliar de bodega", "Supermercado La Canasta", ["Alistamiento de 120 pedidos diarios", "Conteos cíclicos de inventario"]], ["Operario logístico", "Logística del Puerto", ["Cargue y descargue de contenedores", "Registro de entradas en el sistema"]]],
  },
  salud: {
    puestos: [["Auxiliar de enfermería", "tecnico", 1700000, 2100000], ["Regente de farmacia", "tecnologo", 2000000, 2600000], ["Recepcionista de consultorio", "bachiller", 1423500, 1700000], ["Auxiliar de laboratorio clínico", "tecnico", 1650000, 2000000]],
    desc: "Apoyar la atención de pacientes según los protocolos de la institución, con trato humano y registro correcto de la información.",
    req: "Formación en el área con registro vigente (RETHUS cuando aplique). Disponibilidad para turnos rotativos.",
    habilidades: ["Toma de signos vitales", "Atención humanizada", "Bioseguridad", "Historia clínica", "Manejo de medicamentos"],
    exp: [["Auxiliar de enfermería", "Clínica San Rafael", ["Atención de 12 pacientes por turno en hospitalización", "Registro de signos vitales en historia clínica"]], ["Auxiliar de farmacia", "Droguería Bienestar", ["Dispensación de fórmulas médicas", "Control de fechas de vencimiento"]]],
  },
  admin: {
    puestos: [["Auxiliar contable", "tecnico", 1600000, 2000000], ["Asistente administrativo(a)", "tecnologo", 1700000, 2300000], ["Recepcionista", "bachiller", 1423500, 1650000], ["Analista de nómina", "universitario", 2600000, 3500000]],
    desc: "Apoyar los procesos administrativos: facturación, archivo, atención de proveedores y manejo de agenda.",
    req: "Manejo de Excel y paquete Office. Experiencia en cargos administrativos (deseable).",
    habilidades: ["Excel intermedio", "Facturación electrónica", "Archivo y correspondencia", "Conciliaciones", "Atención a proveedores"],
    exp: [["Auxiliar administrativa", "Ferretería El Tornillo", ["Facturación electrónica y archivo de soportes", "Conciliación de caja menor"]], ["Recepcionista", "Hotel Mar Azul", ["Manejo de agenda y reservas", "Atención telefónica y de huéspedes"]]],
  },
  tecnologia: {
    puestos: [["Soporte técnico", "tecnologo", 2000000, 2800000], ["Desarrollador(a) web junior", "tecnologo", 2800000, 4200000], ["Community manager", "tecnologo", 1900000, 2700000], ["Técnico(a) de redes", "tecnico", 1800000, 2400000]],
    desc: "Dar soporte a usuarios y proyectos digitales de la empresa, documentar incidencias y proponer mejoras.",
    req: "Formación en sistemas o afines. Conocimientos según el cargo (redes, desarrollo web o redes sociales). Inglés básico.",
    habilidades: ["Mesa de ayuda", "HTML y CSS", "JavaScript", "Redes sociales", "Configuración de redes", "Documentación"],
    exp: [["Técnico de soporte", "Colegio Nuevo Horizonte", ["Soporte a 80 equipos de cómputo", "Configuración de red y usuarios"]], ["Desarrollador web", "Agencia Punto Digital", ["Maquetación de 10 sitios web", "Mantenimiento de tiendas en línea"]]],
  },
  alimentos: {
    puestos: [["Auxiliar de cocina", "bachiller", 1423500, 1650000], ["Cocinero(a)", "tecnico", 1700000, 2300000], ["Panadero(a)", "bachiller", 1500000, 1900000], ["Barista", "bachiller", 1423500, 1700000]],
    desc: "Preparar alimentos siguiendo recetas y normas de higiene, alistar insumos y mantener la cocina en orden.",
    req: "Curso de manipulación de alimentos. Disponibilidad fines de semana y festivos.",
    habilidades: ["Manipulación de alimentos", "Cocina caribeña", "Panadería", "Alistamiento de insumos", "Trabajo bajo presión"],
    exp: [["Ayudante de cocina", "Restaurante Sabor Costeño", ["Preparación de 150 almuerzos diarios", "Alistamiento de insumos y limpieza"]], ["Panadero", "Panadería La Esquina", ["Producción de pan y amasijos desde las 4 a. m.", "Control de temperaturas del horno"]]],
  },
  servicios: {
    puestos: [["Mesero(a)", "bachiller", 1423500, 1600000], ["Agente de call center", "bachiller", 1500000, 1900000], ["Recepcionista de hotel", "tecnico", 1600000, 2000000], ["Camarera de piso", "bachiller", 1423500, 1550000]],
    desc: "Brindar una excelente experiencia a clientes y huéspedes, resolver solicitudes y mantener los estándares de servicio.",
    req: "Actitud de servicio y buena comunicación. Inglés básico deseable para zonas turísticas.",
    habilidades: ["Servicio al cliente", "Inglés básico", "Manejo de quejas", "Atención telefónica", "Trabajo en equipo"],
    exp: [["Mesera", "Hotel Mar Azul", ["Atención de 20 mesas por turno", "Toma de pedidos en español e inglés"]], ["Asesor de servicio", "Contact Center del Norte", ["Atención de 70 llamadas diarias", "Solución en primer contacto del 85 %"]]],
  },
  construccion: {
    puestos: [["Ayudante de obra", "bachiller", 1450000, 1700000], ["Oficial de construcción", "bachiller", 1900000, 2500000], ["Electricista", "tecnico", 2000000, 2800000], ["Almacenista de obra", "tecnico", 1800000, 2200000]],
    desc: "Apoyar las labores de obra: mezcla, transporte de materiales, acabados e instalaciones según el cargo.",
    req: "Experiencia en obra. Curso de trabajo en alturas vigente (según el cargo). Uso de elementos de protección.",
    habilidades: ["Mampostería", "Acabados", "Instalaciones eléctricas", "Trabajo en alturas", "Lectura de planos"],
    exp: [["Ayudante de obra", "Construcciones La Roca", ["Apoyo en vaciado de placas", "Transporte y organización de materiales"]], ["Electricista", "Montajes Eléctricos del Caribe", ["Instalaciones residenciales en 3 proyectos", "Mantenimiento de tableros"]]],
  },
  transporte: {
    puestos: [["Conductor(a) de reparto", "bachiller", 1500000, 1900000], ["Domiciliario(a) en moto", "bachiller", 1423500, 1800000], ["Auxiliar de ruta", "bachiller", 1423500, 1550000]],
    desc: "Entregar pedidos a tiempo en la ciudad, cuidar la mercancía y el vehículo, y reportar novedades de la ruta.",
    req: "Licencia de conducción vigente (A2 o C1 según el cargo). Conocimiento de la ciudad.",
    habilidades: ["Conducción defensiva", "Conocimiento de rutas", "Manejo de efectivo", "Servicio al cliente", "Mantenimiento básico"],
    exp: [["Domiciliario", "Mensajería Rápida", ["Entrega de 35 domicilios diarios", "Recaudo y cuadre de efectivo"]], ["Conductor de reparto", "Distribuidora del Caribe", ["Ruta de 40 tiendas por día", "Cero incidentes en 2 años"]]],
  },
  belleza: {
    puestos: [["Estilista", "bachiller", 1423500, 2200000], ["Manicurista", "bachiller", 1423500, 1800000], ["Barbero(a)", "bachiller", 1423500, 2000000]],
    desc: "Prestar servicios de belleza con calidad e higiene, fidelizar clientes y cuidar los insumos del salón.",
    req: "Experiencia comprobable en el oficio. Buena presentación de los servicios (portafolio o prueba práctica).",
    habilidades: ["Cortes y peinados", "Colorimetría", "Manicure y pedicure", "Barbería", "Bioseguridad"],
    exp: [["Estilista", "Salón Glamour", ["Atención de 12 clientes por día", "Coloración y tratamientos capilares"]], ["Barbero", "Barbería Estilo Urbano", ["Cortes clásicos y degradados", "Clientela fija de 40 personas"]]],
  },
  educacion: {
    puestos: [["Docente de inglés", "universitario", 2300000, 3200000], ["Auxiliar de preescolar", "tecnico", 1500000, 1800000], ["Tutor(a) de matemáticas", "universitario", 1800000, 2600000]],
    desc: "Acompañar procesos de aprendizaje con planeación de clases, seguimiento a estudiantes y comunicación con familias.",
    req: "Formación en el área. Experiencia con niños o jóvenes. Nivel de inglés B2 para docencia de inglés.",
    habilidades: ["Planeación de clases", "Inglés B2", "Manejo de grupo", "Evaluación formativa", "Didáctica"],
    exp: [["Docente de inglés", "Instituto de Idiomas Caribe", ["Grupos de 15 estudiantes de nivel A1 a B1", "Diseño de material didáctico"]], ["Auxiliar de preescolar", "Jardín Pequeños Genios", ["Acompañamiento a 20 niños de 3 a 5 años", "Actividades lúdicas y de motricidad"]]],
  },
  otro: {
    puestos: [["Guarda de seguridad", "bachiller", 1500000, 1900000], ["Operario(a) de aseo", "bachiller", 1423500, 1500000], ["Jardinero(a)", "bachiller", 1423500, 1600000]],
    desc: "Apoyar la operación diaria de las instalaciones cumpliendo los protocolos de la empresa.",
    req: "Experiencia en el cargo. Curso de vigilancia vigente para guardas de seguridad.",
    habilidades: ["Control de accesos", "Limpieza y desinfección", "Jardinería", "Reporte de novedades", "Puntualidad"],
    exp: [["Guarda de seguridad", "Conjunto Residencial Las Palmas", ["Control de acceso de 300 residentes", "Rondas y bitácora de novedades"]], ["Operaria de aseo", "Centro Comercial Portal", ["Limpieza de zonas comunes", "Manejo de productos de desinfección"]]],
  },
};

/* ---------------- Empresas ficticias ---------------- */
// [clave, email, nombre comercial, contacto, ciudad, sector, áreas, verificación, plan]
const EMPRESAS = [
  ["corralito", "corralito@demo.co", "Restaurante El Corralito", "Doña Rosa", "Cartagena", "alimentos", ["alimentos", "servicios"], "verificada", "gratis"],
  ["economia", "d1barranquilla@demo.co", "Tienda La Economía", "Mario Gómez", "Barranquilla", "comercio", ["ventas", "logistica"], "verificada", "pro"],
  ["caribe", "constructoracaribe@demo.co", "Constructora Caribe SAS", "Ing. Pardo", "Santa Marta", "construccion", ["construccion"], "verificada", "gratis"],
  ["merced", "clinicamerced@demo.co", "Clínica La Merced", "Talento Humano", "Barranquilla", "salud", ["salud", "admin"], "verificada", "pro"],
  ["rutacaribe", "transcaribe@demo.co", "RutaCaribe Express", "Pedro Julio", "Cartagena", "transporte", ["transporte", "logistica"], "en_revision", "gratis"],
  ["nomada", "nomadatech@demo.co", "NómadaTech", "Sara López", "Barranquilla", "servicios", ["tecnologia"], "sin_verificar", "gratis"],
  ["ahorro", "talento.elahorro@demo.co", "Supermercado El Ahorro", "Julieth Ospino", "Barranquilla", "comercio", ["ventas", "logistica", "admin"], "verificada", "pro"],
  ["tornillo", "rrhh.tornillofeliz@demo.co", "Ferretería El Tornillo Feliz", "Álvaro Mejía", "Santa Marta", "comercio", ["ventas", "logistica"], "verificada", "gratis"],
  ["vidasana", "seleccion.vidasana@demo.co", "Droguería Vida Sana", "Luz Marina Cantillo", "Cartagena", "salud", ["salud", "ventas"], "verificada", "gratis"],
  ["modacaribe", "hola.modacaribe@demo.co", "Moda Caribe Boutique", "Karen Barrios", "Cartagena", "comercio", ["ventas"], "sin_verificar", "gratis"],
  ["bahia", "talento.bahia@demo.co", "Distribuidora Bahía", "Rafael Castro", "Santa Marta", "comercio", ["transporte", "logistica", "ventas"], "verificada", "pro"],
  ["espiga", "trabaja.espiga@demo.co", "Panadería La Espiga Dorada", "Nelly Pacheco", "Barranquilla", "alimentos", ["alimentos", "ventas"], "verificada", "gratis"],
  ["mono", "dondemono@demo.co", "Asadero Donde Mono", "Ramón Díaz", "Barranquilla", "alimentos", ["alimentos", "servicios", "transporte"], "en_revision", "gratis"],
  ["brisa", "equipo.brisadelmar@demo.co", "Heladería Brisa del Mar", "Paola Rincón", "Santa Marta", "alimentos", ["alimentos", "servicios"], "sin_verificar", "gratis"],
  ["frutos", "frutosmagdalena@demo.co", "Frutos del Magdalena", "Edgar Villa", "Santa Marta", "alimentos", ["alimentos", "logistica"], "verificada", "gratis"],
  ["brisas", "talento.hotelbrisas@demo.co", "Hotel Brisas de Bocagrande", "Adriana Salcedo", "Cartagena", "servicios", ["servicios", "alimentos", "admin"], "verificada", "pro"],
  ["costaazul", "seleccion.costaazul@demo.co", "Contact Center Costa Azul", "Andrés Vergara", "Barranquilla", "servicios", ["servicios", "tecnologia"], "verificada", "gratis"],
  ["aseo", "aseointegral@demo.co", "Aseo Integral del Caribe", "Yolanda Mercado", "Cartagena", "servicios", ["otro"], "verificada", "gratis"],
  ["speakup", "docentes.speakup@demo.co", "Academia de Inglés Speak Up Caribe", "Laura Fontalvo", "Barranquilla", "servicios", ["educacion", "admin"], "verificada", "gratis"],
  ["divina", "saldivina@demo.co", "Salón de Belleza Divina", "Diana Orozco", "Cartagena", "servicios", ["belleza"], "sin_verificar", "gratis"],
  ["patron", "barberiaelpatron@demo.co", "Barbería El Patrón", "Jhon Fredy Ruiz", "Barranquilla", "servicios", ["belleza"], "verificada", "gratis"],
  ["atlantica", "operaciones.segatlantica@demo.co", "Seguridad Atlántica Ltda", "Coronel (r) Blanco", "Barranquilla", "servicios", ["otro"], "rechazada", "gratis"],
  ["acabados", "obrasnorte@demo.co", "Obras y Acabados del Norte", "Iván Charris", "Barranquilla", "construccion", ["construccion"], "verificada", "gratis"],
  ["electro", "electromagdalena@demo.co", "Electro Instalaciones Magdalena", "Óscar Linero", "Santa Marta", "construccion", ["construccion", "tecnologia"], "sin_verificar", "gratis"],
  ["bienestar", "talento.ipsbienestar@demo.co", "IPS Bienestar Costero", "Gloria Herazo", "Cartagena", "salud", ["salud", "admin"], "verificada", "gratis"],
  ["santalucia", "lab.santalucia@demo.co", "Laboratorio Clínico Santa Lucía", "Mónica Arrieta", "Santa Marta", "salud", ["salud"], "verificada", "gratis"],
  ["sonrisa", "sonrisacaribe@demo.co", "Odontología Sonrisa Caribe", "Dr. Camilo Pérez", "Barranquilla", "salud", ["salud", "admin"], "en_revision", "gratis"],
  ["veloz", "mensajeriaveloz@demo.co", "Mensajería Veloz Costa", "Wilmer Ortega", "Barranquilla", "transporte", ["transporte"], "verificada", "gratis"],
  ["puerto", "rrhh.puertoseguro@demo.co", "Logística Puerto Seguro", "Tatiana Jiménez", "Cartagena", "transporte", ["logistica", "transporte", "admin"], "verificada", "pro"],
  ["mundonuevo", "colegiomundonuevo@demo.co", "Colegio Mundo Nuevo", "Rectoría", "Santa Marta", "otro", ["educacion", "otro"], "verificada", "gratis"],
  ["manos", "fundacionmanos@demo.co", "Fundación Manos Caribe", "Beatriz Tovar", "Cartagena", "otro", ["educacion", "admin"], "sin_verificar", "gratis"],
  ["marea", "agenciamarea@demo.co", "Agencia Creativa Marea", "Sebastián Ariza", "Barranquilla", "servicios", ["tecnologia", "ventas"], "verificada", "gratis"],
  ["palmas", "hotelpalmas@demo.co", "Hotel Las Palmas del Rodadero", "Ernesto Gutiérrez", "Santa Marta", "servicios", ["servicios", "alimentos"], "verificada", "gratis"],
  ["pistón", "tallerpiston@demo.co", "Taller Automotriz El Pistón", "Luis Carlos Rada", "Barranquilla", "otro", ["otro", "transporte"], "sin_verificar", "gratis"],
];

const CIUDADES = ["Barranquilla", "Cartagena", "Santa Marta"];
const NOMBRES = ["María", "José", "Luisa", "Carlos", "Andrea", "Jorge", "Dayana", "Kevin", "Yuleidis", "Andrés", "Katherine", "Luis", "Daniela", "Jhon", "Valentina", "Juan", "Paola", "Miguel", "Laura", "Brayan", "Natalia", "Sebastián", "Camila", "Diego", "Melissa", "Óscar", "Stefany", "Alejandro", "Tatiana", "Jesús", "Karen", "Ricardo", "Yesica", "Fabián", "Mariana", "Eduardo", "Liliana", "Wilson", "Sandra", "Jaider"];
const APELLIDOS = ["García", "Martínez", "Pérez", "Rodríguez", "Barrios", "Castro", "Mejía", "Orozco", "Polo", "Fontalvo", "Charris", "Ospino", "Pacheco", "Mercado", "Cantillo", "Herrera", "De la Hoz", "Gutiérrez", "Salcedo", "Vergara", "Ariza", "Rada", "Tovar", "Arrieta", "Jiménez", "Blanco", "Díaz", "Villa", "Rincón", "Linero", "Támara", "Cortés", "Ríos", "Fernández", "Movil", "Julio", "Pardo", "Olivares", "Escorcia", "Marriaga"];
const INSTITUCIONES = { bachiller: "Institución Educativa Distrital", tecnico: "SENA Regional Atlántico", tecnologo: "SENA Centro de Comercio y Servicios", universitario: "Universidad del Atlántico", profesional: "Universidad del Magdalena" };

/* ---------------- Utilidades de BD ---------------- */
/** PostgREST exige las mismas columnas en todas las filas de un lote: completa las faltantes con null. */
function normalizar(filas) {
  const claves = [...new Set(filas.flatMap((f) => Object.keys(f)))];
  return filas.map((f) => Object.fromEntries(claves.map((k) => [k, f[k] === undefined ? null : f[k]])));
}
async function insertar(tabla, filasOriginales) {
  const filas = normalizar(filasOriginales);
  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await db.from(tabla).insert(filas.slice(i, i + 500));
    if (error) throw new Error(`${tabla}: ${error.message}`);
  }
}
async function upsert(tabla, filas, onConflict) {
  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await db.from(tabla).upsert(filas.slice(i, i + 500), onConflict ? { onConflict } : undefined);
    if (error) throw new Error(`${tabla}: ${error.message}`);
  }
}
async function limpiar(tabla) {
  const { error } = await db.from(tabla).delete().not("id", "is", null);
  if (error) throw new Error(`limpiar ${tabla}: ${error.message}`);
}
async function enParalelo(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const k = i++;
      await fn(items[k], k);
    }
  }));
}
const usuarios = new Map();
async function cargarUsuarios() {
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) usuarios.set(u.email, u.id);
    if (data.users.length < 1000) break;
  }
}
async function asegurarUsuario(email, tipo, nombre) {
  if (usuarios.has(email)) return usuarios.get(email);
  const { data, error } = await db.auth.admin.createUser({ email, password: PASS, email_confirm: true, user_metadata: { tipo, nombre } });
  if (error) throw new Error(`auth ${email}: ${error.message}`);
  usuarios.set(email, data.user.id);
  return data.user.id;
}
function sumarHabiles(desde, dias) {
  let t = desde;
  while (dias > 0) {
    t += DIA;
    const d = new Date(t - 5 * HORA).getUTCDay();
    if (d !== 0 && d !== 6) dias--;
  }
  return t;
}
const referencia = (ms) => `CL-${iso(ms).slice(0, 10).replace(/-/g, "")}-${codigo(6)}`;

/* ============================================================ */
async function main() {
  console.log(`→ Destino: ${URL}`);
  await cargarUsuarios();

  const { count: yaAuditado } = await db.from("audit_log").select("id", { count: "exact", head: true }).contains("metadata", { seed: SEED_TAG });
  const primeraVez = !yaAuditado;

  console.log("→ Limpiando datos de dominio…");
  for (const t of ["eventos", "notificaciones_wsp", "ia_uso", "linkedin_perfiles", "hojas_de_vida", "solicitudes_titular", "webhook_eventos", "vacantes", "pagos", "suscripciones"]) {
    await limpiar(t);
  }

  const audit = [];
  const eventos = [];
  const consentimientos = [];
  const aud = (o) => audit.push({ ip: ip(), user_agent: pick(UA), ...o, metadata: { ...(o.metadata ?? {}), seed: SEED_TAG } });

  /* ---------------- Staff ---------------- */
  console.log("→ Staff…");
  const adminEmail = (process.env.ADMIN_EMAILS || "").split(",")[0].trim();
  const staff = [];
  if (adminEmail) staff.push({ email: adminEmail, rol: "super_admin", nombre: "Equipo CostaLaboral" });
  staff.push({ email: "admin@demo.co", rol: "admin", nombre: "Paula Admin" }, { email: "moderador@demo.co", rol: "moderador", nombre: "Mateo Moderador" });
  for (const s of staff) {
    s.id = await asegurarUsuario(s.email, s.email === adminEmail ? "candidato" : "admin", s.nombre);
  }
  await upsert("staff", staff.map((s) => ({ user_id: s.id, rol: s.rol, nombre: s.nombre })), "user_id");
  const admin = staff.find((s) => s.rol !== "moderador") ?? staff[0];
  const moderador = staff.find((s) => s.rol === "moderador");
  const actorAdmin = (s = admin) => ({ actor_id: s.id, actor_tipo: "admin", actor_email: s.email });

  /* ---------------- Empresas ---------------- */
  console.log(`→ Empresas (${EMPRESAS.length})…`);
  const empresas = EMPRESAS.map(([key, email, nombre_negocio, nombre_contacto, ciudad, sector, areas, verificacion, plan]) => {
    const creado = hace(entre(35, 95));
    return { key, email, nombre_negocio, nombre_contacto, ciudad, sector, areas, verificacion, plan, creado };
  });
  await enParalelo(empresas, 6, async (e) => { e.id = await asegurarUsuario(e.email, "empresa", e.nombre_contacto); });
  await upsert("empresas", empresas.map((e) => {
    const solicitada = e.verificacion !== "sin_verificar" ? e.creado + entre(1, 6) * DIA : null;
    const verificadaEn = e.verificacion === "verificada" ? solicitada + entre(0.2, 2) * DIA : null;
    e.verificadaEn = verificadaEn;
    e.solicitada = solicitada;
    return {
      id: e.id, nombre_negocio: e.nombre_negocio, nombre_contacto: e.nombre_contacto, email: e.email,
      whatsapp: `+57300${String(int(1000000, 9999999))}`, ciudad: e.ciudad, sector: e.sector,
      razon_social: e.verificacion !== "sin_verificar" ? `${e.nombre_negocio.replace(/ SAS| Ltda/, "")} SAS` : null,
      nit: e.verificacion !== "sin_verificar" ? `90${int(1000000, 9999999)}-${int(0, 9)}` : null,
      descripcion: `${e.nombre_negocio} es una empresa de ${e.ciudad} del sector ${e.sector}.`,
      verificacion: e.verificacion, verificacion_solicitada_en: solicitada ? iso(solicitada) : null,
      verificada_en: verificadaEn ? iso(verificadaEn) : null, verificada_por: verificadaEn ? admin.id : null,
      verificacion_nota: e.verificacion === "rechazada" ? "El NIT no coincide con la razón social registrada en el RUT. Por favor actualízalo y vuelve a solicitar." : null,
      plan: "gratis", creado_en: iso(e.creado),
    };
  }));
  for (const e of empresas) {
    eventos.push({ tipo: "registro_empresa", actor_id: e.id, actor_tipo: "empresa", entidad: "empresas", entidad_id: e.id, meta: { sector: e.sector, ciudad: e.ciudad }, creado_en: iso(e.creado) });
    aud({ actor_id: e.id, actor_tipo: "empresa", accion: "empresa.registro", entidad: "empresas", entidad_id: e.id, creado_en: iso(e.creado) });
    consentimientos.push(...["tratamiento_datos", "terminos"].map((f) => ({ titular_id: e.id, titular_tipo: "empresa", finalidad: f, otorgado: true, version_documento: "2026-09-14", canal: "registro_empresa", ip: ip(), creado_en: iso(e.creado) })));
    if (e.solicitada) aud({ actor_id: e.id, actor_tipo: "empresa", accion: "empresa.verificacion_solicitada", entidad: "empresas", entidad_id: e.id, creado_en: iso(e.solicitada) });
    if (e.verificadaEn) {
      aud({ ...actorAdmin(), accion: "empresa.verificada", entidad: "empresas", entidad_id: e.id, antes: { verificacion: "en_revision" }, despues: { verificacion: "verificada" }, creado_en: iso(e.verificadaEn) });
      eventos.push({ tipo: "empresa_verificada", actor_id: admin.id, actor_tipo: "admin", entidad: "empresas", entidad_id: e.id, meta: { nombre_negocio: e.nombre_negocio }, creado_en: iso(e.verificadaEn) });
    }
    if (e.verificacion === "rechazada") aud({ ...actorAdmin(), accion: "empresa.verificacion_rechazada", entidad: "empresas", entidad_id: e.id, metadata: { nota: "NIT no coincide" }, creado_en: iso(e.solicitada + DIA) });
  }

  /* ---------------- Vacantes ---------------- */
  console.log("→ Vacantes…");
  const vacantes = [];
  for (const e of empresas) {
    const verificada = e.verificacion === "verificada";
    const n = e.plan === "pro" ? int(6, 9) : int(2, 6);
    for (let i = 0; i < n; i++) {
      const area = pick(e.areas);
      const [titulo, nivel, sMin, sMax] = pick(PUESTOS[area].puestos);
      const modalidad = area === "tecnologia" ? pesos({ remoto: 4, hibrido: 4, presencial: 2 }) : pesos({ presencial: 17, hibrido: 2, remoto: 1 });
      const tipo = pesos({ tiempo_completo: 12, medio_tiempo: 3, por_dias: 2, temporal: 2, practicas: 1 });
      const salMin = redondear(entre(sMin, (sMin + sMax) / 2));
      const salMax = chance(0.8) ? Math.max(salMin, redondear(entre((sMin + sMax) / 2, sMax))) : null;
      const v = {
        id: randomUUID(), empresa: e, empresa_id: e.id, titulo, area, nivel_educativo_min: nivel,
        ciudad: chance(0.85) ? e.ciudad : pick(CIUDADES), modalidad, tipo,
        disponibilidad_requerida: pesos({ inmediata: 5, en_2_semanas: 3, en_1_mes: 2 }),
        salario_min: tipo === "por_dias" ? redondear(entre(70000, 110000), 5000) : salMin,
        salario_max: tipo === "por_dias" ? null : salMax,
        tiene_contrato: tipo === "por_dias" ? false : chance(0.85),
        descripcion: `${PUESTOS[area].desc}\n\nOfrecemos buen ambiente de trabajo, pago puntual y crecimiento en ${e.nombre_negocio}.`,
        requisitos: PUESTOS[area].req,
        motivo_moderacion: null, motivo_cierre: null, cerrada: null, destacada_hasta: null,
      };
      const r = rnd();
      if (verificada) {
        if (r < 0.04) { v.estado = "borrador"; }
        else if (r < 0.12) { v.estado = "cerrada"; v.motivo_cierre = pesos({ contratado: 6, cerrada: 2, expirada: 2 }); }
        else if (r < 0.18) { v.estado = "pausada"; v.estado_moderacion = "aprobada"; }
        else if (r < 0.20) { v.estado = "publicada"; v.estado_moderacion = "pendiente"; v.motivo_moderacion = "Posible requisito discriminatorio: límite de edad"; }
        else { v.estado = "publicada"; v.estado_moderacion = "aprobada"; }
      } else {
        if (r < 0.07) { v.estado = "borrador"; }
        else if (r < 0.15) { v.estado = "publicada"; v.estado_moderacion = "rechazada"; v.motivo_moderacion = pick(["Solicita pago al candidato por el curso de inducción", "Requisito discriminatorio: “solo hombres”", "Salario y datos de contacto inconsistentes"]); }
        else if (r < 0.55) { v.estado = "publicada"; v.estado_moderacion = "pendiente"; v.motivo_moderacion = "Empresa sin verificar: revisión previa"; }
        else if (r < 0.60) { v.estado = "pausada"; v.estado_moderacion = "aprobada"; }
        else { v.estado = "publicada"; v.estado_moderacion = "aprobada"; }
      }
      v.estado_moderacion ??= "aprobada";
      if (v.estado === "borrador") {
        v.creado = hace(entre(0.5, 10));
        v.publicada = null;
      } else if (v.estado === "cerrada") {
        const dias = v.motivo_cierre === "expirada" ? entre(61, 85) : entre(30, 80);
        v.publicada = Math.max(e.creado + DIA, hace(dias));
        v.cerrada = v.motivo_cierre === "expirada" ? v.publicada + 60 * DIA : v.publicada + entre(8, 25) * DIA;
        if (v.cerrada > NOW) { v.cerrada = NOW - entre(1, 5) * DIA; }
        v.creado = v.publicada - entre(0.05, 0.5) * DIA;
      } else {
        v.publicada = Math.max(e.creado + DIA, hace(entre(0.2, 55)));
        v.creado = v.publicada - entre(0.02, 0.3) * DIA;
      }
      v.expira = (v.publicada ?? v.creado) + 60 * DIA;
      v.visible = v.estado === "publicada" && v.estado_moderacion === "aprobada" && v.expira > NOW;
      if (v.visible && verificada && chance(e.plan === "pro" ? 0.35 : 0.12)) {
        v.destacadaDur = pick([7, 15, 30]);
        v.destacada_hasta = NOW + entre(1, v.destacadaDur - 0.5) * DIA;
        v.compraDestacada = Math.max(v.publicada + HORA, v.destacada_hasta - v.destacadaDur * DIA);
      }
      const diasPublicada = v.publicada ? ((v.cerrada ?? NOW) - v.publicada) / DIA : 0;
      v.nVistas = v.publicada && v.estado_moderacion === "aprobada" ? Math.round(Math.min(260, (diasPublicada + 1) * entre(1.5, 4.5)) * (v.destacada_hasta ? 1.8 : 1)) : 0;
      vacantes.push(v);
    }
  }

  // Reportes: algunas vacantes visibles quedan ocultas por 3 reportes abiertos.
  const visibles = barajar(vacantes.filter((v) => v.visible));
  const reportadas = visibles.slice(0, 2);
  for (const v of reportadas) v.estado_moderacion = "reportada";
  const conReporteAbierto = visibles.slice(2, 7);
  const conReporteDescartado = visibles.slice(7, 10);
  const rechazadasPorReporte = vacantes.filter((v) => v.estado_moderacion === "rechazada").slice(0, 2);

  await insertar("vacantes", vacantes.map((v) => ({
    id: v.id, empresa_id: v.empresa_id, titulo: v.titulo, descripcion: v.descripcion, requisitos: v.requisitos, ciudad: v.ciudad,
    modalidad: v.modalidad, tipo: v.tipo, area: v.area, nivel_educativo_min: v.nivel_educativo_min,
    disponibilidad_requerida: v.disponibilidad_requerida, salario_min: v.salario_min, salario_max: v.salario_max,
    tiene_contrato: v.tiene_contrato, estado: v.estado, estado_moderacion: v.estado_moderacion, motivo_moderacion: v.motivo_moderacion,
    motivo_cierre: v.motivo_cierre, cerrada_en: v.cerrada ? iso(v.cerrada) : null, publicada_en: v.publicada ? iso(v.publicada) : null,
    creado_en: iso(v.creado), actualizada_en: iso(v.cerrada ?? v.publicada ?? v.creado), expira_en: iso(v.expira),
    destacada_hasta: v.destacada_hasta ? iso(v.destacada_hasta) : null, vistas: v.nVistas,
  })));
  for (const v of vacantes) {
    const actorEmpresa = { actor_id: v.empresa_id, actor_tipo: "empresa" };
    aud({ ...actorEmpresa, accion: "vacante.creada", entidad: "vacantes", entidad_id: v.id, metadata: { titulo: v.titulo }, creado_en: iso(v.creado) });
    if (!v.publicada) continue;
    aud({ ...actorEmpresa, accion: "vacante.publicada", entidad: "vacantes", entidad_id: v.id, despues: { estado: "publicada", estado_moderacion: v.empresa.verificacion === "verificada" ? "aprobada" : "pendiente" }, creado_en: iso(v.publicada) });
    eventos.push({ tipo: "vacante_publicada", actor_id: v.empresa_id, actor_tipo: "empresa", entidad: "vacantes", entidad_id: v.id, meta: { titulo: v.titulo, ciudad: v.ciudad }, creado_en: iso(v.publicada) });
    if (v.empresa.verificacion !== "verificada" && ["aprobada", "rechazada", "reportada"].includes(v.estado_moderacion)) {
      const quien = chance(0.6) && moderador ? moderador : admin;
      const cuando = v.publicada + entre(1, 20) * HORA;
      const final = v.estado_moderacion === "rechazada" ? "rechazada" : "aprobada";
      aud({ ...actorAdmin(quien), accion: "vacante.moderada", entidad: "vacantes", entidad_id: v.id, antes: { estado_moderacion: "pendiente" }, despues: { estado_moderacion: final }, metadata: final === "rechazada" ? { motivo: v.motivo_moderacion } : {}, creado_en: iso(cuando) });
      eventos.push({ tipo: "vacante_moderada", actor_id: quien.id, actor_tipo: "admin", entidad: "vacantes", entidad_id: v.id, meta: { estado: final }, creado_en: iso(cuando) });
    }
    if (v.empresa.verificacion === "verificada" && v.estado_moderacion !== "pendiente") {
      aud({ actor_id: null, actor_tipo: "sistema", accion: "vacante.moderada", entidad: "vacantes", entidad_id: v.id, antes: null, despues: { estado_moderacion: "aprobada" }, metadata: { motivo: "empresa_verificada" }, creado_en: iso(v.publicada) });
    }
    if (v.estado === "pausada") aud({ ...actorEmpresa, accion: "vacante.pausada", entidad: "vacantes", entidad_id: v.id, creado_en: iso(v.publicada + entre(2, 10) * DIA) });
    if (v.cerrada) {
      aud(v.motivo_cierre === "expirada"
        ? { actor_id: null, actor_tipo: "sistema", accion: "vacante.expirada", entidad: "vacantes", entidad_id: v.id, creado_en: iso(v.cerrada) }
        : { ...actorEmpresa, accion: "vacante.cerrada", entidad: "vacantes", entidad_id: v.id, metadata: { motivo: v.motivo_cierre }, creado_en: iso(v.cerrada) });
    }
  }

  /* ---------------- Candidatos ---------------- */
  console.log("→ Candidatos…");
  const BASE = [
    ["maria@demo.co", "María García", "Barranquilla", "bachiller", "ventas", "inmediata", "gratis"],
    ["carlos@demo.co", "Carlos Támara", "Cartagena", "tecnico", "alimentos", "inmediata", "camelleitor"],
    ["luisa@demo.co", "Luisa Fernández", "Barranquilla", "tecnologo", "salud", "en_2_semanas", "gratis"],
    ["andres@demo.co", "Andrés Movil", "Barranquilla", "bachiller", "logistica", "inmediata", "gratis"],
    ["dayana@demo.co", "Dayana Ríos", "Cartagena", "universitario", "servicios", "inmediata", "berraco_pro"],
    ["jorge@demo.co", "Jorge Polo", "Santa Marta", "bachiller", "construccion", "inmediata", "gratis"],
    ["kevin@demo.co", "Kevin Olivares", "Barranquilla", "tecnologo", "tecnologia", "inmediata", "camelleitor"],
    ["andrea@demo.co", "Andrea Cortés", "Cartagena", "bachiller", "transporte", "en_1_mes", "gratis"],
  ];
  const candidatos = BASE.map(([email, nombre, ciudad, nivel, area, disp, plan]) => ({ email, nombre, ciudad, nivel_educativo: nivel, area_interes: area, disponibilidad: disp, planObjetivo: plan }));
  if (adminEmail) candidatos.push({ email: adminEmail, nombre: "Equipo CostaLaboral", ciudad: "Barranquilla", nivel_educativo: "universitario", area_interes: "ventas", disponibilidad: "inmediata", planObjetivo: "berraco_pro" });
  const AREAS_PESO = { ventas: 16, servicios: 14, alimentos: 11, logistica: 10, salud: 9, admin: 9, transporte: 8, construccion: 7, tecnologia: 6, belleza: 4, educacion: 3, otro: 3 };
  const NIVEL_POR_AREA = (area) => area === "tecnologia" || area === "educacion" ? pesos({ tecnico: 2, tecnologo: 4, universitario: 3, profesional: 1 })
    : area === "salud" ? pesos({ bachiller: 2, tecnico: 5, tecnologo: 2, universitario: 1 })
    : pesos({ bachiller: 10, tecnico: 4, tecnologo: 2, universitario: 1 });
  for (let i = 0; i < 255; i++) {
    const nombre = `${pick(NOMBRES)} ${pick(APELLIDOS)}`;
    const area = pesos(AREAS_PESO);
    candidatos.push({
      email: `${slug(nombre.split(" ")[0])}.${slug(nombre.split(" ").slice(1).join(""))}${i + 1}@demo.co`,
      nombre, ciudad: pesos({ Barranquilla: 45, Cartagena: 33, "Santa Marta": 22 }), nivel_educativo: NIVEL_POR_AREA(area), area_interes: area,
      disponibilidad: pesos({ inmediata: 6, en_2_semanas: 3, en_1_mes: 1 }),
      planObjetivo: pesos({ gratis: 80, camelleitor: 13, berraco_pro: 7 }),
    });
  }
  for (const c of candidatos) {
    c.creado = c.email.endsWith("@demo.co") && BASE.some((b) => b[0] === c.email) ? hace(entre(60, 90)) : hace(Math.pow(rnd(), 0.8) * 92 + 0.2);
    const [cargoExp, empresaExp, logrosExp] = pick(PUESTOS[c.area_interes].exp);
    c.expTpl = { cargo: cargoExp, empresa: empresaExp, logros: logrosExp };
    c.anios = int(0, 8);
    c.experiencia = c.anios === 0 ? "Sin experiencia formal. Ganas de aprender y empezar a trabajar." : `${c.anios} ${c.anios === 1 ? "año" : "años"} como ${cargoExp.toLowerCase()} en ${empresaExp}. ${logrosExp[0]}.`;
    c.activo = !chance(0.01);
    c.wsp = chance(0.82);
    c.visible = chance(0.45);
  }
  console.log(`   creando ${candidatos.length} cuentas de auth…`);
  await enParalelo(candidatos, 8, async (c) => { c.id = await asegurarUsuario(c.email, "candidato", c.nombre); });
  await upsert("candidatos", candidatos.map((c) => ({
    id: c.id, nombre: c.nombre, email: c.email, whatsapp: `+573${int(0, 2)}${String(int(10000000, 99999999))}`, ciudad: c.ciudad,
    barrio: chance(0.5) ? pick(["El Prado", "Manga", "Bocagrande", "Rebolo", "Olaya Herrera", "Gaira", "Taganga", "La Boquilla", "Villa Country", "El Recreo"]) : null,
    nivel_educativo: c.nivel_educativo, area_interes: c.area_interes, disponibilidad: c.disponibilidad, experiencia: c.experiencia,
    plan: "gratis", activo: c.activo, wsp_opt_in: c.wsp, wsp_opt_in_en: c.wsp ? iso(c.creado) : null,
    perfil_visible_empresas: c.visible, mayor_de_edad: true, creado_en: iso(c.creado), actualizado_en: iso(c.creado),
  })));
  for (const c of candidatos) {
    eventos.push({ tipo: "registro_candidato", actor_id: c.id, actor_tipo: "candidato", entidad: "candidatos", entidad_id: c.id, meta: { ciudad: c.ciudad, area_interes: c.area_interes }, creado_en: iso(c.creado) });
    aud({ actor_id: c.id, actor_tipo: "candidato", accion: "candidato.registro", entidad: "candidatos", entidad_id: c.id, creado_en: iso(c.creado) });
    consentimientos.push(...[["tratamiento_datos", true], ["terminos", true], ["mayoria_edad", true], ["whatsapp", c.wsp]].map(([f, otorgado]) => ({ titular_id: c.id, titular_tipo: "candidato", finalidad: f, otorgado, version_documento: "2026-09-14", canal: "registro_candidato", ip: ip(), creado_en: iso(c.creado) })));
    if (c.visible) consentimientos.push({ titular_id: c.id, titular_tipo: "candidato", finalidad: "perfil_visible_empresas", otorgado: true, version_documento: "2026-09-14", canal: "cuenta", ip: ip(), creado_en: iso(c.creado + entre(1, 10) * DIA) });
    if (!c.activo) aud({ ...actorAdmin(), accion: "candidato.desactivado", entidad: "candidatos", entidad_id: c.id, metadata: { motivo: "Perfil falso reportado" }, creado_en: iso(c.creado + 3 * DIA) });
    for (let k = 0, n = int(1, 8); k < n; k++) eventos.push({ tipo: "login", actor_id: c.id, actor_tipo: "candidato", meta: {}, creado_en: iso(entre(c.creado, NOW)) });
  }
  if (adminEmail) aud({ ...actorAdmin(), accion: "staff.rol_cambiado", entidad: "staff", entidad_id: moderador?.id, antes: { rol: "admin" }, despues: { rol: "moderador" }, creado_en: iso(hace(40)) });

  /* ---------------- Suscripciones y pagos ---------------- */
  console.log("→ Suscripciones y pagos…");
  const suscripciones = [];
  const pagos = [];
  const PRECIO = { camelleitor: 29900, berraco_pro: 49900, pro: 99000 };
  const PERIODO = { camelleitor: 90, berraco_pro: 90, pro: 30 };
  const planVigente = new Map();
  function registrarPagoAprobado(o) {
    pagos.push({ id: randomUUID(), referencia: referencia(o.fecha), estado: "aprobado", moneda: "COP", proveedor: "sandbox", external_id: `sbx_${codigo(18)}`, aprobado_en: iso(o.fecha + 2 * 60000), creado_en: iso(o.fecha), actualizado_en: iso(o.fecha), metadata: o.metadata ?? {}, ...o.fila });
    eventos.push({ tipo: "pago_aprobado", actor_id: o.fila.propietario_id, actor_tipo: o.fila.propietario_tipo, entidad: "pagos", meta: { producto: o.fila.producto, monto: o.fila.monto }, creado_en: iso(o.fecha) });
    aud({ actor_id: null, actor_tipo: "sistema", accion: "pago.aprobado", entidad: "pagos", entidad_id: pagos.at(-1).id, metadata: { producto: o.fila.producto, monto: o.fila.monto }, creado_en: iso(o.fecha + 2 * 60000) });
  }
  function suscribir(propietario, tipo, plan, inicio, { estado = "active", canceladaEn = null, cancelarAlFinal = false } = {}) {
    const fin = inicio + PERIODO[plan] * DIA;
    const s = { id: randomUUID(), propietario_id: propietario.id, propietario_tipo: tipo, plan, proveedor: "sandbox", customer_externo: `cus_${codigo(14)}`, estado, periodo_inicio: iso(inicio), periodo_fin: iso(fin), cancelar_al_final: cancelarAlFinal, cancelada_en: canceladaEn ? iso(canceladaEn) : null, creado_en: iso(inicio), actualizado_en: iso(canceladaEn ?? inicio) };
    suscripciones.push(s);
    const producto = plan === "pro" ? "plan_empresa_pro" : `plan_${plan}`;
    registrarPagoAprobado({ fecha: inicio, fila: { suscripcion_id: s.id, propietario_id: propietario.id, propietario_tipo: tipo, concepto: "suscripcion", producto, monto: PRECIO[plan] } });
    aud({ actor_id: null, actor_tipo: "sistema", accion: "suscripcion.activada", entidad: "suscripciones", entidad_id: s.id, metadata: { plan }, creado_en: iso(inicio + 3 * 60000) });
    eventos.push({ tipo: "plan_activado", actor_id: propietario.id, actor_tipo: tipo, meta: { plan }, creado_en: iso(inicio) });
    return s;
  }
  let reembolsos = 0;
  for (const c of candidatos) {
    if (chance(0.07)) {
      const intento = entre(c.creado, NOW);
      pagos.push({ id: randomUUID(), referencia: referencia(intento), propietario_id: c.id, propietario_tipo: "candidato", concepto: "suscripcion", producto: pick(["plan_camelleitor", "plan_berraco_pro"]), proveedor: "sandbox", external_id: `sbx_${codigo(18)}`, monto: 29900, moneda: "COP", estado: "fallido", metadata: { motivo: "Fondos insuficientes (simulado)" }, creado_en: iso(intento), actualizado_en: iso(intento) });
      aud({ actor_id: null, actor_tipo: "sistema", accion: "pago.fallido", entidad: "pagos", entidad_id: pagos.at(-1).id, creado_en: iso(intento + 60000) });
    }
    if (c.planObjetivo === "gratis") {
      if (reembolsos < 2 && chance(0.03)) {
        const inicio = entre(c.creado + DIA, NOW - 5 * DIA);
        const s = suscribir(c, "candidato", "camelleitor", inicio, { estado: "canceled", canceladaEn: inicio + 2 * DIA });
        const pago = pagos.at(-1);
        pago.estado = "reembolsado";
        pago.metadata = { motivo: "Derecho de retracto (Ley 1480, art. 47)" };
        aud({ ...actorAdmin(), accion: "pago.reembolsado", entidad: "pagos", entidad_id: pago.id, creado_en: iso(inicio + 2 * DIA) });
        aud({ ...actorAdmin(), accion: "suscripcion.cancelada", entidad: "suscripciones", entidad_id: s.id, metadata: { inmediata: true }, creado_en: iso(inicio + 2 * DIA) });
        reembolsos++;
      }
      continue;
    }
    const inicio = Math.min(NOW - HORA, c.creado + entre(0.1, 1) * Math.max(DIA, (NOW - c.creado) * 0.7));
    const s = suscribir(c, "candidato", c.planObjetivo, inicio, { cancelarAlFinal: chance(0.12) });
    if (s.cancelar_al_final) aud({ actor_id: c.id, actor_tipo: "candidato", accion: "suscripcion.cancelada", entidad: "suscripciones", entidad_id: s.id, metadata: { al_final_del_periodo: true }, creado_en: iso(inicio + entre(3, 20) * DIA) });
    c.inicioPlan = inicio;
    planVigente.set(c.id, c.planObjetivo);
  }
  let pastDue = false;
  for (const e of empresas.filter((x) => x.plan === "pro")) {
    const inicioActual = hace(entre(1, 26));
    suscribir(e, "empresa", "pro", inicioActual - 30 * DIA, { estado: "expired" });
    if (!pastDue) {
      pastDue = true;
      const inicio = hace(31);
      const s = suscribir(e, "empresa", "pro", inicio, { estado: "past_due" });
      const renov = hace(1);
      pagos.push({ id: randomUUID(), referencia: referencia(renov), suscripcion_id: s.id, propietario_id: e.id, propietario_tipo: "empresa", concepto: "renovacion", producto: "plan_empresa_pro", proveedor: "sandbox", monto: 99000, moneda: "COP", estado: "pendiente", metadata: {}, creado_en: iso(renov), actualizado_en: iso(renov) });
      aud({ actor_id: null, actor_tipo: "sistema", accion: "suscripcion.past_due", entidad: "suscripciones", entidad_id: s.id, creado_en: iso(renov) });
    } else {
      suscribir(e, "empresa", "pro", inicioActual);
    }
    planVigente.set(e.id, "pro");
  }
  for (const v of vacantes.filter((x) => x.compraDestacada)) {
    const producto = `destacada_${v.destacadaDur}d`;
    const incluida = v.empresa.plan === "pro" && chance(0.4);
    pagos.push({ id: randomUUID(), referencia: referencia(v.compraDestacada), propietario_id: v.empresa_id, propietario_tipo: "empresa", concepto: "vacante_destacada", producto, proveedor: incluida ? "incluida" : "sandbox", external_id: incluida ? null : `sbx_${codigo(18)}`, monto: incluida ? 0 : { 7: 19900, 15: 34900, 30: 59900 }[v.destacadaDur], moneda: "COP", estado: "aprobado", aprobado_en: iso(v.compraDestacada), metadata: { vacanteId: v.id, duracionDias: v.destacadaDur }, creado_en: iso(v.compraDestacada), actualizado_en: iso(v.compraDestacada) });
    if (!incluida) eventos.push({ tipo: "pago_aprobado", actor_id: v.empresa_id, actor_tipo: "empresa", entidad: "pagos", meta: { producto, monto: pagos.at(-1).monto }, creado_en: iso(v.compraDestacada) });
    eventos.push({ tipo: "vacante_destacada", actor_id: v.empresa_id, actor_tipo: "empresa", entidad: "vacantes", entidad_id: v.id, meta: { producto }, creado_en: iso(v.compraDestacada) });
    aud({ actor_id: null, actor_tipo: "sistema", accion: "vacante.destacada", entidad: "vacantes", entidad_id: v.id, despues: { destacada_hasta: iso(v.destacada_hasta) }, metadata: { producto, incluida }, creado_en: iso(v.compraDestacada) });
  }
  await insertar("suscripciones", suscripciones);
  await insertar("pagos", pagos);
  for (const [id, plan] of planVigente) {
    const tabla = plan === "pro" ? "empresas" : "candidatos";
    const { error } = await db.from(tabla).update({ plan }).eq("id", id);
    if (error) throw new Error(`plan ${tabla}: ${error.message}`);
  }

  /* ---------------- Postulaciones, historial, vistas y notificaciones ---------------- */
  console.log("→ Postulaciones e historial…");
  const aplicables = vacantes.filter((v) => v.publicada && ["aprobada", "reportada"].includes(v.estado_moderacion) && v.estado !== "borrador");
  const postulaciones = [];
  const historial = [];
  const notificaciones = [];
  const FLUJO = ["enviada", "vista", "contactado", "en_entrevista", "contratado"];
  const fuenteAl = () => pesos({ recomendacion: 34, busqueda: 38, whatsapp: 12, directo: 9, compartido: 7 });
  for (const c of candidatos.filter((x) => x.activo)) {
    const evaluadas = aplicables.map((v) => ({ v, d: evaluarMatch(c, v) }));
    const buenas = barajar(evaluadas.filter((x) => x.d.score >= 60));
    const flojas = barajar(evaluadas.filter((x) => x.d.score >= 40 && x.d.score < 60));
    const elegidas = [...buenas.slice(0, pesos({ 0: 2, 1: 3, 2: 3, 3: 2, 4: 2, 6: 1, 8: 1 }) * 1), ...(chance(0.15) ? flojas.slice(0, 1) : [])];
    for (const { v, d } of elegidas) {
      const desde = Math.max(v.publicada, c.creado) + HORA;
      const hasta = Math.min(v.cerrada ?? NOW, v.expira, NOW) - HORA;
      if (hasta <= desde) continue;
      const creado = desde + Math.pow(rnd(), 1.6) * (hasta - desde);
      const fuente = fuenteAl();
      const id = randomUUID();
      const edadDias = (NOW - creado) / DIA;
      let pasos = 0;
      if (edadDias > 0.5 && chance(0.75)) pasos = 1;
      if (pasos === 1 && edadDias > 2 && d.score >= 70 && chance(0.45)) pasos = 2;
      if (pasos === 2 && edadDias > 4 && chance(0.55)) pasos = 3;
      if (pasos === 3 && edadDias > 7 && chance(0.35)) pasos = 4;
      let estado = FLUJO[pasos];
      let t = creado;
      historial.push({ postulacion_id: id, estado_anterior: null, estado_nuevo: "enviada", actor_id: c.id, actor_tipo: "candidato", creado_en: iso(t) });
      for (let k = 1; k <= pasos; k++) {
        const anterior = t;
        t = Math.min(NOW - 60000, t + entre(0.2, 3) * DIA);
        historial.push({ postulacion_id: id, estado_anterior: FLUJO[k - 1], estado_nuevo: FLUJO[k], actor_id: v.empresa_id, actor_tipo: "empresa", creado_en: iso(t) });
        aud({ actor_id: v.empresa_id, actor_tipo: "empresa", accion: "postulacion.estado_cambiado", entidad: "postulaciones", entidad_id: id, antes: { estado: FLUJO[k - 1] }, despues: { estado: FLUJO[k] }, creado_en: iso(t) });
        if (t <= anterior) break;
      }
      if (pasos >= 1 && pasos < 4 && chance(0.12)) {
        const antes = estado;
        estado = chance(0.8) ? "descartado" : "retirada";
        t = Math.min(NOW - 60000, t + entre(0.5, 4) * DIA);
        const actor = estado === "retirada" ? { actor_id: c.id, actor_tipo: "candidato" } : { actor_id: v.empresa_id, actor_tipo: "empresa" };
        historial.push({ postulacion_id: id, estado_anterior: antes, estado_nuevo: estado, ...actor, nota: estado === "descartado" && chance(0.5) ? "Perfil no se ajusta a los horarios" : null, creado_en: iso(t) });
        aud({ ...actor, accion: estado === "retirada" ? "postulacion.retirada" : "postulacion.estado_cambiado", entidad: "postulaciones", entidad_id: id, antes: { estado: antes }, despues: { estado }, creado_en: iso(t) });
        if (estado === "retirada") eventos.push({ tipo: "postulacion_retirada", actor_id: c.id, actor_tipo: "candidato", entidad: "postulaciones", entidad_id: id, meta: {}, creado_en: iso(t) });
      }
      postulaciones.push({ id, candidato_id: c.id, vacante_id: v.id, estado, estado_actualizado_en: iso(t), score_match: d.score, match_detalle: d, fuente, mensaje: chance(0.35) ? pick(["Hola, tengo experiencia en el cargo y disponibilidad inmediata.", "Me interesa mucho la vacante, vivo cerca.", "Buenas tardes, quedo atento(a) a su llamada.", "Tengo los cursos al día y ganas de trabajar."]) : null, creado_en: iso(creado) });
      aud({ actor_id: c.id, actor_tipo: "candidato", accion: "postulacion.creada", entidad: "postulaciones", entidad_id: id, metadata: { vacante_id: v.id, score: d.score, fuente }, creado_en: iso(creado) });
      eventos.push({ tipo: "vacante_vista", actor_id: c.id, actor_tipo: "candidato", entidad: "vacantes", entidad_id: v.id, meta: { fuente }, creado_en: iso(creado - entre(2, 40) * 60000) });
      eventos.push({ tipo: "postulacion", actor_id: c.id, actor_tipo: "candidato", entidad: "vacantes", entidad_id: v.id, meta: { score: d.score, fuente }, creado_en: iso(creado) });
      if (fuente === "recomendacion") eventos.push({ tipo: "recomendacion_click", actor_id: c.id, actor_tipo: "candidato", entidad: "vacantes", entidad_id: v.id, meta: {}, creado_en: iso(creado - 60 * 60000) });
      if (fuente === "whatsapp" && c.wsp) notificaciones.push({ candidato_id: c.id, vacante_id: v.id, tipo: "enlace_real", mensaje: `Hola ${c.nombre.split(" ")[0]}, hay una vacante de ${v.titulo} en ${v.ciudad} que encaja con tu perfil: https://costa-laboral.vercel.app/v/${v.id}?src=whatsapp`, enviado_en: iso(creado - entre(1, 20) * HORA), leido: true });
      v.postulados = (v.postulados ?? 0) + 1;
    }
  }
  // Una contratación por cada vacante cerrada con "contratado" que tenga postulados.
  for (const v of vacantes.filter((x) => x.motivo_cierre === "contratado")) {
    const p = postulaciones.find((x) => x.vacante_id === v.id && x.estado !== "retirada");
    if (!p) continue;
    const antes = p.estado;
    p.estado = "contratado";
    p.estado_actualizado_en = iso(v.cerrada - HORA);
    historial.push({ postulacion_id: p.id, estado_anterior: antes, estado_nuevo: "contratado", actor_id: v.empresa_id, actor_tipo: "empresa", creado_en: iso(v.cerrada - HORA) });
  }
  await insertar("postulaciones", postulaciones);
  await insertar("postulacion_historial", historial);

  // Notificaciones de vacantes recomendadas (envío manual en fase 1) e invitaciones de empresas Pro.
  for (const c of candidatos.filter((x) => x.wsp && x.activo)) {
    for (let k = 0, n = int(0, 3); k < n; k++) {
      const v = pick(aplicables);
      if (evaluarMatch(c, v).score < 60) continue;
      notificaciones.push({ candidato_id: c.id, vacante_id: v.id, tipo: "enlace_real", mensaje: `Hola ${c.nombre.split(" ")[0]}, encontramos un camello para ti: ${v.titulo} en ${v.ciudad}. Míralo aquí: https://costa-laboral.vercel.app/v/${v.id}?src=whatsapp`, enviado_en: iso(Math.max(v.publicada, c.creado) + entre(1, 30) * HORA), leido: chance(0.6) });
    }
  }
  await insertar("notificaciones_wsp", notificaciones.filter((n) => Date.parse(n.enviado_en) < NOW));

  // Vistas adicionales y recomendaciones mostradas (para KPIs y analítica).
  for (const v of vacantes) {
    const extra = Math.max(0, v.nVistas - (v.postulados ?? 0));
    for (let k = 0; k < extra; k++) {
      const desde = v.publicada;
      const hasta = Math.min(v.cerrada ?? NOW, NOW);
      const c = chance(0.6) ? pick(candidatos) : null;
      eventos.push({ tipo: "vacante_vista", actor_id: c?.id ?? null, actor_tipo: c ? "candidato" : "visitante", entidad: "vacantes", entidad_id: v.id, meta: { fuente: pesos({ busqueda: 45, recomendacion: 22, directo: 14, compartido: 11, whatsapp: 8 }) }, creado_en: iso(entre(desde, hasta)) });
    }
  }
  for (const c of candidatos) {
    for (let k = 0, n = int(1, 9); k < n; k++) {
      const cuando = entre(c.creado, NOW);
      const cantidad = int(3, 14);
      eventos.push({ tipo: "recomendaciones_mostradas", actor_id: c.id, actor_tipo: "candidato", meta: { cantidad, vacante_ids: barajar(aplicables).slice(0, Math.min(cantidad, 5)).map((v) => v.id) }, creado_en: iso(cuando) });
    }
  }

  /* ---------------- Hojas de vida, LinkedIn y uso de IA ---------------- */
  console.log("→ Hojas de vida, LinkedIn y uso de IA…");
  const hojas = [];
  const linkedins = [];
  const iaUso = [];
  const costo = (inp, out) => Math.round((inp * 5 + out * 25) / 1e6 * 1e6) / 1e6;
  function usoIA({ actor, feature, entidad, entidadId, plan, cuando }) {
    const estado = pesos({ ok: 90, validacion_fallida: 4, error: 4, rechazo: 1 });
    const esHV = feature === "hv_generar";
    const inp = estado === "error" || estado === "rechazo" ? 0 : esHV ? int(1700, 2700) : int(2200, 3600);
    const out = estado === "error" || estado === "rechazo" ? 0 : esHV ? int(2600, 5600) : int(1300, 3400);
    iaUso.push({
      actor_id: actor.id, actor_tipo: "candidato", feature, entidad, entidad_id: estado === "ok" || estado === "validacion_fallida" ? entidadId : null,
      proveedor: "anthropic", modelo: "claude-opus-5", modelo_servido: estado === "error" ? null : "claude-opus-5",
      prompt_version: esHV ? "hv-2026-09-14.1" : "linkedin-2026-09-14.1", plan,
      input_tokens: inp, output_tokens: out, cache_creation_tokens: 0, cache_read_tokens: 0, costo_usd: costo(inp, out),
      latencia_ms: estado === "error" ? int(800, 4000) : esHV ? int(14000, 48000) : int(8000, 30000), estado,
      error: estado === "error" ? pick(["api_529_overloaded", "api_429_rate_limit", "timeout"]) : estado === "rechazo" ? "refusal_otro" : null,
      request_id: estado === "error" ? null : `req_${codigo(24)}`, creado_en: iso(cuando),
    });
    return estado;
  }
  for (const c of candidatos) {
    const plan = planVigente.get(c.id) ?? "gratis";
    const pago = plan !== "gratis";
    if (!pago && !chance(0.18)) continue;
    if (pago && !chance(0.85)) continue;
    const desde = Math.max(c.creado, c.inicioPlan ?? c.creado);
    const tpl = PUESTOS[c.area_interes];
    const cargoObjetivo = pick(tpl.puestos)[0];
    const entrada = {
      cargoObjetivo, aniosExperiencia: c.anios,
      experiencia: c.anios === 0 ? [] : [{ cargo: c.expTpl.cargo, empresa: c.expTpl.empresa, periodo: `${2026 - Math.min(c.anios, 6)} – 2026`, descripcion: c.expTpl.logros.join(". ") }],
      habilidades: barajar(tpl.habilidades).slice(0, int(3, 5)),
      educacion: [`${LABEL_NIVEL[c.nivel_educativo]} — ${INSTITUCIONES[c.nivel_educativo]}`],
    };
    const contenido = {
      resumen: `${cargoObjetivo} ${c.anios === 0 ? "con muchas ganas de empezar y aprender rápido" : `con ${c.anios} ${c.anios === 1 ? "año" : "años"} de experiencia`} en ${LABEL_AREA[c.area_interes].toLowerCase()}, radicado(a) en ${c.ciudad}. Se destaca por ${entrada.habilidades.slice(0, 3).join(", ").toLowerCase()} y por su compromiso con el equipo.`,
      habilidades: entrada.habilidades,
      experiencia: entrada.experiencia.map((e) => ({ cargo: e.cargo, empresa: e.empresa, periodo: e.periodo, logros: c.expTpl.logros.map((l) => `${l}.`) })),
      educacion: entrada.educacion,
      logros: c.anios === 0 ? ["Disponibilidad inmediata y aprendizaje rápido."] : [c.expTpl.logros[0] + "."],
    };
    const generaciones = pago ? int(1, 3) : 1;
    let cuando = entre(desde, NOW - HORA);
    const hvId = randomUUID();
    for (let g = 0; g < generaciones; g++) {
      usoIA({ actor: c, feature: "hv_generar", entidad: "hojas_de_vida", entidadId: hvId, plan, cuando });
      cuando = Math.min(NOW - 30 * 60000, cuando + entre(0.02, 3) * DIA);
    }
    const aprobada = pago && chance(0.72);
    hojas.push({
      id: hvId, candidato_id: c.id, titulo: `Hoja de vida — ${cargoObjetivo}`, cargo_objetivo: cargoObjetivo, contenido, generada_por_ia: true,
      tipo: "base", datos_fuente: { entrada, perfil: { ciudad: c.ciudad, area: LABEL_AREA[c.area_interes], nivelEducativo: LABEL_NIVEL[c.nivel_educativo] } },
      estado: aprobada ? "aprobada" : "borrador", aprobada_en: aprobada ? iso(cuando) : null, prompt_version: "hv-2026-09-14.1", modelo: "claude-opus-5",
      validacion: { ok: true, problemas: [] }, creado_en: iso(cuando - HORA), actualizado_en: iso(cuando),
    });
    eventos.push({ tipo: "hv_generada", actor_id: c.id, actor_tipo: "candidato", entidad: "hojas_de_vida", entidad_id: hvId, meta: { plan }, creado_en: iso(cuando - HORA) });
    aud({ actor_id: c.id, actor_tipo: "candidato", accion: "hv.generada", entidad: "hojas_de_vida", entidad_id: hvId, creado_en: iso(cuando - HORA) });
    if (aprobada) {
      eventos.push({ tipo: "hv_aprobada", actor_id: c.id, actor_tipo: "candidato", entidad: "hojas_de_vida", entidad_id: hvId, meta: {}, creado_en: iso(cuando) });
      aud({ actor_id: c.id, actor_tipo: "candidato", accion: "hv.aprobada", entidad: "hojas_de_vida", entidad_id: hvId, creado_en: iso(cuando) });
      if (chance(0.6)) eventos.push({ tipo: "hv_exportada", actor_id: c.id, actor_tipo: "candidato", entidad: "hojas_de_vida", entidad_id: hvId, meta: { formato: pick(["pdf", "copia"]) }, creado_en: iso(cuando + entre(1, 60) * 60000) });
    }
    if (aprobada && plan === "berraco_pro") {
      for (const p of postulaciones.filter((x) => x.candidato_id === c.id).slice(0, int(0, 2))) {
        const v = vacantes.find((x) => x.id === p.vacante_id);
        const vid = randomUUID();
        hojas.push({ ...hojas.at(-1), id: vid, titulo: `Hoja de vida — ${v.titulo} (${v.empresa.nombre_negocio})`, tipo: "vacante", vacante_id: v.id, padre_id: hvId, creado_en: p.creado_en, actualizado_en: p.creado_en, aprobada_en: p.creado_en });
        eventos.push({ tipo: "hv_adaptada", actor_id: c.id, actor_tipo: "candidato", entidad: "hojas_de_vida", entidad_id: vid, meta: { vacante_id: v.id }, creado_en: p.creado_en });
        aud({ actor_id: c.id, actor_tipo: "candidato", accion: "hv.version_creada", entidad: "hojas_de_vida", entidad_id: vid, metadata: { vacante_id: v.id }, creado_en: p.creado_en });
      }
    }
    if (aprobada && chance(0.65)) {
      const avanzado = plan === "berraco_pro";
      const liId = randomUUID();
      const cuandoLi = Math.min(NOW - 10 * 60000, cuando + entre(0.1, 5) * DIA);
      for (let g = 0, n = int(1, 2); g < n; g++) usoIA({ actor: c, feature: "linkedin_generar", entidad: "linkedin_perfiles", entidadId: liId, plan, cuando: cuandoLi - g * HORA });
      const titular = `${cargoObjetivo} | ${LABEL_AREA[c.area_interes]} | ${c.ciudad}`;
      const liAprobado = chance(0.7);
      linkedins.push({
        id: liId, candidato_id: c.id, hoja_de_vida_id: hvId, nivel: avanzado ? "avanzado" : "basico",
        fuente: { tipo: "hoja_de_vida", hojaDeVidaId: hvId, perfil: { ciudad: c.ciudad, area: LABEL_AREA[c.area_interes], nivelEducativo: LABEL_NIVEL[c.nivel_educativo], cargoObjetivo, experienciaLibre: c.experiencia }, entrada, contenidoHV: contenido },
        contenido: {
          titular,
          acerca: `Soy ${cargoObjetivo.toLowerCase()} en ${c.ciudad}. ${contenido.resumen} Estoy abierto(a) a nuevas oportunidades donde pueda aportar y seguir creciendo.`,
          ...(avanzado ? {
            titulares_alternativos: [`${cargoObjetivo} en ${c.ciudad}`, `${LABEL_AREA[c.area_interes]} · ${entrada.habilidades[0]}`, `${cargoObjetivo} | ${entrada.habilidades.slice(0, 2).join(" · ")}`],
            habilidades: entrada.habilidades,
            experiencias: contenido.experiencia.map((e) => ({ cargo: e.cargo, empresa: e.empresa, descripcion: e.logros.join(" ") })),
            palabras_clave: [LABEL_AREA[c.area_interes], cargoObjetivo, c.ciudad, ...entrada.habilidades.slice(0, 3)],
          } : {}),
        },
        estado: liAprobado ? "aprobada" : "borrador", aprobado_en: liAprobado ? iso(cuandoLi) : null, generado_por_ia: true,
        prompt_version: "linkedin-2026-09-14.1", modelo: "claude-opus-5", validacion: { ok: true, problemas: [] }, creado_en: iso(cuandoLi), actualizado_en: iso(cuandoLi),
      });
      eventos.push({ tipo: "linkedin_generado", actor_id: c.id, actor_tipo: "candidato", entidad: "linkedin_perfiles", entidad_id: liId, meta: { nivel: avanzado ? "avanzado" : "basico" }, creado_en: iso(cuandoLi) });
      aud({ actor_id: c.id, actor_tipo: "candidato", accion: "linkedin.generado", entidad: "linkedin_perfiles", entidad_id: liId, creado_en: iso(cuandoLi) });
      if (liAprobado) aud({ actor_id: c.id, actor_tipo: "candidato", accion: "linkedin.aprobado", entidad: "linkedin_perfiles", entidad_id: liId, creado_en: iso(cuandoLi + 20 * 60000) });
    }
  }
  await insertar("hojas_de_vida", hojas);
  await insertar("linkedin_perfiles", linkedins);
  await insertar("ia_uso", iaUso);

  /* ---------------- Reportes ---------------- */
  console.log("→ Reportes…");
  const reportes = [];
  const reportantes = barajar(candidatos.filter((c) => c.activo));
  let r = 0;
  const reportar = (v, n, estado, extra = {}) => {
    for (let k = 0; k < n; k++) {
      const c = reportantes[r++ % reportantes.length];
      const cuando = Math.min(NOW - HORA, (v.publicada ?? NOW) + entre(0.5, 6) * DIA);
      reportes.push({ vacante_id: v.id, reportante_id: c.id, motivo: pick(["datos_falsos", "fraude", "cobro_al_candidato", "ya_no_existe", "discriminatoria", "otro"]), detalle: pick(["Me pidieron consignar dinero para el uniforme.", "El número de contacto no responde y el salario no coincide.", "Ya la llenaron hace semanas.", "Dicen que solo reciben mujeres menores de 25.", null]), estado, creado_en: iso(cuando), ...extra });
      eventos.push({ tipo: "reporte_vacante", actor_id: c.id, actor_tipo: "candidato", entidad: "vacantes", entidad_id: v.id, meta: {}, creado_en: iso(cuando) });
      aud({ actor_id: c.id, actor_tipo: "candidato", accion: "vacante.reportada", entidad: "vacantes", entidad_id: v.id, creado_en: iso(cuando) });
    }
  };
  for (const v of reportadas) reportar(v, 3, "abierto");
  for (const v of conReporteAbierto) reportar(v, int(1, 2), "abierto");
  for (const v of conReporteDescartado) {
    const cuando = hace(entre(1, 10));
    reportar(v, 1, "descartado", { resuelto_por: (moderador ?? admin).id, resuelto_en: iso(cuando), resolucion: "Se verificó con la empresa: la vacante es real." });
    aud({ ...actorAdmin(moderador ?? admin), accion: "reporte.resuelto", entidad: "vacantes", entidad_id: v.id, metadata: { decision: "descartar" }, creado_en: iso(cuando) });
  }
  for (const v of rechazadasPorReporte) {
    const cuando = hace(entre(1, 15));
    reportar(v, 2, "resuelto", { resuelto_por: admin.id, resuelto_en: iso(cuando), resolucion: "Se confirmó el cobro al candidato. Vacante rechazada." });
    aud({ ...actorAdmin(), accion: "reporte.resuelto", entidad: "vacantes", entidad_id: v.id, metadata: { decision: "rechazar_vacante" }, creado_en: iso(cuando) });
  }
  await insertar("reportes_vacante", reportes);

  /* ---------------- Solicitudes de titulares (Habeas Data) ---------------- */
  console.log("→ Solicitudes de datos personales…");
  const TIPOS_SOL = [["consulta", "recibida", 1], ["supresion", "recibida", 12], ["actualizacion", "recibida", 9], ["rectificacion", "en_tramite", 6], ["revocatoria", "en_tramite", 16, true], ["prueba_autorizacion", "respondida", 20], ["consulta", "respondida", 25], ["supresion", "respondida", 30], ["actualizacion", "cerrada", 45]];
  const solicitudes = TIPOS_SOL.map(([tipo, estado, diasAtras, prorroga], i) => {
    const c = candidatos[20 + i * 7];
    const creado = hace(diasAtras);
    const plazo = tipo === "consulta" || tipo === "prueba_autorizacion" ? 10 : 15;
    const vence = sumarHabiles(creado, plazo + (prorroga ? 8 : 0));
    const respondida = estado === "respondida" || estado === "cerrada" ? creado + entre(3, 9) * DIA : null;
    return {
      radicado: `HD-2026-${codigo(6)}`, titular_id: c.id, nombre: c.nombre, tipo_documento: "CC", numero_documento: String(int(1000000000, 1150000000)),
      email: c.email, telefono: null, tipo, descripcion: {
        consulta: "Quiero saber qué datos personales tienen registrados de mí y con quién los han compartido.",
        supresion: "Solicito eliminar mi cuenta y todos mis datos personales de la plataforma.",
        actualizacion: "Cambié de número de celular y de barrio, necesito actualizarlos.",
        rectificacion: "Mi nivel educativo aparece como bachiller y soy tecnóloga.",
        revocatoria: "Revoco la autorización para recibir mensajes de WhatsApp.",
        prueba_autorizacion: "Solicito copia de la autorización que di al registrarme.",
      }[tipo], estado, vence_en: iso(vence), prorrogada: !!prorroga,
      respuesta: respondida ? "Atendimos tu solicitud dentro del plazo legal. Te enviamos el detalle al correo registrado." : null,
      respondida_en: respondida ? iso(respondida) : null, atendida_por: estado === "recibida" ? null : admin.id, creado_en: iso(creado), actualizado_en: iso(respondida ?? creado),
    };
  });
  await insertar("solicitudes_titular", solicitudes);
  for (const s of solicitudes) {
    eventos.push({ tipo: "solicitud_titular", actor_id: s.titular_id, actor_tipo: "candidato", meta: { tipo: s.tipo }, creado_en: s.creado_en });
    aud({ actor_id: s.titular_id, actor_tipo: "candidato", accion: "solicitud_titular.creada", entidad: "solicitudes_titular", entidad_id: s.radicado, metadata: { tipo: s.tipo }, creado_en: s.creado_en });
    if (s.estado !== "recibida") aud({ ...actorAdmin(), accion: "solicitud_titular.actualizada", entidad: "solicitudes_titular", entidad_id: s.radicado, despues: { estado: s.estado, prorrogada: s.prorrogada }, creado_en: s.actualizado_en });
  }

  /* ---------------- Tareas programadas ---------------- */
  for (let d = 21; d >= 1; d--) {
    for (const [tarea, hora] of [["vacantes", 6], ["suscripciones", 7]]) {
      aud({ actor_id: null, actor_tipo: "sistema", accion: "sistema.tarea_programada", entidad: "cron", entidad_id: tarea, metadata: { tarea, ok: true }, creado_en: iso(hace(d) - (new Date(hace(d)).getUTCHours() - hora) * HORA) });
    }
  }

  /* ---------------- Eventos, consentimientos y auditoría ---------------- */
  console.log(`→ Eventos (${eventos.length})…`);
  await insertar("eventos", eventos.filter((e) => Date.parse(e.creado_en) <= NOW));
  if (primeraVez) {
    console.log(`→ Consentimientos (${consentimientos.length}) y auditoría (${audit.length})…`);
    await insertar("consentimientos", consentimientos);
    await insertar("audit_log", audit.filter((a) => Date.parse(a.creado_en) <= NOW).map((a) => ({ ...a, entidad_id: a.entidad_id ?? null })));
  } else {
    console.log("→ Auditoría y consentimientos ya sembrados antes (son append-only): no se duplican.");
  }

  const publicas = vacantes.filter((v) => v.visible && v.estado_moderacion === "aprobada").length;
  console.log(`
✅ Plataforma de demostración lista
   ${empresas.length} empresas · ${vacantes.length} vacantes (${publicas} visibles) · ${candidatos.length} candidatos
   ${postulaciones.length} postulaciones · ${suscripciones.length} suscripciones · ${pagos.length} pagos
   ${hojas.length} hojas de vida · ${linkedins.length} LinkedIn · ${iaUso.length} usos de IA
   ${reportes.length} reportes · ${solicitudes.length} solicitudes · ${eventos.length} eventos

   Contraseña de todas las cuentas demo: ${PASS}
   Admin:      ${adminEmail || "(define ADMIN_EMAILS)"} · admin@demo.co · moderador@demo.co
   Candidatos: maria@demo.co (gratis) · carlos@demo.co (Camelleitor) · dayana@demo.co (Berraco Pro)
   Empresas:   corralito@demo.co (verificada) · d1barranquilla@demo.co (Pro) · nomadatech@demo.co (sin verificar)`);
}

main().catch((e) => { console.error("❌", e.message ?? e); process.exit(1); });
