import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert, ShieldCheck, Home } from "lucide-react";
import { getUsuario } from "@/lib/auth";
import { getStaff, puede, ROL_LABEL } from "@/lib/roles";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AdminSidebarNav, AdminTabsNav, type NavItem } from "@/components/admin/admin-nav";

export const metadata = {
  title: "Administración · CostaLaboral",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await getStaff();

  // Gate de acceso: sin staff → si hay sesión, tarjeta de acceso restringido;
  // si no hay sesión, al login con retorno a /admin.
  if (!staff) {
    const sesion = await getUsuario();
    if (!sesion) redirect("/login?next=/admin");

    return (
      <main className="container-page flex min-h-[70vh] items-center justify-center py-16">
        <Card pop className="w-full max-w-md text-center">
          <CardBody className="flex flex-col items-center gap-4 py-10">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border-2 border-ink bg-danger-50 text-danger-600">
              <ShieldAlert className="h-7 w-7" />
            </span>
            <div>
              <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">
                Acceso restringido
              </h1>
              <p className="mt-2 text-sm text-ink-soft">
                La administración es solo para el equipo de CostaLaboral. Tu cuenta no tiene
                permisos para verla.
              </p>
            </div>
            <Link href="/" className={buttonVariants({ variant: "primary", size: "md" })}>
              Volver al inicio
            </Link>
          </CardBody>
        </Card>
      </main>
    );
  }

  const items: NavItem[] = [
    { href: "/admin", label: "Resumen", icon: "resumen" },
    { href: "/admin/candidatos", label: "Candidatos", icon: "candidatos" },
    { href: "/admin/empresas", label: "Empresas", icon: "empresas" },
    { href: "/admin/vacantes", label: "Vacantes", icon: "vacantes" },
    { href: "/admin/actividad", label: "Actividad", icon: "actividad" },
  ];
  if (puede(staff.rol, "gestionar_staff")) {
    items.push({ href: "/admin/staff", label: "Staff", icon: "staff" });
  }

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8">
        {/* ---------- Sidebar (escritorio) ---------- */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <div className="card p-4">
              <span className="kicker">Administración</span>
              <p className="mt-2 flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                <ShieldCheck className="h-5 w-5 text-brand-600" /> Panel
              </p>
              <div className="mt-3 flex flex-col gap-1 border-t-2 border-line pt-3">
                <span className="text-xs text-muted">Tu rol</span>
                <Badge tone="brand" className="w-fit">
                  {ROL_LABEL[staff.rol]}
                </Badge>
                <span className="mt-1 truncate text-xs text-muted" title={staff.email}>
                  {staff.email}
                </span>
              </div>
            </div>
            <AdminSidebarNav items={items} />
            <Link
              href="/"
              className={buttonVariants({ variant: "ghost", size: "sm", block: true })}
            >
              <Home className="h-4 w-4" /> Ir al sitio
            </Link>
          </div>
        </aside>

        {/* ---------- Barra superior (móvil) ---------- */}
        <div className="mb-6 space-y-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display text-xl font-extrabold text-ink">
              <ShieldCheck className="h-5 w-5 text-brand-600" /> Administración
            </p>
            <Badge tone="brand">{ROL_LABEL[staff.rol]}</Badge>
          </div>
          <AdminTabsNav items={items} />
        </div>

        {/* ---------- Contenido ---------- */}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
