import Link from "next/link";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatCOP } from "@/lib/utils";
import { PRODUCTOS } from "@/lib/billing/catalogo";
import { cn } from "@/lib/utils";

/** Aviso de función de Empresa Pro (sin bloquear lo esencial). */
export function UpsellPro({ titulo, descripcion, className }: { titulo: string; descripcion: string; className?: string }) {
  const pro = PRODUCTOS.plan_empresa_pro;
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border-2 border-dashed border-ink bg-sol-100 p-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border-2 border-ink bg-sol-300 text-ink">
          <Lock className="h-4 w-4" />
        </span>
        <div>
          <p className="font-bold text-ink">{titulo}</p>
          <p className="text-sm text-ink-soft">{descripcion}</p>
        </div>
      </div>
      <Link href="/planes?audiencia=empresa" className={buttonVariants({ variant: "primary", size: "sm" })}>
        Empresa Pro · {formatCOP(pro.precioCop)}/{pro.periodoDias} días
      </Link>
    </div>
  );
}
