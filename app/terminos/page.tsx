import Link from "next/link";
import type { ReactNode } from "react";
import { FileText } from "lucide-react";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Términos y condiciones",
  path: "/terminos",
  description:
    "Términos y condiciones de CostaLaboral y resumen del tratamiento de datos personales conforme a la Ley 1581 de 2012: empresas publican gratis, el candidato elige plan, notificaciones por WhatsApp y tus derechos como titular.",
});

const ACTUALIZADO = "1 de julio de 2026";

export default function TerminosPage() {
  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        {/* Encabezado */}
        <div className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-sol-100 text-ink">
          <FileText className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Términos y condiciones
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Estas son las reglas del juego para usar <strong className="font-semibold text-ink">CostaLaboral</strong>,
          la plataforma de empleo del Caribe colombiano. Al crear una cuenta y usar el servicio,
          aceptas estos términos.
        </p>
        <p className="mt-2 text-sm text-muted">Última actualización: {ACTUALIZADO}</p>

        <div className="mt-12 space-y-10">
          <Seccion titulo="1. Objeto del servicio">
            <p>
              CostaLaboral conecta a personas que buscan empleo (candidatos) con negocios y
              empresas del Caribe colombiano que necesitan contratar. Publicamos vacantes y te
              avisamos de las que encajan con tu perfil. No somos empleadores ni intermediarios
              laborales: la relación de trabajo, si se da, es directamente entre el candidato y la
              empresa.
            </p>
          </Seccion>

          <Seccion titulo="2. Las empresas publican gratis; el candidato elige su plan">
            <p>
              Publicar vacantes es <strong className="font-semibold text-ink">100% gratis</strong>{" "}
              para las empresas. No cobramos por publicar ni por recibir postulaciones.
            </p>
            <p>
              Los candidatos usan la plataforma gratis y, si lo desean, pueden activar un plan pago
              para postularse a más vacantes y acceder a funciones adicionales. El plan gratis
              siempre está disponible. Los precios y límites de cada plan se muestran en la página
              de{" "}
              <Link href="/planes" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
                planes
              </Link>
              .
            </p>
          </Seccion>

          <Seccion titulo="3. Uso de WhatsApp (con tu consentimiento)">
            <p>
              WhatsApp es el canal principal de la plataforma. Al registrarte, autorizas de forma
              libre, previa y expresa que te contactemos por{" "}
              <strong className="font-semibold text-ink">WhatsApp</strong> para enviarte las
              vacantes que encajan con tu perfil y avisos relacionados con tu búsqueda de empleo.
            </p>
            <p>
              Puedes revocar este consentimiento en cualquier momento: pídenos que dejemos de
              escribirte respondiendo en el chat, o elimina tu cuenta desde{" "}
              <Link href="/cuenta" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
                Mi cuenta
              </Link>
              .
            </p>
          </Seccion>

          <Seccion titulo="4. Qué datos se comparten con las empresas">
            <p>
              Protegemos tu identidad hasta que tú decides postularte. Antes de aplicar, las
              empresas <strong className="font-semibold text-ink">solo ven tu nombre y tu área</strong>{" "}
              de interés.
            </p>
            <p>
              Cuando te postulas a una vacante, y solo entonces, compartimos con esa empresa los
              datos necesarios para que te contacte (por ejemplo tu nombre, ciudad, nivel
              educativo, disponibilidad, tu experiencia y tu número de WhatsApp). Tú controlas
              cuándo das ese paso.
            </p>
          </Seccion>

          <Seccion titulo="5. Tratamiento de datos personales (Ley 1581 de 2012)">
            <p>
              CostaLaboral trata tus datos personales conforme a la{" "}
              <strong className="font-semibold text-ink">Ley 1581 de 2012</strong> de protección de
              datos de Colombia. Solo recolectamos la información necesaria para prestar el servicio
              y no la vendemos a terceros.
            </p>
            <p>
              El detalle completo (qué datos recolectamos, con qué finalidad, seguridad y
              conservación) está en nuestra{" "}
              <Link href="/privacidad" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
                política de privacidad
              </Link>
              , que hace parte de estos términos.
            </p>
          </Seccion>

          <Seccion titulo="6. Tus derechos como titular">
            <p>Como titular de tus datos personales puedes, en cualquier momento:</p>
            <ul className="mt-3 space-y-2">
              <Punto>
                <strong className="font-semibold text-ink">Acceder</strong> a los datos que tenemos
                sobre ti.
              </Punto>
              <Punto>
                <strong className="font-semibold text-ink">Rectificar</strong> y actualizar tu
                información desde tu perfil.
              </Punto>
              <Punto>
                <strong className="font-semibold text-ink">Eliminar</strong> tu cuenta y los datos
                asociados, y revocar el consentimiento para que te contactemos.
              </Punto>
            </ul>
            <p>
              Puedes eliminar tu cuenta y tus datos desde{" "}
              <Link href="/cuenta" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
                Mi cuenta
              </Link>
              . El borrado es permanente.
            </p>
          </Seccion>

          <Seccion titulo="7. Uso correcto de la plataforma">
            <p>
              Te comprometes a entregar información veraz y a usar CostaLaboral de buena fe. No está
              permitido publicar ofertas falsas o engañosas, suplantar a otras personas o empresas,
              solicitar pagos a los candidatos como condición para ser contratados, ni usar los
              datos de terceros para fines distintos a los del servicio. Podemos suspender o
              eliminar cuentas que incumplan estas reglas.
            </p>
          </Seccion>

          <Seccion titulo="8. Contacto">
            <p>
              Para cualquier duda sobre estos términos o sobre el tratamiento de tus datos, o para
              ejercer tus derechos como titular, escríbenos a{" "}
              <a
                href="mailto:privacidad@costalaboral.co"
                className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                privacidad@costalaboral.co
              </a>
              .
            </p>
          </Seccion>

          <Seccion titulo="9. Cambios en estos términos">
            <p>
              Podemos actualizar estos términos para reflejar mejoras del servicio o cambios en la
              normativa. Publicaremos la versión vigente en esta página con su fecha de
              actualización.
            </p>
          </Seccion>
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-bold tracking-tight text-ink">{titulo}</h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function Punto({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
      <span>{children}</span>
    </li>
  );
}
