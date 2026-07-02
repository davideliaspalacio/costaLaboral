import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";

/** Contenedor centrado para páginas de login / registro. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="container-page flex flex-1 items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
        </div>
        <Card>
          <CardBody className="space-y-5">{children}</CardBody>
        </Card>
        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
}

export function AuthFooterLink({ href, prompt, cta }: { href: string; prompt: string; cta: string }) {
  return (
    <p>
      {prompt}{" "}
      <Link href={href} className="font-semibold text-brand-700 hover:underline">
        {cta}
      </Link>
    </p>
  );
}
