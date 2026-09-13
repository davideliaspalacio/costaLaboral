import type { Metadata } from "next";
import { BadgeCheck, Clock, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { requerirEmpresa } from "@/lib/data/empresa";
import { getBeneficiosEmpresa } from "@/lib/billing/suscripciones";
import { validarNit } from "@/lib/moderacion";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmpresaNav } from "../_components/empresa-nav";
import { VERIFICACION, fechaCorta } from "../_components/etiquetas";
import { PerfilForm } from "./perfil-form";
import { VerificacionForm } from "./verificacion-form";

export const metadata: Metadata = { title: "Perfil de empresa" };

const BENEFICIOS_VERIFICACION = [
  { icon: Zap, texto: "Tus vacantes se publican sin revisión previa (salvo contenido que infrinja las reglas)." },
  { icon: ShieldCheck, texto: "Insignia de empresa verificada: más confianza y más postulaciones." },
  { icon: Sparkles, texto: "Puedes destacar vacantes para salir primero en el portal." },
];

export default async function PerfilEmpresaPage() {
  const empresa = await requerirEmpresa("/empresa/perfil");
  const { plan } = await getBeneficiosEmpresa(empresa.id);
  const ver = VERIFICACION[empresa.verificacion] ?? VERIFICACION.sin_verificar;

  const faltante = !empresa.razon_social?.trim()
    ? "Guarda la razón social en el formulario para poder solicitarla."
    : !validarNit(empresa.nit).ok
      ? "Guarda un NIT válido con dígito de verificación para poder solicitarla."
      : null;

  return (
    <div className="container-page py-8 sm:py-12">
      <EmpresaNav empresa={empresa} plan={plan} activo="perfil" titulo="Perfil de empresa" kicker={empresa.nombre_negocio} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card pop>
          <CardBody>
            <PerfilForm
              empresa={{
                nombre_negocio: empresa.nombre_negocio,
                nombre_contacto: empresa.nombre_contacto,
                whatsapp: empresa.whatsapp,
                ciudad: empresa.ciudad,
                sector: empresa.sector,
                razon_social: empresa.razon_social,
                nit: empresa.nit,
                descripcion: empresa.descripcion,
                sitio_web: empresa.sitio_web,
                direccion: empresa.direccion,
                verificacion: empresa.verificacion,
              }}
            />
          </CardBody>
        </Card>

        <aside id="verificacion" className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-extrabold text-ink">Verificación</h2>
                <Badge tone={ver.tono}>{ver.label}</Badge>
              </div>

              {empresa.verificacion === "verificada" && (
                <p className="flex items-start gap-2 text-sm text-ink-soft">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-600" />
                  Empresa verificada {empresa.verificada_en ? `desde el ${fechaCorta(empresa.verificada_en)}` : ""}.
                </p>
              )}
              {empresa.verificacion === "en_revision" && (
                <p className="flex items-start gap-2 text-sm text-ink-soft">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  Solicitud enviada el {fechaCorta(empresa.verificacion_solicitada_en)}. La revisamos con tu RUT y NIT.
                </p>
              )}
              {empresa.verificacion_nota && empresa.verificacion !== "verificada" && empresa.verificacion !== "en_revision" && (
                <p className="rounded-xl border-2 border-ink bg-danger-50 px-3 py-2 text-sm text-ink">
                  <strong>Nota del equipo:</strong> {empresa.verificacion_nota}
                </p>
              )}

              <ul className="space-y-2 text-sm text-ink-soft">
                {BENEFICIOS_VERIFICACION.map(({ icon: Icon, texto }) => (
                  <li key={texto} className="flex items-start gap-2">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" /> {texto}
                  </li>
                ))}
              </ul>

              {(empresa.verificacion === "sin_verificar" || empresa.verificacion === "rechazada") && (
                <VerificacionForm faltante={faltante} />
              )}
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}
