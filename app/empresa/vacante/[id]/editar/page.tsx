import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getEmpresa, getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Vacante } from "@/lib/types";
import { EditarForm } from "./editar-form";

export const metadata: Metadata = { title: "Editar vacante" };

export default async function EditarVacantePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const empresa = await getEmpresa();
  if (!empresa) {
    const sesion = await getUsuario();
    if (sesion?.tipo === "candidato") redirect("/mis-vacantes");
    redirect("/registro-empresa");
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from("vacantes").select("*").eq("id", id).maybeSingle();
  const vacante = data as Vacante | null;

  if (!vacante || vacante.empresa_id !== empresa.id) redirect("/empresa/panel");

  return (
    <div className="container-page max-w-2xl py-6 sm:py-10">
      <Link
        href="/empresa/panel"
        className={buttonVariants({ variant: "ghost", size: "sm" }) + " mb-4 -ml-2"}
      >
        <ArrowLeft className="h-4 w-4" /> Volver al panel
      </Link>

      <header className="mb-6">
        <p className="kicker">Editar vacante</p>
        <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">{vacante.titulo}</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Ajusta los datos del cargo. Los cambios se reflejan al instante en la ficha pública.
        </p>
      </header>

      <EditarForm vacante={vacante} />
    </div>
  );
}
