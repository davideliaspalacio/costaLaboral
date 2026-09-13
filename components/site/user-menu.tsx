"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  LogOut,
  User as UserIcon,
  LayoutDashboard,
  Sparkles,
  FileText,
  Settings,
  IdCard,
  Building2,
  Search,
  Tag,
  ShieldCheck,
} from "lucide-react";
import { cerrarSesion } from "@/lib/actions/auth";
import { iniciales } from "@/lib/utils";

export function UserMenu({
  nombre,
  tipo,
  esStaff = false,
}: {
  nombre: string;
  tipo: "candidato" | "empresa";
  esStaff?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-2 rounded-full border-2 border-ink bg-surface py-1 pl-1 pr-2.5 text-sm font-bold text-ink transition hover:shadow-[var(--shadow-sticker)]"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-ink bg-sol-400 text-xs font-extrabold text-ink">
          {iniciales(nombre)}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{nombre.split(" ")[0]}</span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border-2 border-ink bg-surface py-1.5 shadow-[var(--shadow-sticker-lg)]"
        >
          <div className="md:hidden">
            <MenuLink href="/ofertas" icon={<Search className="h-4 w-4" />}>
              Ofertas
            </MenuLink>
            <MenuLink href="/planes" icon={<Tag className="h-4 w-4" />}>
              Planes
            </MenuLink>
            <div className="my-1 border-t-2 border-line" />
          </div>
          {tipo === "empresa" ? (
            <>
              <MenuLink href="/empresa/panel" icon={<LayoutDashboard className="h-4 w-4" />}>
                Panel
              </MenuLink>
              <MenuLink href="/empresa/perfil" icon={<Building2 className="h-4 w-4" />}>
                Perfil de empresa
              </MenuLink>
            </>
          ) : (
            <>
              <MenuLink href="/mis-vacantes" icon={<Sparkles className="h-4 w-4" />}>
                Recomendadas
              </MenuLink>
              <MenuLink href="/hoja-de-vida" icon={<FileText className="h-4 w-4" />}>
                Hoja de vida
              </MenuLink>
              <MenuLink href="/linkedin" icon={<IdCard className="h-4 w-4" />}>
                LinkedIn
              </MenuLink>
              <MenuLink href="/perfil" icon={<UserIcon className="h-4 w-4" />}>
                Perfil
              </MenuLink>
            </>
          )}
          {esStaff && (
            <MenuLink href="/admin" icon={<ShieldCheck className="h-4 w-4" />}>
              Admin
            </MenuLink>
          )}
          <MenuLink href="/cuenta" icon={<Settings className="h-4 w-4" />}>
            Cuenta
          </MenuLink>
          <div className="my-1 border-t-2 border-line" />
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-danger-600 hover:bg-danger-50"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-ink-soft hover:bg-brand-50 hover:text-brand-700"
    >
      {icon}
      {children}
    </Link>
  );
}
