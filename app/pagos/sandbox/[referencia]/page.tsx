import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FlaskConical, Lock } from "lucide-react";
import { getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPagoPorReferencia } from "@/lib/billing/servicio";
import { getPasarelaSegura } from "@/lib/billing/pasarela";
import { checkoutSandboxValido } from "@/lib/billing/proveedores/sandbox";
import { CONCEPTO_LABEL, nombreProducto } from "@/lib/billing/formato";
import { simularPagoSandbox } from "@/lib/actions/pagos";
import { formatCOP } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { BotonSimular } from "./botones";

export const metadata: Metadata = { title: "Pago de prueba", robots: { index: false } };

export default async function SandboxCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ referencia: string }>;
  searchParams: Promise<{ monto?: string; firma?: string }>;
}) {
  const { referencia: refParam } = await params;
  const { monto, firma } = await searchParams;
  const referencia = decodeURIComponent(refParam);

  const sesion = await getUsuario();
  if (!sesion) {
    const q = new URLSearchParams({ monto: monto ?? "", firma: firma ?? "" });
    redirect(`/login?next=${encodeURIComponent(`/pagos/sandbox/${encodeURIComponent(referencia)}?${q}`)}`);
  }

  const pago = await getPagoPorReferencia(referencia);
  if (!pago || pago.propietario_id !== sesion.user.id) notFound();

  const pasarela = getPasarelaSegura();
  const habilitado = pasarela?.id === "sandbox" && pago.proveedor === "sandbox";
  const enlaceValido = habilitado && Number(monto) === pago.monto && checkoutSandboxValido(pago.referencia, pago.monto, firma);

  if (habilitado && pago.estado !== "pendiente") redirect(`/pagos/resultado?ref=${encodeURIComponent(pago.referencia)}`);

  let vacanteTitulo: string | null = null;
  if (pago.concepto === "vacante_destacada" && typeof pago.metadata.vacanteId === "string") {
    const { data } = await createAdminClient().from("vacantes").select("titulo").eq("id", pago.metadata.vacanteId).maybeSingle();
    vacanteTitulo = (data?.titulo as string) ?? null;
  }

  const volver = pago.propietario_tipo === "empresa" ? "/planes?audiencia=empresa" : "/planes";

  return (
    <div className="container-page max-w-2xl py-10 sm:py-14">
      <div
        role="note"
        className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-sol-300 p-5 shadow-[var(--shadow-sticker-lg)]"
      >
        <FlaskConical className="h-10 w-10 shrink-0 text-ink" aria-hidden="true" />
        <div>
          <p className="font-display text-2xl font-extrabold uppercase tracking-tight text-ink sm:text-3xl">Modo prueba</p>
          <p className="font-bold text-ink">No se cobra dinero real. Esta pantalla simula la pasarela de pagos.</p>
        </div>
      </div>

      <div className="card-pop mt-8 overflow-hidden">
        <div className="border-b-2 border-ink bg-canvas p-6">
          <p className="kicker">Resumen del pago</p>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-ink">{nombreProducto(pago.producto)}</h1>
          {vacanteTitulo && <p className="mt-1 text-sm text-ink-soft">Vacante: {vacanteTitulo}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-6 text-sm">
          <dt className="text-muted">Concepto</dt>
          <dd className="text-right text-ink">{CONCEPTO_LABEL[pago.concepto]}</dd>
          <dt className="text-muted">Referencia</dt>
          <dd className="text-right font-mono text-xs font-semibold text-ink">{pago.referencia}</dd>
          <dt className="text-muted">Total (IVA incluido)</dt>
          <dd className="text-right font-display text-3xl font-extrabold text-ink">{formatCOP(pago.monto)}</dd>
        </dl>

        <div className="space-y-3 border-t-2 border-ink p-6">
          {!habilitado ? (
            <p className="flex items-center gap-2 rounded-xl border-2 border-ink bg-canvas px-4 py-3 text-sm font-semibold text-ink-soft">
              <Lock className="h-4 w-4" aria-hidden="true" />
              El simulador está deshabilitado: la pasarela activa no es la de prueba.
            </p>
          ) : !enlaceValido ? (
            <p role="alert" className="rounded-xl border-2 border-ink bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">
              Este enlace de pago no es válido. Vuelve a iniciar la compra desde Mis pagos.
            </p>
          ) : (
            <>
              <form action={simularPagoSandbox.bind(null, pago.referencia, "aprobado")}>
                <BotonSimular variante="success">Simular pago aprobado</BotonSimular>
              </form>
              <form action={simularPagoSandbox.bind(null, pago.referencia, "rechazado")}>
                <BotonSimular variante="danger">Simular pago rechazado</BotonSimular>
              </form>
            </>
          )}
          <Link href={habilitado && enlaceValido ? volver : "/pagos"} className={buttonVariants({ variant: "ghost", size: "lg", block: true })}>
            Cancelar
          </Link>
          <p className="text-center text-xs text-muted">
            Si cancelas, el pago queda pendiente y puedes retomarlo desde{" "}
            <Link href="/pagos" className="font-semibold underline">Mis pagos</Link>. Nunca te pediremos datos de tarjeta aquí.
          </p>
        </div>
      </div>
    </div>
  );
}
