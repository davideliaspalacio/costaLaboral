import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, Sparkles } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getHojaDeVida } from "@/lib/data/hoja-de-vida";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/hv/copy-button";
import { CvDocument } from "@/components/hv/cv-document";
import { LinkedInBlock } from "@/components/hv/linkedin-block";
import { cvATexto } from "@/lib/hv-texto";
import { HvEditor } from "./hv-editor";

export const metadata: Metadata = { title: "Hoja de vida" };

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

  const hv = await getHojaDeVida(id, candidato.id);
  if (!hv) notFound();

  const editando = sp.editar === "1";
  const contacto = { whatsapp: candidato.whatsapp, email: candidato.email };
  const textoCv = cvATexto(candidato.nombre, candidato.ciudad, contacto, hv.contenido);

  return (
    <main className="container-page space-y-6 py-8">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/hoja-de-vida"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Mis hojas de vida
          </Link>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{hv.titulo}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {hv.generada_por_ia ? (
              <Badge tone="brand">
                <Sparkles className="h-3 w-3" /> Generada con IA
              </Badge>
            ) : (
              <Badge tone="neutral">Plantilla inteligente</Badge>
            )}
            <span className="text-sm text-muted">{hv.cargo_objetivo}</span>
          </div>
        </div>

        {!editando && (
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={textoCv} label="Copiar hoja de vida" />
            <Link href={`/hoja-de-vida/${id}?editar=1`} className={buttonVariants({ variant: "accent", size: "md" })}>
              <Pencil className="h-4 w-4" /> Editar
            </Link>
          </div>
        )}
      </div>

      {editando ? (
        <HvEditor
          id={hv.id}
          candidato={{
            nombre: candidato.nombre,
            ciudad: candidato.ciudad,
            whatsapp: candidato.whatsapp,
            email: candidato.email,
          }}
          titulo={hv.titulo}
          contenidoInicial={hv.contenido}
          linkedinInicial={{ titular: hv.linkedin_titular ?? "", acerca: hv.linkedin_acerca ?? "" }}
        />
      ) : (
        <div className="space-y-6">
          <CvDocument
            nombre={candidato.nombre}
            ciudad={candidato.ciudad}
            whatsapp={candidato.whatsapp}
            email={candidato.email}
            contenido={hv.contenido}
          />
          {(hv.linkedin_titular || hv.linkedin_acerca) && (
            <LinkedInBlock titular={hv.linkedin_titular ?? ""} acerca={hv.linkedin_acerca ?? ""} />
          )}
        </div>
      )}
    </main>
  );
}
