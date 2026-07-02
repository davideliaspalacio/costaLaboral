import type { Metadata } from "next";
import { getUsuario, getEmpresa } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Zap, Users, MessageCircle } from "lucide-react";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Publica tu vacante gratis" };

export default async function RegistroEmpresaPage() {
  const sesion = await getUsuario();
  const yaEsEmpresa = sesion?.tipo === "empresa";
  const empresa = yaEsEmpresa ? await getEmpresa() : null;

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mb-8 max-w-2xl">
        <Logo />
        <h1 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">
          {yaEsEmpresa ? "Publica otra vacante" : "Encuentra a tu próximo empleado"}
        </h1>
        <p className="mt-1 text-ink-soft">
          Te conectamos gratis con candidatos del Caribe que encajan con el cargo. Publicar toma menos de 5 minutos.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardBody>
            <Wizard yaEsEmpresa={yaEsEmpresa} empresa={empresa} />
          </CardBody>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardBody className="space-y-4">
              <p className="text-sm font-bold text-ink">¿Por qué CostaLaboral?</p>
              <ul className="space-y-3 text-sm text-ink-soft">
                <li className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Users className="h-4 w-4" />
                  </span>
                  <span>Solo te llegan candidatos que encajan con el cargo, ordenados por % de match.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span>Avisamos por WhatsApp a las personas ideales apenas publicas.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-success-50 text-success-600">
                    <Zap className="h-4 w-4" />
                  </span>
                  <span>Publicar es siempre gratis para tu negocio. Sin letra menuda.</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
