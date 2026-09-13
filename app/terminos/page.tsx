import { FileText } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { MARCA, RESPONSABLE, VERSION_TERMINOS } from "@/lib/legal/documentos";
import {
  DatoResponsable,
  Destacado,
  EncabezadoLegal,
  EnlaceLegal,
  Fuerte,
  IndiceLegal,
  Lista,
  Punto,
  SeccionLegal,
  URL_SIC,
  fechaVersion,
} from "@/lib/legal/doc-legal";

export const metadata = buildMetadata({
  title: "Términos y condiciones",
  path: "/terminos",
  description:
    "Términos y condiciones de CostaLaboral: plataforma tecnológica que conecta candidatos y empresas del Caribe colombiano. No es agencia de colocación ni cobra comisión por contratación.",
});

const SECCIONES = [
  { id: "aceptacion", titulo: "Aceptación y quién presta el servicio" },
  { id: "naturaleza", titulo: "Naturaleza del servicio" },
  { id: "usuarios", titulo: "Usuarios y cuentas" },
  { id: "candidatos", titulo: "Reglas para candidatos" },
  { id: "empresas", titulo: "Obligaciones de las empresas" },
  { id: "moderacion", titulo: "Moderación, reportes y suspensión" },
  { id: "ia", titulo: "Contenido generado con inteligencia artificial" },
  { id: "planes", titulo: "Planes, pagos y facturación" },
  { id: "retracto", titulo: "Retracto, reversión y reembolsos" },
  { id: "piloto", titulo: "Pasarela de prueba durante el piloto" },
  { id: "propiedad", titulo: "Propiedad intelectual" },
  { id: "responsabilidad", titulo: "Limitación de responsabilidad" },
  { id: "datos", titulo: "Datos personales" },
  { id: "ley", titulo: "Ley aplicable y autoridad" },
  { id: "cambios", titulo: "Cambios a estos términos" },
  { id: "contacto", titulo: "Contacto" },
];

export default function TerminosPage() {
  const n = (id: string) => SECCIONES.findIndex((s) => s.id === id) + 1;
  const vigencia = fechaVersion(VERSION_TERMINOS);

  return (
    <div className="container-page py-14 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <EncabezadoLegal
          kicker="Legal"
          titulo="Términos y condiciones"
          icono={<FileText className="h-7 w-7" aria-hidden="true" />}
          version={VERSION_TERMINOS}
          vigencia={vigencia}
          intro={
            <p>
              Estas son las reglas para usar <Fuerte>{MARCA}</Fuerte>. Las escribimos en palabras claras. Si creas una
              cuenta, publicas una vacante, te postulas o compras un plan, aceptas estos términos.
            </p>
          }
        />

        <div className="mt-8">
          <Destacado>
            {MARCA} es una plataforma tecnológica que conecta candidatos y empresas. No es agencia de colocación, no
            selecciona ni contrata personal, no garantiza empleo y no cobra comisión por contratación.
          </Destacado>
        </div>

        <IndiceLegal secciones={SECCIONES} />

        <div className="mt-12 space-y-12">
          <SeccionLegal id="aceptacion" numero={n("aceptacion")} titulo="Aceptación y quién presta el servicio">
            <p>
              El servicio lo presta <DatoResponsable valor={RESPONSABLE.razonSocial} />, identificada con NIT{" "}
              <DatoResponsable valor={RESPONSABLE.nit} />, con domicilio en {RESPONSABLE.domicilio} (en adelante,
              &quot;{MARCA}&quot;).
            </p>
            <p>
              Estos términos, junto con la{" "}
              <EnlaceLegal href="/privacidad">Política de tratamiento de datos personales</EnlaceLegal>, regulan el uso
              del sitio y de sus servicios. Si no estás de acuerdo, no uses la plataforma.
            </p>
          </SeccionLegal>

          <SeccionLegal id="naturaleza" numero={n("naturaleza")} titulo="Naturaleza del servicio">
            <p>
              {MARCA} es una <Fuerte>plataforma tecnológica</Fuerte> que facilita el encuentro entre quienes ofrecen
              empleo y quienes lo buscan en el Caribe colombiano. En concreto:
            </p>
            <Lista>
              <Punto>Las empresas publican vacantes y los candidatos las consultan y se postulan.</Punto>
              <Punto>
                Todas las vacantes publicadas, con su empresa, salario, requisitos y descripción, son visibles para
                cualquier persona. Postularse es gratis y no tiene límite.
              </Punto>
              <Punto>
                Calculamos un <Fuerte>porcentaje de coincidencia</Fuerte> entre el perfil del candidato y la vacante
                (ciudad, área, nivel educativo y disponibilidad). Es una orientación, no una decisión: no oculta
                vacantes ni descarta candidatos.
              </Punto>
            </Lista>
            <p>{MARCA} no hace nada de lo siguiente:</p>
            <Lista>
              <Punto>No es agencia de gestión y colocación de empleo ni actúa como empleador o intermediario laboral.</Punto>
              <Punto>No selecciona, entrevista, evalúa ni contrata candidatos por cuenta de las empresas.</Punto>
              <Punto>No garantiza que un candidato consiga empleo ni que una empresa encuentre personal.</Punto>
              <Punto>
                No cobra comisión por contratación, por éxito ni por volumen de candidatos contratados, ni a empresas ni
                a candidatos.
              </Punto>
            </Lista>
            <p>
              Si una empresa y un candidato llegan a un acuerdo, la <Fuerte>relación laboral es directa</Fuerte> entre
              ellos. Las condiciones del empleo, el pago del salario y las obligaciones laborales y de seguridad social
              son responsabilidad exclusiva del empleador.
            </p>
            <p>
              {MARCA} cobra únicamente por <Fuerte>servicios de valor agregado</Fuerte> opcionales (por ejemplo,
              herramientas de hoja de vida, perfil de LinkedIn o vacantes destacadas), descritos en{" "}
              <EnlaceLegal href="/planes">Planes</EnlaceLegal>.
            </p>
          </SeccionLegal>

          <SeccionLegal id="usuarios" numero={n("usuarios")} titulo="Usuarios y cuentas">
            <Lista>
              <Punto>
                Para crear una cuenta debes ser <Fuerte>mayor de 18 años</Fuerte>. No se admiten cuentas de menores de
                edad.
              </Punto>
              <Punto>
                La información que registres debe ser veraz, completa y actual. Eres responsable de lo que publiques
                con tu cuenta.
              </Punto>
              <Punto>
                Tu contraseña es personal. Avísanos si sospechas un uso no autorizado de tu cuenta.
              </Punto>
              <Punto>
                Puedes eliminar tu cuenta cuando quieras desde <EnlaceLegal href="/cuenta">Mi cuenta</EnlaceLegal>.
                Conservaremos solo lo que la ley nos obliga a guardar (ver la tabla de conservación en la política de
                datos).
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="candidatos" numero={n("candidatos")} titulo="Reglas para candidatos">
            <Lista>
              <Punto>Usa tu identidad real y no suplantes a otras personas.</Punto>
              <Punto>Postúlate solo a vacantes que te interesen y no envíes contenido ofensivo o engañoso.</Punto>
              <Punto>
                Nunca debes pagar a una empresa para ser contratado o entrevistado. Si alguien te lo pide, repórtalo
                desde la vacante.
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="empresas" numero={n("empresas")} titulo="Obligaciones de las empresas">
            <p>Quien publica vacantes (persona natural o jurídica) se compromete a:</p>
            <Lista>
              <Punto>
                Publicar solo <Fuerte>vacantes reales, vigentes y lícitas</Fuerte>, con información veraz sobre el
                cargo, las funciones, el salario y el lugar de trabajo.
              </Punto>
              <Punto>
                No incluir requisitos o expresiones <Fuerte>discriminatorias</Fuerte> por raza, etnia, sexo, orientación
                sexual, identidad de género, religión, nacionalidad, ideología política, discapacidad u otra condición
                protegida. Los actos de discriminación pueden constituir delito en Colombia (Ley 1482 de 2011).
              </Punto>
              <Punto>
                No exigir la <Fuerte>libreta militar</Fuerte> como requisito para vincular laboralmente a un candidato
                (Ley 1780 de 2016).
              </Punto>
              <Punto>
                No <Fuerte>cobrar ninguna suma</Fuerte> a los candidatos: ni por inscribirse, entrevistarse, capacitarse,
                recibir uniformes o exámenes, ni por ser contratados.
              </Punto>
              <Punto>
                Usar los datos de los candidatos solo para el proceso de selección de la vacante a la que se postularon,
                conforme a la ley de protección de datos, y no compartirlos con terceros.
              </Punto>
              <Punto>Cumplir la legislación laboral y de seguridad social con las personas que contrate.</Punto>
            </Lista>
            <p>
              Las vacantes de empresas sin verificar, y las que parezcan sospechosas aunque la empresa esté verificada,
              pueden quedar en revisión antes de publicarse.
            </p>
          </SeccionLegal>

          <SeccionLegal id="moderacion" numero={n("moderacion")} titulo="Moderación, reportes y suspensión">
            <Lista>
              <Punto>
                Cualquier usuario con sesión puede <Fuerte>reportar</Fuerte> una vacante por fraude, discriminación,
                cobros al candidato, datos falsos u otros motivos. Cuando una vacante acumula varios reportes, se oculta
                hasta que la revisemos.
              </Punto>
              <Punto>
                Podemos rechazar, ocultar, editar para corregir errores evidentes o retirar contenido que incumpla estos
                términos o la ley.
              </Punto>
              <Punto>
                Podemos <Fuerte>suspender o cancelar cuentas</Fuerte> por incumplimientos graves o reiterados. Cuando sea
                posible te informaremos el motivo y podrás pedir una revisión escribiendo al correo de contacto.
              </Punto>
              <Punto>
                Si la suspensión se debe a un incumplimiento tuyo, no habrá reembolso de lo ya consumido, sin perjuicio de
                los derechos que te reconoce la ley como consumidor.
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="ia" numero={n("ia")} titulo="Contenido generado con inteligencia artificial">
            <p>
              Algunas herramientas (hoja de vida y perfil de LinkedIn) usan inteligencia artificial para redactar
              propuestas de texto.
            </p>
            <Lista>
              <Punto>
                La propuesta se construye <Fuerte>solo con los datos que tú entregas</Fuerte> (tu perfil y lo que
                escribas en el asistente). Instruimos al sistema para no inventar experiencia, estudios ni logros y
                validamos el resultado, pero puede equivocarse.
              </Punto>
              <Punto>
                Siempre verás un borrador que debes <Fuerte>revisar, corregir y aprobar</Fuerte> antes de usarlo.
              </Punto>
              <Punto>
                Eres responsable de la <Fuerte>veracidad</Fuerte> del contenido que apruebes y compartas con empresas.
              </Punto>
              <Punto>
                El texto generado a partir de tus datos es tuyo para usarlo como quieras.
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="planes" numero={n("planes")} titulo="Planes, pagos y facturación">
            <Lista>
              <Punto>
                Los precios se muestran en <Fuerte>pesos colombianos (COP) con IVA incluido</Fuerte>, cuando aplique, en{" "}
                <EnlaceLegal href="/planes">Planes</EnlaceLegal>. El precio que pagas es el que ves al confirmar la
                compra.
              </Punto>
              <Punto>
                Las suscripciones tienen un periodo definido y se <Fuerte>renuevan</Fuerte> al final de cada periodo si
                así lo informa el plan. Antes de cobrar una renovación te lo recordaremos.
              </Punto>
              <Punto>
                Puedes <Fuerte>cancelar</Fuerte> cuando quieras. La cancelación evita la siguiente renovación y conservas
                los beneficios hasta el <Fuerte>final del periodo pagado</Fuerte>.
              </Punto>
              <Punto>
                Si un pago de renovación falla, tendrás unos días de gracia para actualizarlo; si no se resuelve, el plan
                pasa a la versión gratuita.
              </Punto>
              <Punto>
                Emitiremos <Fuerte>factura electrónica</Fuerte> por las compras, conforme a la normativa tributaria
                vigente, a los datos que nos indiques.
              </Punto>
              <Punto>
                Los pagos los procesa una pasarela de pagos externa. {MARCA} no almacena los datos completos de tu
                tarjeta ni tus claves bancarias.
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="retracto" numero={n("retracto")} titulo="Retracto, reversión y reembolsos">
            <p>
              Como las compras se hacen a distancia, tienes los derechos que reconoce el Estatuto del Consumidor (Ley
              1480 de 2011):
            </p>
            <Lista>
              <Punto>
                <Fuerte>Derecho de retracto</Fuerte> (art. 47): puedes retractarte dentro de los{" "}
                <Fuerte>5 días hábiles</Fuerte> siguientes a la compra, salvo las excepciones previstas en la ley, por
                ejemplo cuando la prestación del servicio ya haya comenzado con tu acuerdo. Si procede, te devolveremos
                el dinero dentro de los 30 días calendario siguientes.
              </Punto>
              <Punto>
                <Fuerte>Reversión del pago</Fuerte> (art. 51 de la Ley 1480 de 2011 y Decreto 587 de 2016): si pagaste con
                un medio electrónico y fuiste víctima de fraude, la operación no fue solicitada, el servicio no se
                prestó o no corresponde a lo pedido, puedes pedir la reversión dentro de los 5 días hábiles siguientes a
                que lo conociste, avisándonos a nosotros y al emisor de tu medio de pago.
              </Punto>
              <Punto>
                <Fuerte>Reembolsos</Fuerte>: además de los casos anteriores, reembolsamos cobros duplicados o errores
                atribuibles a {MARCA}. Escríbenos al correo de contacto con la referencia del pago.
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="piloto" numero={n("piloto")} titulo="Pasarela de prueba durante el piloto">
            <p>
              Mientras dure el piloto, la plataforma puede operar con una <Fuerte>pasarela de pagos de prueba</Fuerte>{" "}
              (sandbox). En ese modo <Fuerte>no se realizan cobros reales</Fuerte> ni se mueve dinero, y los planes se
              activan con fines de demostración. Lo indicaremos claramente en la pantalla de pago. Al conectar la
              pasarela definitiva actualizaremos estos términos.
            </p>
          </SeccionLegal>

          <SeccionLegal id="propiedad" numero={n("propiedad")} titulo="Propiedad intelectual">
            <p>
              La marca {MARCA}, el diseño, el software y los textos del sitio son de {MARCA} o de sus licenciantes. No
              puedes copiarlos, extraer datos de forma masiva (scraping) ni usarlos con fines comerciales sin
              autorización.
            </p>
            <p>
              Tú conservas los derechos sobre el contenido que publiques (perfil, vacantes, textos) y nos das una
              licencia no exclusiva y gratuita para mostrarlo en la plataforma mientras esté publicado y para prestar el
              servicio.
            </p>
          </SeccionLegal>

          <SeccionLegal id="responsabilidad" numero={n("responsabilidad")} titulo="Limitación de responsabilidad">
            <Lista>
              <Punto>
                Las vacantes y los perfiles los publican los propios usuarios. Aunque moderamos y verificamos empresas,{" "}
                {MARCA} no garantiza la veracidad de todo el contenido ni el resultado de los procesos de selección.
              </Punto>
              <Punto>
                {MARCA} no es parte de la relación laboral ni responde por las decisiones de contratación, las
                condiciones pactadas o su incumplimiento.
              </Punto>
              <Punto>
                Hacemos esfuerzos razonables para que el servicio esté disponible y seguro, pero puede haber
                interrupciones por mantenimiento o fallas de terceros.
              </Punto>
              <Punto>
                Nada de lo anterior limita la responsabilidad que la ley no permite excluir, ni tus derechos como
                consumidor.
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="datos" numero={n("datos")} titulo="Datos personales">
            <p>
              Tratamos tus datos conforme a la Ley 1581 de 2012 y a nuestra{" "}
              <EnlaceLegal href="/privacidad">Política de tratamiento de datos personales</EnlaceLegal>, que hace parte de
              estos términos. Para ejercer tus derechos usa{" "}
              <EnlaceLegal href="/datos-personales">Mis datos personales</EnlaceLegal>.
            </p>
          </SeccionLegal>

          <SeccionLegal id="ley" numero={n("ley")} titulo="Ley aplicable y autoridad">
            <p>
              Estos términos se rigen por las leyes de la República de Colombia. Para quejas como consumidor o sobre
              protección de datos personales puedes acudir a la{" "}
              <EnlaceLegal href={URL_SIC}>Superintendencia de Industria y Comercio (SIC)</EnlaceLegal>. Antes, te
              invitamos a escribirnos para buscar una solución directa.
            </p>
          </SeccionLegal>

          <SeccionLegal id="cambios" numero={n("cambios")} titulo="Cambios a estos términos">
            <p>
              Podemos actualizar estos términos. Publicaremos la nueva versión con su fecha de vigencia y, si los
              cambios son relevantes, te avisaremos por correo o dentro de la plataforma antes de que apliquen. Si sigues
              usando el servicio después de esa fecha, se entiende que aceptas la nueva versión. Guardamos qué versión
              aceptó cada usuario.
            </p>
          </SeccionLegal>

          <SeccionLegal id="contacto" numero={n("contacto")} titulo="Contacto">
            <Lista>
              <Punto>
                Correo: <DatoResponsable valor={RESPONSABLE.emailDatos} />
              </Punto>
              <Punto>
                Teléfono: <DatoResponsable valor={RESPONSABLE.telefono} />
              </Punto>
              <Punto>
                Dirección: <DatoResponsable valor={RESPONSABLE.direccion} />, {RESPONSABLE.domicilio}
              </Punto>
            </Lista>
          </SeccionLegal>
        </div>
      </article>
    </div>
  );
}
