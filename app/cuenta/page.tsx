import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, FileText, Mail, UserRound, AlertTriangle } from "lucide-react";
import { getUsuario } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo";
import { Card, CardBody } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { EliminarCuenta } from "./eliminar-cuenta";

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

export default async function CuentaPage() {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/cuenta");

  const { email, tipo } = sesion!;

  return (
    <div className="container-page py-14 sm:py-20">
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <p className="kicker">Tu cuenta</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Mi cuenta
          </h1>
          <p className="mt-3 text-lg text-ink-soft">
            Aquí ves los datos de tu cuenta, tus documentos legales y puedes eliminarla cuando
            quieras.
          </p>
        </header>

        {/* Datos de la cuenta */}
        <Card pop>
          <CardBody className="space-y-5">
            <h2 className="text-xl font-bold text-ink">Datos de la cuenta</h2>
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-brand-50 text-brand-600">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <dt className="text-sm font-semibold text-muted">Correo</dt>
                  <dd className="text-base font-medium text-ink break-all">{email}</dd>
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

        {/* Documentos legales */}
        <Card>
          <CardBody className="space-y-4">
            <h2 className="text-xl font-bold text-ink">Documentos legales</h2>
            <p className="text-ink-soft">
              Revisa cómo cuidamos tus datos y las reglas del servicio.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
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

        {/* Zona de peligro */}
        <Card className="border-danger-500">
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-danger-500" />
              <h2 className="text-xl font-bold text-danger-500">Zona de peligro</h2>
            </div>
            <p className="text-ink-soft">
              Puedes eliminar tu cuenta y todos tus datos personales cuando quieras (derecho de
              supresión, Ley 1581 de 2012). Se borrarán tu perfil y toda la información asociada.
              Esta acción es <strong className="font-semibold text-ink">permanente</strong> y no se
              puede deshacer.
            </p>
            <EliminarCuenta />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
