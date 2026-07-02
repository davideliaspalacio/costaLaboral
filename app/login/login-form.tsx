"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { iniciarSesion, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? "Entrando..." : "Ingresar"}
    </Button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(iniciarSesion, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" name="email" type="email" required placeholder="tucorreo@ejemplo.com" autoComplete="email" />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <Input id="password" name="password" type="password" required placeholder="••••••••" autoComplete="current-password" />
      </Field>
      {state?.error && (
        <p className="rounded-xl bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-500">{state.error}</p>
      )}
      <SubmitBtn />
    </form>
  );
}
