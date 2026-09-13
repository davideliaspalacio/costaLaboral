import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCandidato } from "@/lib/auth";
import { getBeneficiosCandidato } from "@/lib/billing/suscripciones";
import { getHojaDeVida } from "@/lib/data/hoja-de-vida";
import { CvDocument } from "@/components/hv/cv-document";
import { ImprimirButton } from "@/components/hv/hv-acciones";
import { PrintStyles } from "@/components/hv/print-styles";

export const metadata: Metadata = { title: "Descargar hoja de vida", robots: { index: false } };

/* Descarga en PDF sin dependencias: vista imprimible + diálogo del navegador. */
export default async function ImprimirHojaDeVidaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidato = await getCandidato();
  if (!candidato) redirect(`/login?next=/hoja-de-vida/${id}/imprimir`);

  const [hv, { beneficios }] = await Promise.all([getHojaDeVida(id, candidato.id), getBeneficiosCandidato(candidato.id)]);
  if (!hv) notFound();
  if (beneficios.cvIa !== "completo" || hv.estado !== "aprobada") redirect(`/hoja-de-vida/${id}`);

  return (
    <div className="container-page print-hoja py-8">
      <PrintStyles />
      <div className="no-print mx-auto mb-6 flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href={`/hoja-de-vida/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Link>
          <p className="mt-1 text-sm text-muted">En el diálogo de impresión elige “Guardar como PDF”.</p>
        </div>
        <ImprimirButton hvId={hv.id} />
      </div>
      <div className="mx-auto max-w-3xl">
        <CvDocument
          nombre={candidato.nombre}
          ciudad={candidato.ciudad}
          whatsapp={candidato.whatsapp}
          email={candidato.email}
          contenido={hv.contenido}
        />
      </div>
    </div>
  );
}
