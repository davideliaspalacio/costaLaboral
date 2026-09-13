"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Activity,
  ShieldCheck,
  Flag,
  ScrollText,
  CreditCard,
  Sparkles,
  Gauge,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONOS;
  /** Contador de pendientes (opcional). */
  badge?: number;
};

const ICONOS = {
  resumen: LayoutDashboard,
  candidatos: Users,
  empresas: Building2,
  vacantes: Briefcase,
  reportes: Flag,
  actividad: Activity,
  auditoria: ScrollText,
  pagos: CreditCard,
  ia: Sparkles,
  kpis: Gauge,
  solicitudes: Inbox,
  staff: ShieldCheck,
} as const;

/** ¿La ruta actual corresponde a este item? El resumen (/admin) es exacto. */
function activo(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Contador({ n, on }: { n?: number; on: boolean }) {
  if (!n) return null;
  return (
    <span
      className={cn(
        "ml-auto rounded-full border-2 border-ink px-1.5 text-xs tabular-nums",
        on ? "bg-surface text-ink" : "bg-accent-500 text-white",
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Navegación lateral (escritorio). Marca el item activo con `usePathname`. */
export function AdminSidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Secciones del panel">
      {items.map((item) => {
        const Icon = ICONOS[item.icon];
        const on = activo(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all",
              on
                ? "border-ink bg-sol-300 text-ink shadow-[var(--shadow-sticker)]"
                : "border-transparent text-ink-soft hover:border-line hover:bg-canvas hover:text-ink",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
            <Contador n={item.badge} on={on} />
          </Link>
        );
      })}
    </nav>
  );
}

/** Navegación horizontal (móvil): tabs con scroll horizontal. */
export function AdminTabsNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Secciones del panel"
    >
      {items.map((item) => {
        const Icon = ICONOS[item.icon];
        const on = activo(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold transition-all",
              on
                ? "border-ink bg-sol-300 text-ink shadow-[var(--shadow-sticker)]"
                : "border-line bg-surface text-ink-soft hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
            <Contador n={item.badge} on={on} />
          </Link>
        );
      })}
    </nav>
  );
}
