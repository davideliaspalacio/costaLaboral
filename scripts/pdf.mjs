// Genera un PDF de presentación para el cliente (no técnico) con todas las capturas.
// Uso: node scripts/pdf.mjs   (requiere las imágenes en docs/capturas/)
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const OUT_HTML = "docs/presentacion-cliente.html";
const OUT_PDF = "docs/CostaLaboral-Presentacion.pdf";

// Portada de la sección estrella (IA)
const spotlight = {
  color: "#ffd75e",
  kicker: "Lo nuevo",
  titulo: "Tu hoja de vida y tu LinkedIn, con Inteligencia Artificial",
  texto:
    "El candidato responde unas preguntas sencillas y la plataforma le arma una hoja de vida profesional y le mejora su perfil de LinkedIn. Puede crear varias versiones según el trabajo que busque. Es un beneficio de los planes de pago: da un motivo fuerte para suscribirse.",
};

// Cada foto con su explicación en lenguaje simple.
const secciones = [
  { img: "01-landing.png", kicker: "Página principal", titulo: "La bienvenida a CostaLaboral", texto: "Lo primero que ve la gente: una promesa clara —recibe solo las vacantes que encajan contigo, directo a tu WhatsApp— y las empresas publican gratis. Con botones grandes para empezar de una." },
  { img: "02-ofertas.png", kicker: "Explorar", titulo: "Todas las ofertas de la Costa", texto: "Un espacio para leer todas las vacantes a su ritmo, con buscador por palabra clave." },
  { img: "03-ofertas-filtro.png", kicker: "Explorar", titulo: "Filtrar por ciudad y área", texto: "Puede afinar la búsqueda por ciudad, área y tipo de trabajo, y ver cuántas ofertas hay." },
  { img: "05-registro-candidato.png", kicker: "Registro", titulo: "Crear cuenta en un minuto", texto: "Registro súper simple: nombre, WhatsApp, ciudad, área y nivel de estudios. Sin trámites ni hojas de vida eternas." },
  { img: "06-registro-empresa.png", kicker: "Registro", titulo: "Publicar una vacante (gratis)", texto: "La empresa publica en 3 pasos, en menos de 5 minutos. No se exige RUT ni cámara de comercio: cualquier negocio o emprendedor puede contratar." },
  { img: "09-vacante-anonimo.png", kicker: "Una vacante", titulo: "Cómo la ve alguien sin cuenta", texto: "Ve el cargo, la ciudad y el salario, y se le invita a registrarse para postularse. Un anzuelo claro para captar candidatos." },
  { img: "13-vacante-candidato.png", kicker: "Una vacante", titulo: "La misma vacante para un suscriptor", texto: "Con plan de pago ve todo: la empresa, los requisitos completos y su porcentaje de compatibilidad con el cargo." },
  { img: "10-mis-vacantes.png", kicker: "Candidato", titulo: "Solo lo que encaja contigo", texto: "El candidato no pierde tiempo: recibe una lista corta y personal de vacantes que sí van con su perfil, cada una con su porcentaje de match. Arriba, un acceso destacado a la hoja de vida con IA." },
  { img: "11-perfil.png", kicker: "Candidato", titulo: "Su perfil y sus postulaciones", texto: "Ve su plan, cuántas postulaciones le quedan y el historial con el estado de cada una." },
  { img: "14-empresa-panel.png", kicker: "Empresa", titulo: "Candidatos ordenados por compatibilidad", texto: "La empresa ve a los candidatos ordenados por porcentaje de match, con contacto directo por WhatsApp y estados (nuevo, contactado, en entrevista, contratado). Una herramienta de decisión, gratis." },
  { img: "04-planes.png", kicker: "Planes", titulo: "Gratis, Camelleitor y Berraco Pro", texto: "El candidato elige plan; las empresas siempre gratis. Los planes de pago incluyen la hoja de vida con IA." },
  { img: "08-privacidad.png", kicker: "Confianza", titulo: "Cuidamos los datos de la gente", texto: "Política de privacidad clara conforme a la ley colombiana: consentimiento, qué se comparte y derecho a borrar la cuenta." },
];

// Sección de administración (para el equipo dueño de la plataforma).
const admin = [
  { img: "15-admin-resumen.png", kicker: "Panel de control", titulo: "Todo el negocio de un vistazo", texto: "El equipo de CostaLaboral ve cuánta gente se registra, cuántas vacantes hay, la actividad del día y qué tan cerca están de las metas." },
  { img: "16-admin-candidatos.png", kicker: "Panel de control", titulo: "Gestión de candidatos", texto: "Buscar personas y activarlas o desactivarlas." },
  { img: "17-admin-empresas.png", kicker: "Panel de control", titulo: "Verificar empresas", texto: "Una fila de empresas por aprobar, con un botón para verificarlas." },
  { img: "18-admin-vacantes.png", kicker: "Panel de control", titulo: "Revisar y moderar vacantes", texto: "Aprobar, rechazar (con motivo) o reportar publicaciones para mantener la calidad." },
  { img: "19-admin-actividad.png", kicker: "Panel de control", titulo: "Registro de actividad", texto: "Un historial de todo lo que pasa en la plataforma: registros, publicaciones, postulaciones y avisos." },
  { img: "20-admin-staff.png", kicker: "Panel de control", titulo: "Roles del equipo", texto: "Permisos por rol (administrador general, administrador y moderador) para trabajar con orden." },
];

const iaShots = [
  { img: "12-hoja-de-vida-upsell.png", kicker: "Hoja de vida con IA", titulo: "Invitación a suscribirse", texto: "A quien está en el plan gratis se le muestra el beneficio y se le invita a subir de plan." },
  { img: "21-hoja-de-vida-panel.png", kicker: "Hoja de vida con IA", titulo: "Sus hojas de vida", texto: "El suscriptor guarda varias versiones y las vuelve a usar cuando quiera." },
  { img: "22-hv-wizard.png", kicker: "Hoja de vida con IA", titulo: "El asistente, paso a paso", texto: "Un flujo guiado y amable: objetivo, experiencia, habilidades, educación. Fácil hasta para quien nunca ha hecho una hoja de vida." },
  { img: "23-hv-resultado.png", kicker: "Hoja de vida con IA", titulo: "El resultado: CV + LinkedIn listos", texto: "En segundos obtiene su hoja de vida redactada y su perfil de LinkedIn optimizado, listos para editar y copiar." },
];

const css = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
:root{ --ink:#17140f; --canvas:#fffbf2; --brand:#0c7d76; --sol:#ffd75e; --coral:#ff5c39; --muted:#756c5b; --line:#e7dfce; }
body{ font-family:'Plus Jakarta Sans',sans-serif; color:var(--ink); }
h1,h2,h3{ font-family:'Bricolage Grotesque','Plus Jakarta Sans',sans-serif; letter-spacing:-.02em; }
.page{ width:100%; min-height:262mm; display:flex; flex-direction:column; page-break-after:always; }
.page:last-child{ page-break-after:auto; }
.kicker{ display:inline-block; border:2px solid var(--ink); background:var(--sol); border-radius:999px; padding:5px 14px; font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
.sec-title{ font-size:30px; font-weight:800; margin-top:12px; line-height:1.05; }
.sec-text{ font-size:15px; color:#3c362c; margin-top:8px; max-width:165mm; line-height:1.5; }
.shot{ margin-top:14px; flex:1; display:flex; align-items:flex-start; justify-content:center; }
.shot img{ max-width:100%; max-height:205mm; border:2px solid var(--ink); border-radius:10px; }

/* Portada */
.cover{ min-height:262mm; display:flex; flex-direction:column; justify-content:center; align-items:flex-start;
  background:var(--brand); color:#fff; border:2px solid var(--ink); border-radius:16px; padding:24mm; page-break-after:always; }
.cover .badge{ background:var(--sol); color:var(--ink); border:2px solid var(--ink); border-radius:999px; padding:6px 16px; font-weight:800; font-size:13px; }
.cover h1{ font-size:52px; font-weight:800; margin-top:18px; line-height:1.0; }
.cover p{ font-size:18px; margin-top:16px; max-width:150mm; opacity:.95; }
.cover .meta{ margin-top:28px; font-size:14px; opacity:.9; }
.logo{ display:flex; align-items:center; gap:10px; font-weight:800; font-size:22px; }
.logo .mk{ width:36px; height:36px; border-radius:9px; border:2px solid var(--ink); background:var(--sol); display:flex; align-items:center; justify-content:center; }

/* Spotlight (IA) */
.spot{ min-height:262mm; display:flex; flex-direction:column; justify-content:center; background:var(--sol);
  border:2px solid var(--ink); border-radius:16px; padding:24mm; page-break-after:always; }
.spot .kicker{ background:#fff; }
.spot h1{ font-size:44px; font-weight:800; margin-top:16px; line-height:1.05; }
.spot p{ font-size:17px; margin-top:14px; max-width:150mm; line-height:1.55; }

/* Cierre */
.close{ background:var(--ink); color:var(--canvas); border-radius:16px; padding:24mm; min-height:262mm; display:flex; flex-direction:column; justify-content:center; }
.close h1{ font-size:40px; }
.close ul{ margin-top:18px; list-style:none; }
.close li{ font-size:16px; margin-top:10px; padding-left:26px; position:relative; }
.close li:before{ content:"✓"; position:absolute; left:0; color:var(--sol); font-weight:800; }
`;

const secPage = (s) => `
  <section class="page">
    <span class="kicker">${s.kicker}</span>
    <h2 class="sec-title">${s.titulo}</h2>
    <p class="sec-text">${s.texto}</p>
    <div class="shot"><img src="capturas/${s.img}" /></div>
  </section>`;

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${css}</style></head><body>
  <div class="cover">
    <div class="logo"><span class="mk">🌴</span> CostaLaboral</div>
    <span class="badge" style="margin-top:22mm">Presentación de producto</span>
    <h1>La plataforma de empleo del Caribe colombiano</h1>
    <p>Conectamos a la gente de la Costa con trabajo real: cada persona recibe solo las vacantes que encajan con su perfil, directo a su WhatsApp. Las empresas publican gratis.</p>
    <div class="meta">Un recorrido por la plataforma, pantalla por pantalla · Julio 2026</div>
  </div>

  ${secciones.slice(0, 10).map(secPage).join("")}

  <div class="spot">
    <span class="kicker">${spotlight.kicker}</span>
    <h1>${spotlight.titulo}</h1>
    <p>${spotlight.texto}</p>
  </div>
  ${iaShots.map(secPage).join("")}

  ${secciones.slice(10).map(secPage).join("")}

  <span style="display:block; page-break-before:always"></span>
  <section class="page"><span class="kicker">Para el equipo</span><h2 class="sec-title">El panel de administración</h2>
  <p class="sec-text">Además de la experiencia del candidato y la empresa, el equipo de CostaLaboral cuenta con un panel para manejar toda la plataforma: ver el negocio, aprobar empresas, revisar vacantes y llevar el control por roles.</p></section>
  ${admin.map(secPage).join("")}

  <div class="close">
    <h1>En resumen</h1>
    <ul>
      <li>Los candidatos reciben solo lo que encaja con ellos — menos ruido, más resultados.</li>
      <li>Las empresas publican gratis y ven a los mejores candidatos primero.</li>
      <li>La hoja de vida con Inteligencia Artificial da una razón fuerte para suscribirse.</li>
      <li>Un panel de administración para manejar y hacer crecer la plataforma con orden.</li>
    </ul>
    <p style="margin-top:26px; opacity:.85; font-size:14px">CostaLaboral · Hecho en la Costa, para la Costa 🌴</p>
  </div>
</body></html>`;

await writeFile(OUT_HTML, html);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("file://" + resolve(OUT_HTML), { waitUntil: "networkidle" });
await page.waitForTimeout(1200); // fuentes web
await page.pdf({
  path: OUT_PDF,
  format: "A4",
  printBackground: true,
  margin: { top: "12mm", bottom: "14mm", left: "12mm", right: "12mm" },
  displayHeaderFooter: true,
  headerTemplate: "<div></div>",
  footerTemplate:
    '<div style="width:100%; font-size:8px; color:#999; padding:0 12mm; display:flex; justify-content:space-between;"><span>CostaLaboral · Presentación de producto</span><span>Página <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
});
await browser.close();
console.log("✅ PDF generado:", OUT_PDF);
