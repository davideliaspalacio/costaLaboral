import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, FileText, Mail, UserRound, AlertTriangle, Scale } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getHistorialConsentimientos, type Finalidad } from "@/lib/legal/consentimientos";
import { buildMetadata } from "@/lib/seo";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EliminarCuenta } from "./eliminar-cuenta";
import { Preferencias } from "./preferencias";

export const metadata = buildMetadata({
  title: "Mi cuenta",
  path: "/cuenta",
  noindex: true,
});

const TIPO_LABEL: Record<string, string> = {
  candidato: "Candidato",
  empresa: "Empresa",
  admin: "Administrador",
};

const FINALIDAD_LABEL: Record<Finalidad, string> = {
  tratamiento_datos: "Tratamiento de datos personales",
  terminos: "Términos y condiciones",
  mayoria_edad: "Declaración de mayoría de edad",
  whatsapp: "Vacantes por WhatsApp",
  perfil_visible_empresas: "Perfil visible para empresas Pro",
};

const CANAL_LABEL: Record<string, string> = {
  registro_candidato: "Registro",
  registro_empresa: "Registro",
  cuenta: "Mi cuenta",
  migracion: "Registro anterior",
};

const fmtFecha = (d: string) =>
  new Date(d).toLocaleString("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function CuentaPage() {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/cuenta");

  const { email, tipo, user } = sesion;
  const [candidato, historial] = await Promise.all([
    tipo === "candidato" ? getCandidato() : Promise.resolve(null),
    getHistorialConsentimientos(user.id),
  ]);

  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <p className="kicker">Tu cuenta</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">Mi cuenta</h1>
          <p className="mt-3 text-lg text-ink-soft">
            Tus datos de acceso, tus autorizaciones y tus derechos sobre tus datos personales.
          </p>
        </header>

        <Card pop>
          <CardBody className="space-y-5">
            <h2 className="font-display text-xl font-extrabold text-ink">Datos de la cuenta</h2>
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-brand-50 text-brand-600">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <dt className="text-sm font-semibold text-muted">Correo</dt>
                  <dd className="break-all text-base font-medium text-ink">{email}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-sol-100 text-ink">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <dt className="text-sm font-semibold text-muted">Tipo de cuenta</dt>
                  <dd className="text-base font-medium text-ink">{TIPO_LABEL[tipo] ?? tipo}</dd>
                </div>
              </div>
            </dl>
          </CardBody>
        </Card>

        {candidato && (
          <Card>
            <CardBody className="space-y-4">
              <div>
                <h2 className="font-display text-xl font-extrabold text-ink">Tus autorizaciones</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Son opcionales y puedes cambiarlas cuando quieras. Cada cambio queda registrado con fecha.
                </p>
              </div>
              <Preferencias wspOptIn={candidato.wsp_opt_in} perfilVisible={candidato.perfil_visible_empresas} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-display text-xl font-extrabold text-ink">Historial de autorizaciones</h2>
            {historial.length === 0 ? (
              <p className="text-sm text-muted">Aún no hay autorizaciones registradas.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border-2 border-ink">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="border-b-2 border-ink bg-canvas text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2 font-bold">Fecha</th>
                      <th scope="col" className="px-3 py-2 font-bold">Finalidad</th>
                      <th scope="col" className="px-3 py-2 font-bold">Decisión</th>
                      <th scope="col" className="px-3 py-2 font-bold">Medio</th>
                      <th scope="col" className="px-3 py-2 font-bold">Versión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-line bg-surface">
                    {historial.map((h) => (
                      <tr key={h.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-soft">{fmtFecha(h.creado_en)}</td>
                        <td className="px-3 py-2 font-medium text-ink">{FINALIDAD_LABEL[h.finalidad] ?? h.finalidad}</td>
                        <td className="px-3 py-2">
                          <Badge tone={h.otorgado ? "success" : "neutral"}>{h.otorgado ? "Autorizado" : "No autorizado"}</Badge>
                        </td>
                        <td className="px-3 py-2 text-ink-soft">{CANAL_LABEL[h.canal] ?? h.canal}</td>
                        <td className="px-3 py-2 text-muted">{h.version_documento}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-display text-xl font-extrabold text-ink">Tus datos personales</h2>
            <p className="text-ink-soft">
              Puedes consultar, actualizar o rectificar tus datos, pedir prueba de tu autorización o presentar un
              reclamo (Ley 1581 de 2012).
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/datos-personales" className={buttonVariants({ variant: "primary" })}>
                <Scale className="h-4 w-4" />
                Consultas y reclamos
              </Link>
              <Link href="/privacidad" className={buttonVariants({ variant: "outline" })}>
                <ShieldCheck className="h-4 w-4" />
                Política de privacidad
              </Link>
              <Link href="/terminos" className={buttonVariants({ variant: "outline" })}>
                <FileText className="h-4 w-4" />
                Términos y condiciones
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card className="border-danger-500">
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger-500" />
              <h2 className="font-display text-xl font-extrabold text-danger-600">Eliminar cuenta</h2>
            </div>
            <p className="text-ink-soft">
              Puedes eliminar tu cuenta cuando quieras (derecho de supresión). Borramos tu perfil y la información
              asociada: {tipo === "empresa" ? "vacantes y postulaciones recibidas" : "postulaciones, notificaciones y hojas de vida"}.
              Si tienes un plan vigente, se cancela de inmediato. Esta acción es{" "}
              <strong className="font-semibold text-ink">permanente</strong>.
            </p>
            <p className="text-sm text-muted">
              Por obligación legal conservamos, sin tu perfil, el registro de tus autorizaciones (prueba del
              consentimiento), los soportes de pagos y el registro de auditoría de la plataforma, durante los plazos
              que exige la ley.
            </p>
            <EliminarCuenta />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
