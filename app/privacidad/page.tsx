import { ShieldCheck } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { MARCA, RESPONSABLE, VERSION_PRIVACIDAD } from "@/lib/legal/documentos";
import { PLAZOS_HABEAS_DATA } from "@/lib/legal/dias-habiles";
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
  TablaLegal,
  URL_SIC,
  fechaVersion,
} from "@/lib/legal/doc-legal";

export const metadata = buildMetadata({
  title: "Política de tratamiento de datos personales",
  path: "/privacidad",
  description:
    "Cómo CostaLaboral trata tus datos personales conforme a la Ley 1581 de 2012: finalidades, qué ve una empresa, tus derechos, plazos de consultas y reclamos, conservación y cookies.",
});

const SECCIONES = [
  { id: "responsable", titulo: "Responsable del tratamiento" },
  { id: "marco", titulo: "Marco legal y definiciones" },
  { id: "datos", titulo: "Datos que tratamos" },
  { id: "finalidades", titulo: "Finalidades" },
  { id: "empresas", titulo: "Qué ve una empresa y cuándo" },
  { id: "sensibles", titulo: "Datos sensibles y menores" },
  { id: "derechos", titulo: "Tus derechos" },
  { id: "procedimiento", titulo: "Consultas y reclamos" },
  { id: "encargados", titulo: "Encargados y transferencias internacionales" },
  { id: "seguridad", titulo: "Seguridad" },
  { id: "conservacion", titulo: "Conservación" },
  { id: "cookies", titulo: "Cookies" },
  { id: "rnbd", titulo: "Registro Nacional de Bases de Datos" },
  { id: "vigencia", titulo: "Vigencia y cambios" },
];

export default function PrivacidadPage() {
  const n = (id: string) => SECCIONES.findIndex((s) => s.id === id) + 1;
  const vigencia = fechaVersion(VERSION_PRIVACIDAD);
  const { consulta, reclamo } = PLAZOS_HABEAS_DATA;

  return (
    <div className="container-page py-14 sm:py-20">
      <article className="mx-auto max-w-3xl">
        <EncabezadoLegal
          kicker="Legal · Habeas Data"
          titulo="Política de tratamiento de datos personales"
          icono={<ShieldCheck className="h-7 w-7" aria-hidden="true" />}
          version={VERSION_PRIVACIDAD}
          vigencia={vigencia}
          intro={
            <p>
              Esta política explica qué datos personales tratamos en <Fuerte>{MARCA}</Fuerte>, para qué, con quién los
              compartimos y cómo ejercer tus derechos, conforme a la <Fuerte>Ley 1581 de 2012</Fuerte> y sus decretos
              reglamentarios.
            </p>
          }
        />

        <div className="mt-8">
          <Destacado>
            No vendemos tus datos. No te pedimos datos sensibles. Las empresas solo ven tus datos de contacto cuando tú
            te postulas. WhatsApp solo con tu autorización aparte, que puedes retirar cuando quieras.
          </Destacado>
        </div>

        <IndiceLegal secciones={SECCIONES} />

        <div className="mt-12 space-y-12">
          <SeccionLegal id="responsable" numero={n("responsable")} titulo="Responsable del tratamiento">
            <Lista>
              <Punto>
                Razón social: <DatoResponsable valor={RESPONSABLE.razonSocial} />
              </Punto>
              <Punto>
                NIT: <DatoResponsable valor={RESPONSABLE.nit} />
              </Punto>
              <Punto>
                Domicilio: {RESPONSABLE.domicilio}. Dirección: <DatoResponsable valor={RESPONSABLE.direccion} />
              </Punto>
              <Punto>
                Correo de protección de datos: <DatoResponsable valor={RESPONSABLE.emailDatos} />
              </Punto>
              <Punto>
                Teléfono: <DatoResponsable valor={RESPONSABLE.telefono} />
              </Punto>
              <Punto>
                Formulario en línea: <EnlaceLegal href="/datos-personales">Mis datos personales</EnlaceLegal>
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="marco" numero={n("marco")} titulo="Marco legal y definiciones">
            <p>
              Aplicamos la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013, hoy compilado en el Decreto Único
              Reglamentario 1074 de 2015, además de las instrucciones de la Superintendencia de Industria y Comercio.
            </p>
            <p>
              <Fuerte>Titular</Fuerte> eres tú, la persona a quien se refieren los datos. <Fuerte>Responsable</Fuerte>{" "}
              es quien decide sobre el tratamiento ({MARCA}). <Fuerte>Encargado</Fuerte> es quien trata datos por cuenta
              del responsable (por ejemplo, nuestro proveedor de hosting). <Fuerte>Tratamiento</Fuerte> es cualquier
              operación sobre los datos: recoger, guardar, usar, circular o suprimir.
            </p>
            <p>
              Tratamos datos bajo los principios de legalidad, finalidad, libertad, veracidad, transparencia, acceso y
              circulación restringida, seguridad y confidencialidad.
            </p>
          </SeccionLegal>

          <SeccionLegal id="datos" numero={n("datos")} titulo="Datos que tratamos">
            <TablaLegal
              columnas={["Quién", "Datos"]}
              filas={[
                [
                  "Candidatos",
                  "Nombre, correo, número de WhatsApp, ciudad y barrio (opcional), nivel educativo, área de interés, disponibilidad, experiencia que decidas escribir, hojas de vida y perfiles de LinkedIn que generes, postulaciones y sus estados, preferencias y autorizaciones.",
                ],
                [
                  "Empresas",
                  "Nombre del negocio, razón social y NIT (si los das), datos de la persona de contacto (nombre, correo, WhatsApp), ciudad, sector, dirección, sitio web, vacantes publicadas y estado de verificación.",
                ],
                [
                  "Pagos",
                  "Producto comprado, valor, fecha, estado y referencias de la transacción que nos entrega la pasarela. No guardamos el número completo de tu tarjeta ni tus claves bancarias.",
                ],
                [
                  "Datos técnicos",
                  "Dirección IP, navegador (user agent), identificadores de sesión, registros de seguridad y auditoría, y eventos de uso (por ejemplo, vacantes vistas o postulaciones).",
                ],
              ]}
            />
          </SeccionLegal>

          <SeccionLegal id="finalidades" numero={n("finalidades")} titulo="Finalidades">
            <p>Usamos tus datos solo para:</p>
            <ol className="list-decimal space-y-2 pl-6 marker:font-bold marker:text-ink">
              <li>Crear, administrar y proteger tu cuenta.</li>
              <li>
                Calcular el porcentaje de coincidencia (match) entre candidatos y vacantes y ordenar resultados.
              </li>
              <li>Mostrarte recomendaciones de vacantes dentro de la plataforma.</li>
              <li>
                Enviarte vacantes y avisos por <Fuerte>WhatsApp</Fuerte>, <Fuerte>solo si lo autorizas</Fuerte> con una
                casilla separada. Puedes activarlo o retirarlo en <EnlaceLegal href="/cuenta">Mi cuenta</EnlaceLegal>.
              </li>
              <li>
                Generar con inteligencia artificial borradores de hoja de vida y perfil de LinkedIn a partir de los datos
                que tú entregas, cuando uses esas herramientas.
              </li>
              <li>Procesar pagos, renovaciones, reembolsos y emitir facturas.</li>
              <li>Prevenir fraude, vacantes falsas y abusos, y mantener la seguridad de la plataforma.</li>
              <li>Elaborar estadísticas y análisis agregados que no te identifican, para mejorar el servicio.</li>
              <li>Cumplir obligaciones legales, contables, tributarias y atender requerimientos de autoridades.</li>
            </ol>
            <p>
              Si en el futuro queremos usar tus datos para una finalidad distinta, te pediremos una nueva autorización.
            </p>
          </SeccionLegal>

          <SeccionLegal id="empresas" numero={n("empresas")} titulo="Qué ve una empresa y cuándo">
            <Lista>
              <Punto>
                <Fuerte>Antes de postularte</Fuerte>, ninguna empresa ve tus datos de contacto.
              </Punto>
              <Punto>
                Si activas la opción de <Fuerte>perfil visible para empresas</Fuerte>, las empresas pueden ver un perfil
                anonimizado (área, ciudad, nivel educativo y disponibilidad, sin nombre ni contacto) para invitarte a
                postularte. Puedes desactivarlo cuando quieras.
              </Punto>
              <Punto>
                <Fuerte>Cuando te postulas</Fuerte> a una vacante, esa empresa, y solo esa, ve tu nombre, datos de
                contacto, perfil y la hoja de vida que elijas enviar, para gestionar ese proceso de selección.
              </Punto>
              <Punto>
                Las empresas se obligan a usar esos datos solo para el proceso de la vacante y a no compartirlos.
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="sensibles" numero={n("sensibles")} titulo="Datos sensibles y menores">
            <p>
              <Fuerte>No solicitamos datos sensibles</Fuerte> (origen racial o étnico, orientación política, convicciones
              religiosas, pertenencia a sindicatos, datos de salud, vida sexual o biométricos). El cálculo del match{" "}
              <Fuerte>no usa variables sensibles</Fuerte>: solo ciudad, área, nivel educativo y disponibilidad. Te
              pedimos no incluir datos sensibles en los campos de texto libre.
            </p>
            <p>
              La plataforma es solo para <Fuerte>mayores de 18 años</Fuerte>. No recolectamos intencionalmente datos de
              menores de edad; si detectamos una cuenta de un menor, la eliminaremos.
            </p>
          </SeccionLegal>

          <SeccionLegal id="derechos" numero={n("derechos")} titulo="Tus derechos">
            <p>Como titular tienes derecho a:</p>
            <Lista>
              <Punto>
                <Fuerte>Conocer, actualizar y rectificar</Fuerte> tus datos, incluso frente a datos parciales, inexactos,
                incompletos o que induzcan a error.
              </Punto>
              <Punto>
                Solicitar <Fuerte>prueba de la autorización</Fuerte> que nos diste.
              </Punto>
              <Punto>
                Ser <Fuerte>informado</Fuerte>, previa solicitud, del uso que hemos dado a tus datos.
              </Punto>
              <Punto>
                Presentar <Fuerte>quejas ante la Superintendencia de Industria y Comercio</Fuerte> por infracciones, una
                vez agotado el trámite de consulta o reclamo ante nosotros.
              </Punto>
              <Punto>
                <Fuerte>Revocar</Fuerte> la autorización y/o pedir la <Fuerte>supresión</Fuerte> de tus datos cuando no
                se respeten los principios, derechos y garantías legales. No procede cuando exista un deber legal o
                contractual de conservarlos.
              </Punto>
              <Punto>
                <Fuerte>Acceder gratuitamente</Fuerte> a tus datos personales objeto de tratamiento.
              </Punto>
            </Lista>
            <p>
              Pueden ejercerlos el titular, sus causahabientes, su representante o apoderado, previa acreditación.
            </p>
          </SeccionLegal>

          <SeccionLegal id="procedimiento" numero={n("procedimiento")} titulo="Consultas y reclamos">
            <p>
              Radica tu solicitud en <EnlaceLegal href="/datos-personales">Mis datos personales</EnlaceLegal> o escribe a{" "}
              <DatoResponsable valor={RESPONSABLE.emailDatos} />. Recibirás un número de radicado y la fecha límite de
              respuesta.
            </p>
            <TablaLegal
              columnas={["Trámite", "Para qué", "Plazo de respuesta"]}
              filas={[
                [
                  "Consulta",
                  "Conocer tus datos o pedir prueba de la autorización.",
                  `${consulta.dias} días hábiles, prorrogables hasta ${consulta.prorroga} días hábiles más.`,
                ],
                [
                  "Reclamo",
                  "Actualizar, rectificar, suprimir, revocar o denunciar un incumplimiento.",
                  `${reclamo.dias} días hábiles, prorrogables hasta ${reclamo.prorroga} días hábiles más.`,
                ],
              ]}
            />
            <Lista>
              <Punto>Los plazos se cuentan desde el día hábil siguiente a la fecha de recibo.</Punto>
              <Punto>
                Si necesitamos la prórroga, te informaremos los motivos y la nueva fecha antes del vencimiento del plazo
                inicial.
              </Punto>
              <Punto>
                El reclamo debe incluir tu identificación, la descripción de los hechos, la dirección o correo de
                respuesta y los documentos que quieras hacer valer. Si está incompleto te pediremos completarlo dentro de
                los 5 días siguientes; si pasan 2 meses sin que lo completes, se entenderá desistido.
              </Punto>
              <Punto>
                Mientras tramitamos un reclamo, marcaremos la información discutida con la leyenda &quot;reclamo en
                trámite&quot;.
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="encargados" numero={n("encargados")} titulo="Encargados y transferencias internacionales">
            <p>
              Para prestar el servicio usamos proveedores que tratan datos por nuestra cuenta, con obligaciones
              contractuales de confidencialidad y seguridad:
            </p>
            <TablaLegal
              columnas={["Proveedor", "Servicio", "Datos"]}
              filas={[
                ["Supabase", "Base de datos, autenticación y almacenamiento", "Todos los datos de la plataforma"],
                ["Vercel", "Hosting de la aplicación y registros técnicos", "Datos en tránsito y registros técnicos"],
                [
                  "Anthropic",
                  "Inteligencia artificial para borradores de hoja de vida y LinkedIn",
                  "Solo los datos del perfil y del asistente, cuando usas esas herramientas",
                ],
                ["Pasarela de pagos", "Procesamiento de pagos", "Datos de la transacción"],
              ]}
            />
            <p>
              Estos proveedores tienen servidores <Fuerte>fuera de Colombia</Fuerte> (por ejemplo, en Estados Unidos),
              por lo que puede haber transmisión o transferencia internacional de datos. La hacemos hacia países o
              proveedores que ofrecen un nivel adecuado de protección según los estándares fijados por la
              Superintendencia de Industria y Comercio, o con las garantías contractuales y la autorización que exige la
              ley. Al aceptar esta política autorizas esas transferencias para las finalidades descritas.
            </p>
          </SeccionLegal>

          <SeccionLegal id="seguridad" numero={n("seguridad")} titulo="Seguridad">
            <Lista>
              <Punto>Cifrado en tránsito (HTTPS/TLS) y cifrado en reposo de la base de datos del proveedor.</Punto>
              <Punto>
                Acceso a datos por el principio de mínimo privilegio: el navegador no escribe directamente en la base de
                datos y las operaciones se autorizan en el servidor.
              </Punto>
              <Punto>Registro de auditoría inmodificable de las acciones relevantes y de las autorizaciones.</Punto>
              <Punto>Límites de intentos contra abusos, encabezados de seguridad y secretos fuera del código.</Punto>
              <Punto>
                Si ocurre un incidente de seguridad que afecte tus datos, lo gestionaremos y lo reportaremos a la
                autoridad y a los titulares cuando corresponda.
              </Punto>
            </Lista>
          </SeccionLegal>

          <SeccionLegal id="conservacion" numero={n("conservacion")} titulo="Conservación">
            <p>
              Conservamos los datos solo el tiempo necesario para la finalidad y para cumplir la ley. Después los
              eliminamos o anonimizamos.
            </p>
            <TablaLegal
              columnas={["Información", "Tiempo", "Por qué"]}
              filas={[
                ["Perfil y cuenta", "Hasta que elimines la cuenta", "Prestar el servicio"],
                [
                  "Prueba de autorizaciones y registro de auditoría",
                  "5 años",
                  "Demostrar el consentimiento y atender reclamos o investigaciones",
                ],
                ["Soportes de pagos y facturación", "10 años", "Obligaciones contables y tributarias"],
                ["Eventos de uso", "24 meses", "Estadísticas y mejora del servicio"],
                ["Eventos de la pasarela de pagos", "18 meses", "Conciliación y soporte de pagos"],
              ]}
            />
          </SeccionLegal>

          <SeccionLegal id="cookies" numero={n("cookies")} titulo="Cookies">
            <p>
              Usamos <Fuerte>solo cookies esenciales</Fuerte> para mantener tu sesión iniciada y proteger la plataforma.
              No usamos cookies de publicidad ni herramientas de analítica de terceros. Si lo cambiamos, actualizaremos
              esta política y te pediremos consentimiento cuando sea necesario.
            </p>
          </SeccionLegal>

          <SeccionLegal id="rnbd" numero={n("rnbd")} titulo="Registro Nacional de Bases de Datos">
            <p>
              Cuando {MARCA} esté obligada según los criterios legales vigentes, inscribirá sus bases de datos en el
              Registro Nacional de Bases de Datos (RNBD) que administra la Superintendencia de Industria y Comercio y lo
              mantendrá actualizado.
            </p>
          </SeccionLegal>

          <SeccionLegal id="vigencia" numero={n("vigencia")} titulo="Vigencia y cambios">
            <p>
              Esta política (versión {VERSION_PRIVACIDAD}) rige desde el {vigencia}. Las bases de datos estarán vigentes
              mientras se mantengan las finalidades descritas. Si hacemos cambios sustanciales te avisaremos antes de
              aplicarlos y, cuando cambien las finalidades, pediremos una nueva autorización. Guardamos qué versión
              aceptó cada titular.
            </p>
            <p>
              Autoridad de protección de datos:{" "}
              <EnlaceLegal href={URL_SIC}>Superintendencia de Industria y Comercio</EnlaceLegal>.
            </p>
          </SeccionLegal>
        </div>
      </article>
    </div>
  );
}
