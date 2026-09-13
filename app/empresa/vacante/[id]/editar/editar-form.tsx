"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { editarVacante, type FormVacanteState } from "@/lib/actions/empresa";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Vacante } from "@/lib/types";
import { CamposVacante } from "../../../_components/campos-vacante";

function Botones({ borrador }: { borrador: boolean }) {
  const { pending, data } = useFormStatus();
  const intent = data?.get("intent");
  if (!borrador) {
    return (
      <Button type="submit" name="intent" value="guardar" size="lg" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    );
  }
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <Button type="submit" name="intent" value="guardar" variant="outline" size="lg" disabled={pending}>
        {pending && intent === "guardar" ? "Guardando…" : "Guardar borrador"}
      </Button>
      <Button type="submit" name="intent" value="publicar" variant="accent" size="lg" disabled={pending}>
        {pending && intent === "publicar" ? "Publicando…" : "Publicar"}
      </Button>
    </div>
  );
}

export function EditarForm({ vacante }: { vacante: Vacante }) {
  const [state, action] = useActionState<FormVacanteState, FormData>(editarVacante, null);

  return (
    <form action={action} className="space-y-6" noValidate>
      <input type="hidden" name="id" value={vacante.id} />
      <CamposVacante valores={vacante} />

      {state?.error && (
        <p role="alert" className="rounded-xl border-2 border-ink bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-600">
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t-2 border-ink pt-5 sm:flex-row sm:items-center">
        <Link href="/empresa/panel" className={buttonVariants({ variant: "ghost", size: "lg" })}>
          Cancelar
        </Link>
        <Botones borrador={vacante.estado === "borrador"} />
      </div>
    </form>
  );
}
