import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-ink bg-surface">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            La plataforma de empleo del Caribe colombiano. Vacantes reales, cerca de ti, sin vueltas.
          </p>
        </div>
        <FooterCol title="Candidatos">
          <FooterLink href="/ofertas">Ver ofertas</FooterLink>
          <FooterLink href="/registro-candidato">Crear cuenta</FooterLink>
          <FooterLink href="/mis-vacantes">Mis vacantes</FooterLink>
          <FooterLink href="/blog">Blog</FooterLink>
        </FooterCol>
        <FooterCol title="Empresas">
          <FooterLink href="/registro-empresa">Publicar vacante</FooterLink>
          <FooterLink href="/empresa/panel">Panel de empresa</FooterLink>
          <FooterLink href="/planes">Planes</FooterLink>
        </FooterCol>
        <FooterCol title="Legal">
          <FooterLink href="/terminos">Términos y condiciones</FooterLink>
          <FooterLink href="/privacidad">Política de privacidad</FooterLink>
          <FooterLink href="/datos-personales">Datos personales (Habeas Data)</FooterLink>
          <li>
            <a
              href="https://www.sic.gov.co"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted transition hover:text-brand-700"
            >
              Superintendencia de Industria y Comercio
            </a>
          </li>
        </FooterCol>
      </div>
      <div className="border-t-2 border-ink bg-sol-100">
        <p className="container-page py-3 text-center text-xs font-semibold text-ink sm:text-left">
          CostaLaboral conecta candidatos y empresas. No es agencia de colocación ni cobra comisión por contratación.
        </p>
      </div>
      <div className="border-t-2 border-ink bg-ink text-canvas">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} CostaLaboral · Barranquilla · Cartagena · Santa Marta</p>
          <p className="font-bold">Hecho en la Costa, para la Costa</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-ink">{title}</h4>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm font-medium text-muted transition hover:text-brand-700">
        {children}
      </Link>
    </li>
  );
}
