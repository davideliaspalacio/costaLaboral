// Contenido del blog de CostaLaboral (SEO). Enfocado en el mercado laboral
// del Caribe colombiano para posicionar por búsquedas locales.
// El cuerpo va en Markdown y se renderiza con `marked`.

export type PostBlog = {
  slug: string;
  titulo: string;
  descripcion: string; // meta description (~150 car.)
  fecha: string; // ISO
  categoria: string;
  autor: string;
  tags: string[];
  minutos: number;
  cuerpo: string; // Markdown
};

export const POSTS: PostBlog[] = [
  {
    slug: "como-conseguir-empleo-en-barranquilla",
    titulo: "Cómo conseguir empleo en Barranquilla en 2026: guía práctica",
    descripcion:
      "Guía paso a paso para conseguir trabajo en Barranquilla: dónde buscar, cómo destacar y qué sectores están contratando en la Arenosa.",
    fecha: "2026-06-20",
    categoria: "Buscar empleo",
    autor: "Equipo CostaLaboral",
    tags: ["Barranquilla", "empleo", "guía"],
    minutos: 6,
    cuerpo: `Buscar camello en Barranquilla puede sentirse cuesta arriba, pero con estrategia se consigue. Aquí te contamos cómo moverte.

## 1. Ten claro qué buscas
Antes de aplicar a todo, define tu **área** (ventas, logística, servicio al cliente, alimentos…) y las **zonas** donde te queda fácil llegar. En CostaLaboral solo te llegan las vacantes que encajan con tu perfil, así no pierdes tiempo.

## 2. Sectores que más contratan en la Arenosa
- **Comercio y ventas:** tiendas de barrio, almacenes y grandes superficies.
- **Alimentos y restaurantes:** meseros, cocina, domicilios.
- **Logística:** auxiliares de bodega y reparto.
- **Servicio al cliente y call centers.**

## 3. Prepárate lo mínimo
No necesitas una hoja de vida perfecta para empezar, pero sí una **clara**. Con el asistente de IA de CostaLaboral armas la tuya en minutos.

## 4. Postúlate rápido y contesta el WhatsApp
En la Costa, quien responde primero gana. Activa las notificaciones por WhatsApp y contesta apenas te escriban.

> **Ojo con las estafas:** ningún empleo serio te pide plata para "la entrevista" o "el uniforme". Reporta cualquier vacante sospechosa.

¿Listo para empezar? [Regístrate gratis](/registro-candidato) y recibe las vacantes de Barranquilla que van contigo.`,
  },
  {
    slug: "trabajos-sin-experiencia-en-cartagena",
    titulo: "Trabajos sin experiencia en Cartagena: por dónde empezar",
    descripcion:
      "¿Buscas tu primer empleo en Cartagena? Estos son los trabajos sin experiencia más comunes y cómo aplicar a ellos.",
    fecha: "2026-06-24",
    categoria: "Buscar empleo",
    autor: "Equipo CostaLaboral",
    tags: ["Cartagena", "primer empleo", "sin experiencia"],
    minutos: 5,
    cuerpo: `Conseguir el primer trabajo en Cartagena es más fácil de lo que crees si sabes dónde buscar.

## Trabajos que casi no piden experiencia
- **Mesero o ayudante de cocina** en el sector turístico.
- **Vendedor de mostrador** en tiendas y almacenes.
- **Auxiliar de bodega** y **domiciliario**.
- **Atención al cliente** y promotor.

## Cómo destacar aunque no tengas experiencia
1. Muestra **actitud y disponibilidad** (inmediata suma puntos).
2. Cuenta lo que has hecho aunque no fuera formal (negocio familiar, ayudas, cursos del SENA).
3. Sé puntual respondiendo por WhatsApp.

## Da el primer paso
Regístrate en CostaLaboral, cuéntanos tu área y tu ciudad, y te llegan las vacantes de Cartagena que puedes aplicar hoy. [Crear mi cuenta gratis](/registro-candidato).`,
  },
  {
    slug: "como-hacer-una-hoja-de-vida-que-llame",
    titulo: "Cómo hacer una hoja de vida que sí llame en la Costa",
    descripcion:
      "Aprende a hacer una hoja de vida sencilla y efectiva, aunque tengas poca experiencia. Con ejemplos y un asistente con IA.",
    fecha: "2026-06-28",
    categoria: "Hoja de vida",
    autor: "Equipo CostaLaboral",
    tags: ["hoja de vida", "consejos", "IA"],
    minutos: 5,
    cuerpo: `Tu hoja de vida es tu primera impresión. No tiene que ser larga, tiene que ser **clara**.

## Lo que sí debe llevar
- **Datos de contacto** (con tu WhatsApp).
- Un **resumen de 3 líneas**: quién eres y qué buscas.
- **Experiencia** (aunque sea informal) con lo que hacías.
- **Habilidades** y estudios.

## Errores que restan
- Correos poco serios o números mal escritos.
- Párrafos larguísimos.
- Faltas de ortografía.

## Hazla en minutos con IA
En CostaLaboral, el **asistente de hoja de vida con IA** te hace preguntas sencillas y te arma una HV profesional y hasta tu perfil de LinkedIn. Puedes crear varias versiones según el trabajo. [Pruébalo aquí](/hoja-de-vida).`,
  },
  {
    slug: "empleos-en-santa-marta-que-estan-contratando",
    titulo: "Empleos en Santa Marta que están contratando ahora mismo",
    descripcion:
      "Estos son los sectores y cargos que más contratan en Santa Marta y cómo aplicar rápido a las vacantes que van contigo.",
    fecha: "2026-07-01",
    categoria: "Buscar empleo",
    autor: "Equipo CostaLaboral",
    tags: ["Santa Marta", "empleo", "vacantes"],
    minutos: 6,
    cuerpo: `Santa Marta no es solo playa y turismo: es una ciudad que mueve camello todo el año. Si estás buscando empleo en la Perla del Caribe, aquí te contamos qué está contratando y cómo lanzarte.

## Sectores que más contratan en Santa Marta
- **Turismo y hotelería:** recepcionistas, camareros de piso, meseros, cocineros y guías. En temporada alta (diciembre y mitad de año) la demanda se dispara.
- **Comercio y ventas:** vendedores de mostrador, cajeros y promotores en almacenes y tiendas del Centro y de los centros comerciales.
- **Alimentos y bebidas:** restaurantes del malecón y el Rodadero buscando cocina, barra y domicilios.
- **Logística y bodega:** auxiliares de bodega, empacadores y repartidores.
- **Servicio al cliente:** call centers y atención presencial.

## Cómo aplicar sin dar vueltas
1. Ten claro tu **área** y tus **zonas** (Centro, Rodadero, Gaira, Bastidas). Así te llegan solo las vacantes que te quedan cerca.
2. Prepara una **hoja de vida corta y clara**. Si no tienes, con el [asistente de IA](/hoja-de-vida) la armas en minutos.
3. Activa las notificaciones por **WhatsApp** y contesta apenas te escriban. En Santa Marta, la temporada manda: el que responde primero se queda con el puesto.

## Ojo con la temporada
Muchos contratos son por temporada. Pregunta siempre si es fijo o temporal y si tiene prestaciones. Un buen camello temporal puede volverse fijo si dejas buena impresión.

> Ningún empleo serio te cobra por la entrevista, el uniforme ni "la vinculación". Si te piden plata, es estafa.

¿Listo para arrancar? [Regístrate gratis](/registro-candidato) y mira las [ofertas de Santa Marta](/ofertas) que están abiertas hoy.`,
  },
  {
    slug: "como-prepararte-para-una-entrevista-de-trabajo-en-la-costa",
    titulo: "Cómo prepararte para una entrevista de trabajo en la Costa",
    descripcion:
      "Consejos prácticos para brillar en tu entrevista de trabajo en el Caribe: qué llevar, cómo hablar y las preguntas más comunes.",
    fecha: "2026-07-01",
    categoria: "Consejos",
    autor: "Equipo CostaLaboral",
    tags: ["entrevista", "consejos", "empleo"],
    minutos: 5,
    cuerpo: `Te llamaron a entrevista, ¡eso ya es ganancia! Ahora toca prepararte para dejar buena impresión. Aquí va lo que sí funciona en la Costa.

## Antes de la entrevista
- **Averigua del negocio:** mira qué hacen, dónde quedan y qué venden. Con dos minutos en el celular ya llegas mejor preparado que la mayoría.
- **Repasa tu experiencia:** ten claro qué has hecho y qué sabes hacer, aunque haya sido informal (el negocio de la familia también cuenta).
- **Confirma la hora y la dirección** un día antes. La puntualidad es lo primero que miran.

## El día de la entrevista
- **Llega 10 minutos antes.** Tarde es tarde, y en la Costa lo notan.
- **Vístete sobrio y limpio.** No hace falta corbata, pero sí presentación.
- **Saluda con energía y mira a los ojos.** El costeño valora la actitud y la buena chispa, sin pasarse de confianzudo.

## Preguntas que casi siempre hacen
1. "Cuéntame de ti" — responde en 30 segundos: quién eres, qué sabes hacer y qué buscas.
2. "¿Por qué quieres este trabajo?" — conecta lo que sabes con lo que necesita el negocio.
3. "¿Cuándo puedes empezar?" — la **disponibilidad inmediata** suma muchísimo.

## Después
Agradece y confirma tu número de WhatsApp para que te contacten fácil. Un mensaje corto de gracias tras la entrevista deja buen sabor.

¿Aún no tienes tu hoja de vida lista para mostrar? [Ármala con IA en minutos](/hoja-de-vida) y llega a la entrevista con todo. O mira las [vacantes abiertas](/ofertas) y consigue la próxima.`,
  },
  {
    slug: "trabajos-por-dias-y-medio-tiempo-en-barranquilla",
    titulo: "Trabajos por días y medio tiempo en Barranquilla",
    descripcion:
      "¿Buscas ingresos extra o algo flexible? Estos son los trabajos por días y de medio tiempo más comunes en Barranquilla y cómo conseguirlos.",
    fecha: "2026-07-01",
    categoria: "Buscar empleo",
    autor: "Equipo CostaLaboral",
    tags: ["Barranquilla", "medio tiempo", "por días"],
    minutos: 5,
    cuerpo: `No todo el mundo busca un camello de 8 horas. Si estás estudiando, tienes otro trabajo o solo quieres un ingreso extra, en Barranquilla hay opciones por días y de medio tiempo.

## Trabajos por días más comunes
- **Meseros y ayudantes de eventos:** matrimonios, grados y fiestas necesitan gente los fines de semana.
- **Domicilios y mensajería:** con moto o bici, tú manejas tus horas.
- **Impulsadoras y promotores:** activaciones de marca en almacenes y supermercados.
- **Ayudantes de mudanza, bodega o inventario.**

## Trabajos de medio tiempo
- **Cajeros y vendedores** en turnos de mañana o tarde.
- **Atención al cliente** por horas en call centers.
- **Refuerzos de cocina** en horas pico.

## Cómo conseguirlos rápido
1. Deja clara tu **disponibilidad** (qué días y qué horas puedes). A los negocios les urge saberlo.
2. Ten tu **hoja de vida lista** aunque sea sencilla. [Ármala con IA](/hoja-de-vida) si no tienes.
3. Activa el **WhatsApp** y responde de una: estos puestos se llenan en horas.

## Ventajas de lo flexible
Un trabajo por días o de medio tiempo te da ingresos mientras estudias o buscas algo fijo, y muchas veces es la puerta de entrada a un contrato de tiempo completo si dejas buena impresión.

> Confirma siempre cómo y cuándo te pagan antes de arrancar. Un buen acuerdo se habla desde el principio.

Mira las [ofertas en Barranquilla](/ofertas) o [regístrate gratis](/registro-candidato) para que te lleguen las que encajan con tus horarios.`,
  },
];

export function getPostsBlog(): PostBlog[] {
  return [...POSTS].sort((a, b) => +new Date(b.fecha) - +new Date(a.fecha));
}

export function getPostBlog(slug: string): PostBlog | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function getCategoriasBlog(): string[] {
  return [...new Set(POSTS.map((p) => p.categoria))];
}
