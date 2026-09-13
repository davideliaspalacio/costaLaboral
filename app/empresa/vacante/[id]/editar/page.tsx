import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Clock } from "lucide-react";
import { getVacantePropia, requerirEmpresa } from "@/lib/data/empresa";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EditarForm } from "./editar-form";

export const metadata: Metadata = { title: "Editar vacante" };

function avisoModeracion(estado: string, moderacion: string, verificada: boolean): { tono: "sol" | "danger"; texto: string } | null {
  if (estado === "borrador") return null;
  if (moderacion === "rechazada")
    return { tono: "danger", texto: "Esta vacante fue rechazada. Corrige lo indicado y al guardar la enviamos de nuevo a revisión." };
  if (moderacion === "pendiente") return { tono: "sol", texto: "Esta vacante está en revisión. Los cambios se revisan junto con ella." };
  if (moderacion === "reportada")
    return { tono: "danger", texto: "Esta vacante está oculta por reportes de usuarios mientras el equipo la revisa." };
  if (!verificada)
    return {
      tono: "sol",
      texto: "Tu empresa no está verificada: si cambias el contenido, la vacante vuelve a revisión antes de mostrarse. Verifica tu empresa para evitarlo.",
    };
  return { tono: "sol", texto: "Si el nuevo contenido incluye requisitos discriminatorios o cobros al candidato, la vacante pasa a revisión." };
}

export default async function EditarVacantePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const empresa = await requerirEmpresa(`/empresa/vacante/${id}/editar`);
  const vacante = await getVacantePropia(empresa.id, id);
  if (!vacante) notFound();
  const aviso = avisoModeracion(vacante.estado, vacante.estado_moderacion, empresa.verificada);

  return (
    <div className="container-page max-w-3xl py-8 sm:py-12">
      <Link href="/empresa/panel" className={`${buttonVariants({ variant: "ghost", size: "sm" })} -ml-3 mb-4`}>
        <ArrowLeft className="h-4 w-4" /> Volver al panel
      </Link>

      <header className="mb-6">
        <p className="kicker">{vacante.estado === "borrador" ? "Borrador" : "Editar vacante"}</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold text-ink">{vacante.titulo}</h1>
      </header>

      {aviso && (
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border-2 border-ink px-4 py-3 text-sm text-ink ${aviso.tono === "danger" ? "bg-danger-50" : "bg-sol-100"}`}>
          {aviso.tono === "danger" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock className="mt-0.5 h-4 w-4 shrink-0" />}
          <div>
            <p>{aviso.texto}</p>
            {vacante.motivo_moderacion && vacante.estado_moderacion !== "aprobada" && (
              <p className="mt-1">
                <strong>Motivo:</strong> {vacante.motivo_moderacion}
              </p>
            )}
          </div>
        </div>
      )}

      <Card pop>
        <CardBody>
          <EditarForm vacante={vacante} />
        </CardBody>
      </Card>
    </div>
  );
}
