import { Fingerprint } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import { getUsuario } from "@/lib/auth";
import { RESPONSABLE } from "@/lib/legal/documentos";
import { PLAZOS_HABEAS_DATA } from "@/lib/legal/dias-habiles";
import {
  DatoResponsable,
  EncabezadoLegal,
  EnlaceLegal,
  Fuerte,
  Lista,
  Punto,
  URL_SIC,
} from "@/lib/legal/doc-legal";
import { SolicitudForm } from "./solicitud-form";

export const metadata = buildMetadata({
  title: "Mis datos personales (Habeas Data)",
  path: "/datos-personales",
  description:
    "Ejerce tus derechos sobre tus datos personales en CostaLaboral: consultas, actualización, rectificación, supresión y revocatoria de la autorización (Ley 1581 de 2012).",
});

export default async function DatosPersonalesPage() {
  const sesion = await getUsuario().catch(() => null);
  const { consulta, reclamo } = PLAZOS_HABEAS_DATA;

  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <EncabezadoLegal
            kicker="Habeas Data"
            titulo="Tus datos, tus derechos"
            icono={<Fingerprint className="h-7 w-7" aria-hidden="true" />}
            intro={
              <p>
                Aquí puedes radicar una consulta o un reclamo sobre tus datos personales. No necesitas tener cuenta y el
                trámite es <Fuerte>gratuito</Fuerte>.
              </p>
            }
          />

          <div className="mt-8 space-y-6 text-ink-soft">
            <section>
              <h2 className="font-display text-xl font-extrabold text-ink">Qué puedes pedir</h2>
              <div className="mt-3">
                <Lista>
                  <Punto>
                    <Fuerte>Conocer</Fuerte> qué datos tenemos de ti y cómo los usamos.
                  </Punto>
                  <Punto>
                    <Fuerte>Actualizar o rectificar</Fuerte> datos incompletos o incorrectos.
                  </Punto>
                  <Punto>
                    <Fuerte>Suprimir</Fuerte> tus datos o <Fuerte>revocar</Fuerte> la autorización, cuando no exista
                    un deber legal o contractual de conservarlos.
                  </Punto>
                  <Punto>
                    Pedir <Fuerte>prueba de la autorización</Fuerte> que nos diste.
                  </Punto>
                </Lista>
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl font-extrabold text-ink">Plazos de respuesta</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                <li className="card p-4">
                  <p className="font-display text-3xl font-extrabold text-ink">{consulta.dias}</p>
                  <p className="text-sm">
                    días hábiles para <Fuerte>consultas</Fuerte> (prorrogables {consulta.prorroga}).
                  </p>
                </li>
                <li className="card p-4">
                  <p className="font-display text-3xl font-extrabold text-ink">{reclamo.dias}</p>
                  <p className="text-sm">
                    días hábiles para <Fuerte>reclamos</Fuerte> (prorrogables {reclamo.prorroga}).
                  </p>
                </li>
              </ul>
              <p className="mt-3 text-sm">
                Los días se cuentan desde el día hábil siguiente al recibo. Si el reclamo está incompleto te pediremos
                completarlo; si no lo haces en los plazos legales, se entenderá desistido.
              </p>
            </section>

            <section className="text-sm">
              <h2 className="font-display text-xl font-extrabold text-ink">Otros canales</h2>
              <p className="mt-2">
                También puedes escribir a <DatoResponsable valor={RESPONSABLE.emailDatos} />. Responsable:{" "}
                <DatoResponsable valor={RESPONSABLE.razonSocial} />, NIT <DatoResponsable valor={RESPONSABLE.nit} />.
              </p>
              <p className="mt-2">
                Si no quedas conforme con la respuesta, luego de agotar este trámite puedes presentar una queja ante la{" "}
                <EnlaceLegal href={URL_SIC}>Superintendencia de Industria y Comercio</EnlaceLegal>. Más detalles en la{" "}
                <EnlaceLegal href="/privacidad#derechos">Política de tratamiento de datos</EnlaceLegal>.
              </p>
            </section>
          </div>
        </div>

        <div>
          <SolicitudForm emailInicial={sesion?.email || undefined} />
        </div>
      </div>
    </div>
  );
}
