import type { Metadata } from "next";
import { Check, X, CreditCard, Building2 } from "lucide-react";
import { PLANES, type PlanId } from "@/lib/constants";
import { formatCOP, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PlanCta } from "./plan-cta";

export const metadata: Metadata = {
  title: "Planes para candidatos",
  description:
    "Las empresas publican gratis; tú eliges cuánto camello quieres alcanzar. Empieza gratis o pásate a un plan con más postulaciones y beneficios.",
};

const ORDEN: PlanId[] = ["gratis", "camelleitor", "berraco_pro"];

const filasComparativa: {
  etiqueta: string;
  valor: (plan: (typeof PLANES)[PlanId]) => "si" | "no" | string;
}[] = [
  {
    etiqueta: "Postulaciones cada 90 días",
    valor: (p) => (p.postulaciones === null ? "Ilimitadas" : String(p.postulaciones)),
  },
  {
    etiqueta: "Ve la empresa y todos los requisitos",
    valor: (p) => (p.id === "gratis" ? "no" : "si"),
  },
  {
    etiqueta: "% de match con IA",
    valor: (p) => (p.id === "berraco_pro" ? "si" : "no"),
  },
  {
    etiqueta: "Prioridad 2h en tus alertas",
    valor: (p) => (p.id === "berraco_pro" ? "si" : "no"),
  },
];

export default function PlanesPage() {
  return (
    <div className="container-page py-14 sm:py-20">
      {/* Encabezado */}
      <header className="mx-auto max-w-2xl text-center">
        <span className="chip mx-auto border-brand-100 bg-brand-50 text-brand-700">
          <Building2 className="h-4 w-4" />
          Empresas: gratis siempre
        </span>
        <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Planes para candidatos
        </h1>
        <p className="mt-4 text-lg text-ink-soft">
          Publicar es gratis para las empresas. Como candidato, tú eliges el plan: empieza gratis y
          pásate a uno con más postulaciones cuando quieras acelerar tu búsqueda.
        </p>
      </header>

      {/* Tarjetas de planes */}
      <div className="mx-auto mt-12 grid max-w-5xl items-start gap-6 lg:grid-cols-3">
        {ORDEN.map((id) => {
          const plan = PLANES[id];
          const destacado = Boolean(plan.destacado);
          return (
            <div
              key={id}
              className={cn(
                "relative flex h-full flex-col rounded-2xl border-2 border-ink bg-surface p-6 sm:p-8",
                destacado && "shadow-[var(--shadow-sticker-lg)]",
              )}
            >
              {destacado && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge tone="accent" className="px-3 py-1 text-xs">
                    Más popular
                  </Badge>
                </span>
              )}

              <h2 className="font-display text-xl font-extrabold text-ink">{plan.nombre}</h2>
              <p className="mt-1 min-h-10 text-sm text-ink-soft">{plan.tagline}</p>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-extrabold text-ink">
                  {plan.precio === 0 ? "$0" : formatCOP(plan.precio)}
                </span>
                <span className="text-sm text-muted">/90 días</span>
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.beneficios.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-ink-soft">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-success-500" aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <PlanCta plan={id} destacado={destacado} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Nota Wompi / Fase 2 */}
      <p className="mx-auto mt-8 flex max-w-2xl items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-canvas px-5 py-4 text-center text-sm text-muted">
        <CreditCard className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        Los pagos con Wompi llegan en Fase 2. Por ahora puedes activar un plan de prueba.
      </p>

      {/* Tabla comparativa */}
      <section className="mx-auto mt-16 max-w-5xl">
        <h2 className="text-center font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
          Compara los planes
        </h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <caption className="sr-only">Comparación de beneficios por plan</caption>
            <thead>
              <tr className="border-b-2 border-ink">
                <th scope="col" className="py-4 pr-4 text-sm font-semibold text-muted">
                  Beneficio
                </th>
                {ORDEN.map((id) => (
                  <th
                    key={id}
                    scope="col"
                    className="px-4 py-4 text-center text-sm font-bold text-ink"
                  >
                    {PLANES[id].nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasComparativa.map((fila) => (
                <tr key={fila.etiqueta} className="border-b border-line">
                  <th scope="row" className="py-4 pr-4 text-sm font-medium text-ink-soft">
                    {fila.etiqueta}
                  </th>
                  {ORDEN.map((id) => {
                    const v = fila.valor(PLANES[id]);
                    return (
                      <td key={id} className="px-4 py-4 text-center">
                        {v === "si" ? (
                          <>
                            <Check
                              className="mx-auto h-5 w-5 text-success-500"
                              aria-hidden="true"
                            />
                            <span className="sr-only">Incluido</span>
                          </>
                        ) : v === "no" ? (
                          <>
                            <X className="mx-auto h-5 w-5 text-muted" aria-hidden="true" />
                            <span className="sr-only">No incluido</span>
                          </>
                        ) : (
                          <span className="text-sm font-semibold text-ink">{v}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
