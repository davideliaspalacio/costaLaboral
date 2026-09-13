"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { BadgeCheck } from "lucide-react";
import { solicitarVerificacion, type PerfilEmpresaState } from "@/lib/actions/empresa";
import { Button } from "@/components/ui/button";

function Enviar({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="brand" disabled={disabled || pending}>
      <BadgeCheck className="h-4 w-4" /> {pending ? "Enviando…" : "Solicitar verificación"}
    </Button>
  );
}

export function VerificacionForm({ faltante }: { faltante: string | null }) {
  const [state, action] = useActionState<PerfilEmpresaState, FormData>(solicitarVerificacion, null);
  return (
    <form action={action} className="space-y-2">
      <Enviar disabled={!!faltante} />
      {faltante && <p className="text-sm text-muted">{faltante}</p>}
      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-danger-600">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm font-semibold text-success-600">
          Solicitud enviada. Te avisamos cuando la revisemos.
        </p>
      )}
    </form>
  );
}
