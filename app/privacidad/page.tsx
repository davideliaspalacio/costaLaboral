import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo CostaLaboral trata tus datos personales conforme a la Ley 1581 de 2012: consentimiento para WhatsApp, qué se comparte con las empresas y tu derecho a eliminar la cuenta.",
};

const ACTUALIZADO = "1 de julio de 2026";

export default function PrivacidadPage() {
  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-3xl">
        {/* Encabezado */}
        <div className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-brand-50 text-brand-600">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Política de privacidad
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          En CostaLaboral cuidamos tus datos. Aquí te explicamos, en palabras claras, cómo los
          tratamos conforme a la <strong className="font-semibold text-ink">Ley 1581 de 2012</strong>{" "}
          de protección de datos personales de Colombia.
        </p>
        <p className="mt-2 text-sm text-muted">Última actualización: {ACTUALIZADO}</p>

        <div className="mt-12 space-y-10">
          <Seccion titulo="1. Responsable del tratamiento">
            <p>
              CostaLaboral es responsable del tratamiento de los datos personales que nos
              compartes al crear tu cuenta y usar la plataforma. Solo recolectamos la información
              necesaria para conectarte con vacantes o candidatos en el Caribe colombiano.
            </p>
          </Seccion>

          <Seccion titulo="2. Qué datos recolectamos">
            <p>De los candidatos: nombre, correo, número de WhatsApp, ciudad, barrio (opcional),
              nivel educativo, área de interés, disponibilidad y la experiencia que decidas
              escribir. De las empresas: nombre del negocio, contacto, correo, WhatsApp, ciudad y
              sector.
            </p>
          </Seccion>

          <Seccion titulo="3. Consentimiento para WhatsApp">
            <p>
              Al registrarte, autorizas de forma libre, previa y expresa que te contactemos por{" "}
              <strong className="font-semibold text-ink">WhatsApp</strong> para enviarte las
              vacantes que encajan con tu perfil y avisos relacionados con tu búsqueda de empleo.
            </p>
            <p>
              Este es el canal principal de la plataforma. Puedes pedir que dejemos de escribirte
              en cualquier momento respondiendo al chat o eliminando tu cuenta.
            </p>
          </Seccion>

          <Seccion titulo="4. Qué compartimos con las empresas">
            <p>
              Protegemos tu identidad hasta que tú decides postularte. Antes de aplicar, las
              empresas <strong className="font-semibold text-ink">solo ven tu nombre y tu área</strong>{" "}
              de interés.
            </p>
            <p>
              Cuando te postulas a una vacante, y solo entonces, compartimos con esa empresa los
              datos necesarios para que te contacte: tu nombre, ciudad, nivel educativo,
              disponibilidad, tu experiencia y tu número de WhatsApp. Tú controlas cuándo das ese
              paso.
            </p>
          </Seccion>

          <Seccion titulo="5. Cifrado y seguridad de WhatsApp">
            <p>
              Los mensajes de WhatsApp viajan con{" "}
              <strong className="font-semibold text-ink">cifrado de extremo a extremo</strong>{" "}
              provisto por la plataforma de mensajería, de modo que su contenido no es legible por
              terceros en el trayecto. Del lado de CostaLaboral, guardamos tu información en
              servicios con controles de acceso y la usamos únicamente para los fines aquí
              descritos.
            </p>
          </Seccion>

          <Seccion titulo="6. Finalidad del tratamiento">
            <p>
              Usamos tus datos para: (a) crear y administrar tu cuenta; (b) mostrarte u ofrecerte
              vacantes que encajan con tu perfil; (c) permitir que las empresas te contacten cuando
              te postulas; y (d) mejorar el servicio. No vendemos tus datos a terceros.
            </p>
          </Seccion>

          <Seccion titulo="7. Tus derechos">
            <p>Como titular de tus datos, y conforme a la Ley 1581 de 2012, puedes:</p>
            <ul className="mt-3 space-y-2">
              <Punto>Conocer, actualizar y rectificar tus datos personales.</Punto>
              <Punto>Solicitar prueba de la autorización que nos otorgaste.</Punto>
              <Punto>Revocar el consentimiento y pedir que dejemos de contactarte.</Punto>
              <Punto>
                <strong className="font-semibold text-ink">Eliminar tu cuenta</strong> y los datos
                asociados cuando lo desees, salvo aquellos que debamos conservar por ley.
              </Punto>
            </ul>
          </Seccion>

          <Seccion titulo="8. Cómo eliminar tu cuenta o ejercer tus derechos">
            <p>
              Puedes eliminar tu cuenta desde tu perfil o escribiéndonos. Al hacerlo, borramos tu
              información personal de la plataforma y dejamos de enviarte mensajes. Para cualquier
              solicitud sobre tus datos, contáctanos a{" "}
              <a
                href="mailto:privacidad@costalaboral.co"
                className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
              >
                privacidad@costalaboral.co
              </a>
              .
            </p>
          </Seccion>

          <Seccion titulo="9. Cambios en esta política">
            <p>
              Podemos actualizar esta política para reflejar mejoras del servicio o cambios en la
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
