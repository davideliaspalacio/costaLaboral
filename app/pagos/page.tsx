import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Receipt } from "lucide-react";
import { getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_EMPRESA_NOMBRE, PLAN_NOMBRE } from "@/lib/constants";
import { getBeneficiosCandidato, getBeneficiosEmpresa } from "@/lib/billing/suscripciones";
import { getPasarelaSegura } from "@/lib/billing/pasarela";
import { ESTADO_PAGO_INFO } from "@/lib/billing/estados";
import { CONCEPTO_LABEL, formatFecha, nombreProducto } from "@/lib/billing/formato";
import type { Pago } from "@/lib/billing/servicio";
import { formatCOP } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PlanActual } from "@/app/planes/plan-actual";

export const metadata: Metadata = { title: "Mis pagos", robots: { index: false } };

export default async function PagosPage() {
  const sesion = await getUsuario();
  if (!sesion) redirect("/login?next=/pagos");
  const esEmpresa = sesion.tipo === "empresa";

  const admin = createAdminClient();
  const [plan, { data }] = await Promise.all([
    esEmpresa
      ? getBeneficiosEmpresa(sesion.user.id).then((r) => ({ nombre: PLAN_EMPRESA_NOMBRE[r.plan], suscripcion: r.suscripcion }))
      : getBeneficiosCandidato(sesion.user.id).then((r) => ({ nombre: PLAN_NOMBRE[r.plan], suscripcion: r.suscripcion })),
    admin
      .from("pagos")
      .select("*")
      .eq("propietario_id", sesion.user.id)
      .order("creado_en", { ascending: false })
      .limit(100),
  ]);
  const pagos = (data ?? []) as Pago[];

  const pasarela = getPasarelaSegura();
  const pendientes = await Promise.all(
    pagos
      .filter((p) => p.estado === "pendiente")
      .map(async (p) => ({
        pago: p,
        url:
          pasarela && pasarela.id === p.proveedor
            ? (
                await pasarela.crearCheckout({
                  referencia: p.referencia,
                  montoCop: p.monto,
                  descripcion: nombreProducto(p.producto),
                  urlRetorno: `/pagos/resultado?ref=${encodeURIComponent(p.referencia)}`,
                })
              ).url
            : null,
      })),
  );

  return (
    <div className="container-page space-y-10 py-12 sm:py-16">
      <header>
        <span className="kicker">Facturación</span>
        <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink">Mis pagos</h1>
        <p className="mt-2 text-ink-soft">Tu plan, renovaciones pendientes e historial de compras.</p>
      </header>

      <PlanActual nombrePlan={plan.nombre} suscripcion={plan.suscripcion} mostrarEnlacePagos={false} />

      {pendientes.length > 0 && (
        <section aria-labelledby="pendientes" className="space-y-3">
          <h2 id="pendientes" className="flex items-center gap-2 font-display text-2xl font-extrabold text-ink">
            <AlertTriangle className="h-5 w-5 text-accent-500" aria-hidden="true" /> Pagos pendientes
          </h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {pendientes.map(({ pago, url }) => (
              <li key={pago.id} className="card-pop flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-ink">{nombreProducto(pago.producto)}</p>
                    <p className="text-xs text-muted">
                      {CONCEPTO_LABEL[pago.concepto]} · {pago.referencia} · {formatFecha(pago.creado_en)}
                    </p>
                  </div>
                  <p className="font-display text-xl font-extrabold text-ink">{formatCOP(pago.monto)}</p>
                </div>
                {url ? (
                  <Link href={url} className={buttonVariants({ variant: pago.concepto === "renovacion" ? "accent" : "primary", size: "md" })}>
                    {pago.concepto === "renovacion" ? "Pagar renovación" : "Completar pago"}
                  </Link>
                ) : (
                  <p className="text-sm text-muted">Este pago no se puede completar con la pasarela actual.</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="historial" className="space-y-3">
        <h2 id="historial" className="font-display text-2xl font-extrabold text-ink">Historial</h2>
        {pagos.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-7 w-7" />}
            title="Aún no tienes pagos"
            description="Lo esencial de CostaLaboral es gratis. Si eliges un plan o destacas una vacante, lo verás aquí."
            action={
              <Link href="/planes" className={buttonVariants({ variant: "primary" })}>
                Ver planes
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-ink bg-surface">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <caption className="sr-only">Historial de pagos</caption>
              <thead>
                <tr className="border-b-2 border-ink bg-canvas text-muted">
                  <th scope="col" className="px-4 py-3 font-bold">Fecha</th>
                  <th scope="col" className="px-4 py-3 font-bold">Concepto</th>
                  <th scope="col" className="px-4 py-3 font-bold">Referencia</th>
                  <th scope="col" className="px-4 py-3 text-right font-bold">Monto</th>
                  <th scope="col" className="px-4 py-3 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => {
                  const info = ESTADO_PAGO_INFO[p.estado];
                  return (
                    <tr key={p.id} className="border-b border-line last:border-b-0">
                      <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatFecha(p.creado_en)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-ink">{nombreProducto(p.producto)}</span>
                        <span className="block text-xs text-muted">
                          {CONCEPTO_LABEL[p.concepto]}
                          {p.proveedor === "incluida" ? " · incluida en tu plan" : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/pagos/resultado?ref=${encodeURIComponent(p.referencia)}`} className="font-mono text-xs font-semibold text-brand-700 underline">
                          {p.referencia}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-ink">{formatCOP(p.monto)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={info.tono}>{info.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted">
          Precios en COP, IVA incluido. Retracto, reversión del pago y reembolsos:{" "}
          <Link href="/terminos" className="font-semibold underline">Términos y condiciones</Link>.
        </p>
      </section>
    </div>
  );
}
