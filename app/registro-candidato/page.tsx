import type { Metadata } from "next";
import { AuthShell, AuthFooterLink } from "@/components/site/auth-shell";
import { RegistroForm } from "./registro-form";

export const metadata: Metadata = { title: "Crea tu cuenta gratis" };

export default function RegistroCandidatoPage() {
  return (
    <AuthShell
      title="Crea tu cuenta gratis"
      subtitle="Empieza a recibir camellos que encajan contigo"
      footer={
        <div className="space-y-1">
          <AuthFooterLink href="/login" prompt="¿Ya tienes cuenta?" cta="Ingresa aquí" />
          <AuthFooterLink href="/registro-empresa" prompt="¿Eres empresa?" cta="Publica una vacante" />
        </div>
      }
    >
      <RegistroForm />
    </AuthShell>
  );
}
