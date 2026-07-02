import type { Metadata } from "next";
import { AuthShell, AuthFooterLink } from "@/components/site/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next = "" } = await searchParams;
  return (
    <AuthShell
      title="Hola de nuevo 👋"
      subtitle="Entra para ver tus vacantes y postulaciones."
      footer={
        <div className="space-y-1">
          <AuthFooterLink href="/registro-candidato" prompt="¿No tienes cuenta?" cta="Regístrate gratis" />
          <AuthFooterLink href="/registro-empresa" prompt="¿Eres empresa?" cta="Publica una vacante" />
        </div>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
