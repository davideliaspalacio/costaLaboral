import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Pencil, Sparkles, Target } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getBeneficiosCandidato } from "@/lib/billing/suscripciones";
import { getHojaDeVida } from "@/lib/data/hoja-de-vida";
import { previewHV } from "@/lib/ia/preview";
import { cvATexto } from "@/lib/hv-texto";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/hv/copy-button";
import { CvDocument } from "@/components/hv/cv-document";
import { CvPreview } from "@/components/hv/cv-preview";
import { AprobarContenido } from "@/components/hv/aprobar-hv";
import { AvisoValidacion, EstadoContenidoBadge } from "@/components/hv/estado-badge";
import { NuevaVersionButton } from "@/components/hv/hv-acciones";
import { HvEditor } from "./hv-editor";

export const metadata: Metadata = { title: "Hoja de vida", robots: { index: false } };

export default async function HojaDeVidaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const candidato = await getCandidato();
  if (!candidato) {
    const sesion = await getUsuario();
    if (sesion?.tipo === "empresa") redirect("/empresa/panel");
    redirect(`/login?next=/hoja-de-vida/${id}`);
  }

  const [hv, { beneficios }] = await Promise.all([getHojaDeVida(id, candidato.id), getBeneficiosCandidato(candidato.id)]);
  if (!hv) notFound();

  const esPreview = beneficios.cvIa === "preview";
  const editando = !esPreview && sp.editar === "1";
  const aprobada = hv.estado === "aprobada";

  return (
    <div className="container-page space-y-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link href="/hoja-de-vida" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Mis hojas de vida
          </Link>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{hv.titulo}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <EstadoContenidoBadge estado={hv.estado} />
            {hv.generada_por_ia ? (
              <Badge tone="brand">
                <Sparkles className="h-3 w-3" /> Redactada con IA
              </Badge>
            ) : (
              <Badge tone="neutral">Armada con tus respuestas</Badge>
            )}
            {hv.tipo === "vacante" && (
              <Badge tone="accent">
                <Target className="h-3 w-3" /> Versión para una vacante
              </Badge>
            )}
          </div>
        </div>

        {!esPreview && !editando && (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/hoja-de-vida/${id}?editar=1`} className={buttonVariants({ variant: "outline", size: "md" })}>
              <Pencil className="h-4 w-4" /> Editar
            </Link>
            {aprobada && (
              <>
                <CopyButton
                  text={cvATexto(candidato.nombre, candidato.ciudad, candidato, hv.contenido)}
                  label="Copiar"
                  size="md"
                  registro={{ tipo: "hv", id: hv.id }}
                />
                <Link href={`/hoja-de-vida/${id}/imprimir`} className={buttonVariants({ variant: "accent", size: "md" })}>
                  Descargar PDF <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <AvisoValidacion estadoIa={hv.validacion?.estado_ia} graves={hv.validacion?.graves} />

      {esPreview ? (
        <div className="space-y-4">
          <CvPreview nombre={candidato.nombre} ciudad={candidato.ciudad} preview={previewHV(hv.contenido)} />
          <p className="text-center text-sm text-muted">
            Editar, aprobar, copiar y descargar están incluidos en los planes pagos.{" "}
            <Link href="/planes" className="font-bold text-ink underline">
              Ver planes
            </Link>
          </p>
        </div>
      ) : editando ? (
        <HvEditor id={hv.id} titulo={hv.titulo} contenidoInicial={hv.contenido} estado={hv.estado} />
      ) : (
        <div className="space-y-6">
          {!aprobada && <AprobarContenido tipo="hv" id={hv.id} />}
          <CvDocument
            nombre={candidato.nombre}
            ciudad={candidato.ciudad}
            whatsapp={candidato.whatsapp}
            email={candidato.email}
            contenido={hv.contenido}
          />
          {aprobada && (
            <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <p className="font-display text-lg font-extrabold text-ink">¿La quieres enfocar distinto?</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Crea una nueva versión para editarla sin tocar esta. Si editas esta, volverá a borrador.
                </p>
              </div>
              <NuevaVersionButton hvId={hv.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
