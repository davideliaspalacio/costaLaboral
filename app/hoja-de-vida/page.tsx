import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Sparkles,
  FileText,
  Wand2,
  IdCard,
  Lock,
  Check,
  ArrowRight,
  Pencil,
  Eye,
  Clock,
} from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { estadoPlanDeCandidato } from "@/lib/data/postulaciones";
import { getHojasDeVida } from "@/lib/data/hoja-de-vida";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { tiempoRelativo } from "@/lib/utils";
import { AREAS, NIVELES_EDUCATIVOS, PLANES } from "@/lib/constants";
import { HvClientPanel } from "./hv-panel";
import { DeleteHvButton } from "@/components/hv/delete-hv-button";

export const metadata: Metadata = {
  title: "Asistente de hoja de vida con IA",
  description:
    "Crea tu hoja de vida y optimiza tu LinkedIn con inteligencia artificial. Un beneficio de los planes de pago de CostaLaboral.",
};

const labelArea = (v: string) => AREAS.find((a) => a.value === v)?.label ?? v;
const labelNivel = (v: string) => NIVELES_EDUCATIVOS.find((n) => n.value === v)?.label ?? v;

export default async function HojaDeVidaPage() {
  const candidato = await getCandidato();
  if (!candidato) {
    const sesion = await getUsuario();
    if (sesion?.tipo === "empresa") redirect("/empresa/panel");
    redirect("/login?next=/hoja-de-vida");
  }

  const estado = await estadoPlanDeCandidato(candidato);
  const esGratis = estado.plan === "gratis";

  /* -------------------- UPSELL (plan gratis) -------------------- */
  if (esGratis) {
    return <Upsell />;
  }

  /* -------------------- PANEL premium -------------------- */
  const hojas = await getHojasDeVida(candidato.id);
  const planNombre = PLANES[estado.plan].nombre;

  const sugerencia = {
    cargoObjetivo: labelArea(candidato.area_interes),
    experienciaTexto: candidato.experiencia ?? "",
    nivel: labelNivel(candidato.nivel_educativo),
  };

  return (
    <main className="container-page space-y-8 py-8">
      {/* Cabecera */}
      <header className="space-y-3">
        <span className="kicker">
          <Sparkles className="h-4 w-4" /> Beneficio {planNombre}
        </span>
        <h1 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Tu asistente de hoja de vida con IA
        </h1>
        <p className="max-w-2xl text-lg text-ink-soft">
          Responde unas preguntitas y te armamos una hoja de vida profesional y tu perfil de LinkedIn listo para brillar.
        </p>
      </header>

      <HvClientPanel
        candidato={{
          nombre: candidato.nombre,
          ciudad: candidato.ciudad,
          whatsapp: candidato.whatsapp,
          email: candidato.email,
        }}
        sugerencia={sugerencia}
      >
        {hojas.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Aún no tienes hojas de vida"
            description="Dale a “Crear nueva hoja de vida” y en un momentico tendrás tu CV y tu LinkedIn listos con IA."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {hojas.map((hv) => (
              <li key={hv.id}>
                <Card className="h-full">
                  <CardBody className="flex h-full flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-sol-300 text-ink">
                        <FileText className="h-5 w-5" />
                      </span>
                      {hv.generada_por_ia ? (
                        <Badge tone="brand">
                          <Sparkles className="h-3 w-3" /> IA
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Plantilla</Badge>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-lg font-extrabold text-ink">{hv.titulo}</h2>
                      <p className="mt-0.5 truncate text-sm text-ink-soft">{hv.cargo_objetivo}</p>
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted">
                        <Clock className="h-3.5 w-3.5" /> Creada {tiempoRelativo(hv.creado_en)}
                        {hv.linkedin_titular && (
                          <>
                            <span aria-hidden>·</span>
                            <IdCard className="h-3.5 w-3.5" /> LinkedIn
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t-2 border-line pt-3">
                      <Link
                        href={`/hoja-de-vida/${hv.id}`}
                        className={buttonVariants({ variant: "primary", size: "sm" })}
                      >
                        <Eye className="h-4 w-4" /> Ver
                      </Link>
                      <Link
                        href={`/hoja-de-vida/${hv.id}?editar=1`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <Pencil className="h-4 w-4" /> Editar
                      </Link>
                      <div className="ml-auto">
                        <DeleteHvButton id={hv.id} titulo={hv.titulo} />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </HvClientPanel>
    </main>
  );
}

/* -------------------- Pantalla de upsell -------------------- */

function Upsell() {
  const beneficios = [
    { icon: Wand2, texto: "Hoja de vida profesional en minutos, con IA" },
    { icon: IdCard, texto: "Titular y “acerca de” de LinkedIn optimizados" },
    { icon: Pencil, texto: "Edítala a tu gusto y cópiala con un clic" },
    { icon: FileText, texto: "Guarda varias versiones para distintos cargos" },
  ];

  return (
    <main className="container-page py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="card-pop overflow-hidden">
          <div className="border-b-2 border-ink bg-sol-300 px-6 py-8 text-center sm:px-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-surface">
              <Lock className="h-8 w-8 text-ink" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Desbloquea el asistente de HV con IA
            </h1>
            <p className="mt-3 text-ink-soft">
              El asistente de hoja de vida y LinkedIn es un beneficio de los planes de pago. Pásate a un plan y deja que
              la IA te arme un CV que sí llama la atención.
            </p>
          </div>
          <div className="p-6 sm:p-10">
            <ul className="space-y-3">
              {beneficios.map((b) => {
                const Icon = b.icon;
                return (
                  <li key={b.texto} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-brand-100 text-brand-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium text-ink">{b.texto}</span>
                    <Check className="ml-auto h-5 w-5 shrink-0 text-success-600" />
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/planes" className={buttonVariants({ variant: "accent", size: "xl", block: true })}>
                Ver planes <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
            <p className="mt-4 text-center text-sm text-muted">
              Incluido en{" "}
              <span className="font-bold text-ink">{PLANES.camelleitor.nombre}</span> y{" "}
              <span className="font-bold text-ink">{PLANES.berraco_pro.nombre}</span>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
