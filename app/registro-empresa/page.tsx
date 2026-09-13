import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MessageCircle, Timer, Users } from "lucide-react";
import { getUsuario, getEmpresa } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Wizard } from "./wizard";

export const metadata: Metadata = {
  title: "Publica tu vacante gratis",
  description: "Publica una vacante en menos de 5 minutos y recibe candidatos del Caribe ordenados por match.",
};

const BENEFICIOS = [
  { icon: Timer, texto: "Publicas en menos de 5 minutos. Sin RUT ni cámara de comercio para empezar." },
  { icon: Users, texto: "Recibes a los postulados ordenados por % de match, con la explicación de cada factor." },
  { icon: MessageCircle, texto: "Avisamos por WhatsApp a quienes encajan y aceptaron recibir mensajes." },
  { icon: BadgeCheck, texto: "Verifica tu empresa para publicar sin revisión previa y destacar vacantes." },
];

export default async function RegistroEmpresaPage() {
  const sesion = await getUsuario();
  const esCandidato = sesion != null && sesion.tipo !== "empresa";
  const empresa = sesion?.tipo === "empresa" ? await getEmpresa() : null;
  const yaEsEmpresa = !!empresa;

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mb-8 max-w-2xl">
        <p className="kicker">{yaEsEmpresa ? "Nueva vacante" : "Para empresas · gratis"}</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          {yaEsEmpresa ? "Publica otra vacante" : "Encuentra a tu próximo empleado en la Costa"}
        </h1>
        <p className="mt-2 text-ink-soft">
          Publicar es gratis. Te conectamos con candidatos de Barranquilla, Cartagena y Santa Marta que encajan con el cargo.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card pop>
          <CardBody>
            {esCandidato ? (
              <div className="space-y-4 text-ink-soft">
                <p>
                  Tienes la sesión abierta como <strong className="text-ink">candidato</strong>. Para publicar vacantes necesitas una cuenta de empresa
                  con otro correo.
                </p>
                <Link href="/mis-vacantes" className={buttonVariants({ variant: "outline" })}>
                  Volver a mis vacantes
                </Link>
              </div>
            ) : (
              <Wizard
                yaEsEmpresa={yaEsEmpresa}
                empresa={empresa ? { nombre_negocio: empresa.nombre_negocio, verificada: empresa.verificada } : null}
              />
            )}
          </CardBody>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardBody className="space-y-4">
              <p className="font-display text-lg font-extrabold text-ink">¿Por qué CostaLaboral?</p>
              <ul className="space-y-3 text-sm text-ink-soft">
                {BENEFICIOS.map(({ icon: Icon, texto }) => (
                  <li key={texto} className="flex items-start gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 border-ink bg-brand-100 text-brand-800">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{texto}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          {!sesion && (
            <p className="text-center text-sm text-muted">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login?next=/registro-empresa" className="font-bold text-brand-700 underline">
                Ingresa
              </Link>
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
