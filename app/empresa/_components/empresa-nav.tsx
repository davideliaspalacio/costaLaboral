import Link from "next/link";
import { BarChart3, Building2, LayoutGrid, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLAN_EMPRESA_NOMBRE, type PlanEmpresaId } from "@/lib/constants";
import type { Empresa } from "@/lib/types";
import { VERIFICACION } from "./etiquetas";

const ENLACES = [
  { href: "/empresa/panel", label: "Vacantes", icon: LayoutGrid, id: "panel" },
  { href: "/empresa/analitica", label: "Analítica", icon: BarChart3, id: "analitica" },
  { href: "/empresa/perfil", label: "Perfil", icon: Building2, id: "perfil" },
] as const;

/** Cabecera común del área de empresa. */
export function EmpresaNav({
  empresa,
  plan,
  activo,
  titulo,
  kicker,
}: {
  empresa: Pick<Empresa, "nombre_negocio" | "verificacion">;
  plan: PlanEmpresaId;
  activo: (typeof ENLACES)[number]["id"] | null;
  titulo?: string;
  kicker?: string;
}) {
  const ver = VERIFICACION[empresa.verificacion] ?? VERIFICACION.sin_verificar;
  return (
    <header className="mb-8 space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="kicker">{kicker ?? "Panel de empresa"}</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink sm:text-4xl">{titulo ?? empresa.nombre_negocio}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={ver.tono}>{ver.label}</Badge>
            <Badge tone={plan === "pro" ? "ink" : "outline"}>{PLAN_EMPRESA_NOMBRE[plan]}</Badge>
          </div>
        </div>
        <Link href="/registro-empresa" className={buttonVariants({ variant: "accent", size: "lg" })}>
          <Plus className="h-5 w-5" /> Publicar vacante
        </Link>
      </div>
      <nav aria-label="Secciones de empresa" className="flex flex-wrap gap-2">
        {ENLACES.map((e) => {
          const Icon = e.icon;
          const on = activo === e.id;
          return (
            <Link
              key={e.id}
              href={e.href}
              aria-current={on ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border-2 px-3.5 py-2 text-sm font-bold transition",
                on ? "border-ink bg-ink text-canvas" : "border-ink bg-surface text-ink hover:bg-sol-100",
              )}
            >
              <Icon className="h-4 w-4" /> {e.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
