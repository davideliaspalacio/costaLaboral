import Link from "next/link";
import { CalendarClock, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ESTADO_SUSCRIPCION_LABEL, diasRestantes } from "@/lib/billing/estados";
import { formatFecha } from "@/lib/billing/formato";
import type { Suscripcion } from "@/lib/billing/suscripciones";
import { DIAS_GRACIA_PAST_DUE } from "@/lib/entitlements";
import { CancelarRenovacion } from "./cancelar-renovacion";

/** Resumen del plan vigente con fecha de renovación/fin y cancelación. Server Component. */
export function PlanActual({
  nombrePlan,
  suscripcion,
  mostrarEnlacePagos = true,
}: {
  nombrePlan: string;
  suscripcion: Suscripcion | null;
  mostrarEnlacePagos?: boolean;
}) {
  const fin = suscripcion ? formatFecha(suscripcion.periodo_fin) : null;
  const finGracia = suscripcion
    ? formatFecha(new Date(new Date(suscripcion.periodo_fin).getTime() + DIAS_GRACIA_PAST_DUE * 86_400_000))
    : null;

  return (
    <section aria-labelledby="plan-actual" className="card-pop flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="space-y-1.5">
        <p className="kicker">Tu plan</p>
        <h2 id="plan-actual" className="flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold text-ink">
          {nombrePlan}
          {suscripcion && (
            <Badge tone={suscripcion.estado === "active" ? (suscripcion.cancelar_al_final ? "sol" : "success") : "warn"}>
              {suscripcion.estado === "active" && suscripcion.cancelar_al_final
                ? "No se renovará"
                : ESTADO_SUSCRIPCION_LABEL[suscripcion.estado]}
            </Badge>
          )}
        </h2>
        {suscripcion ? (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <CalendarClock className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            {suscripcion.estado === "past_due"
              ? `Tu periodo terminó el ${fin}. Paga la renovación antes del ${finGracia} para no perder los beneficios.`
              : suscripcion.cancelar_al_final
                ? `Tus beneficios terminan el ${fin}.`
                : `Se renueva el ${fin} (${diasRestantes(suscripcion.periodo_fin)} días). Te avisaremos para que pagues la renovación.`}
          </p>
        ) : (
          <p className="text-sm text-ink-soft">Lo esencial es tuyo sin pagar nada.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {suscripcion && !suscripcion.cancelar_al_final && fin && <CancelarRenovacion hasta={fin} />}
        {mostrarEnlacePagos && (
          <Link href="/pagos" className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <Receipt className="h-4 w-4" aria-hidden="true" />
            Mis pagos
          </Link>
        )}
      </div>
    </section>
  );
}
