import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { getUsuario } from "@/lib/auth";
import { getPagoPorReferencia } from "@/lib/billing/servicio";
import { getPasarelaSegura } from "@/lib/billing/pasarela";
import { ESTADO_PAGO_INFO, type EstadoPago } from "@/lib/billing/estados";
import { CONCEPTO_LABEL, formatFecha, nombreProducto } from "@/lib/billing/formato";
import { formatCOP, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ActualizarEstado } from "./actualizar";

export const metadata: Metadata = { title: "Resultado del pago", robots: { index: false } };

const MENSAJE: Record<EstadoPago, { titulo: string; texto: string; icono: typeof Clock; fondo: string }> = {
  pendiente: {
    titulo: "Estamos esperando la confirmación",
    texto: "La pasarela aún no nos confirma el pago. Puede tardar unos segundos; actualiza para ver el estado.",
    icono: Clock,
    fondo: "bg-sol-300",
  },
  aprobado: {
    titulo: "¡Pago aprobado!",
    texto: "Tus beneficios ya están activos.",
    icono: CheckCircle2,
    fondo: "bg-success-50",
  },
  fallido: {
    titulo: "El pago fue rechazado",
    texto: "No se hizo ningún cobro. Puedes intentarlo de nuevo cuando quieras.",
    icono: XCircle,
    fondo: "bg-danger-50",
  },
  anulado: {
    titulo: "El pago fue anulado",
    texto: "Esta transacción ya no es válida y no genera cobro.",
    icono: XCircle,
    fondo: "bg-canvas",
  },
  reembolsado: {
    titulo: "Pago reembolsado",
    texto: "Devolvimos este pago y los beneficios asociados terminaron.",
    icono: RotateCcw,
    fondo: "bg-canvas",
  },
};

export default async function ResultadoPagoPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref = "" } = await searchParams;
  const destino = `/pagos/resultado?ref=${encodeURIComponent(ref)}`;
  const sesion = await getUsuario();
  if (!sesion) redirect(`/login?next=${encodeURIComponent(destino)}`);

  const pago = ref ? await getPagoPorReferencia(ref) : null;
  if (!pago || pago.propietario_id !== sesion.user.id) notFound();

  const m = MENSAJE[pago.estado];
  const Icono = m.icono;
  const info = ESTADO_PAGO_INFO[pago.estado];
  const pasarela = getPasarelaSegura();
  const urlCheckout =
    pago.estado === "pendiente" && pasarela && pasarela.id === pago.proveedor
      ? (
          await pasarela.crearCheckout({
            referencia: pago.referencia,
            montoCop: pago.monto,
            descripcion: nombreProducto(pago.producto),
            urlRetorno: destino,
          })
        ).url
      : null;
  const requiereReembolso = pago.metadata?.requiere_reembolso === true;
  const destacada = pago.concepto === "vacante_destacada";

  return (
    <div className="container-page max-w-2xl py-12 sm:py-16">
      <div className="card-pop overflow-hidden">
        <div className={cn("flex items-center gap-4 border-b-2 border-ink p-6", m.fondo)}>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border-2 border-ink bg-surface">
            <Icono className="h-7 w-7 text-ink" aria-hidden="true" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink" role="status">
              {m.titulo}
            </h1>
            <p className="text-sm text-ink-soft">
              {requiereReembolso
                ? "El pago se aprobó, pero la vacante ya no estaba publicada. Revisaremos tu caso para hacer el reembolso."
                : m.texto}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-6 text-sm">
          <dt className="text-muted">Producto</dt>
          <dd className="text-right font-bold text-ink">{nombreProducto(pago.producto)}</dd>
          <dt className="text-muted">Concepto</dt>
          <dd className="text-right text-ink">{CONCEPTO_LABEL[pago.concepto]}</dd>
          <dt className="text-muted">Referencia</dt>
          <dd className="text-right font-mono text-xs font-semibold text-ink">{pago.referencia}</dd>
          <dt className="text-muted">Fecha</dt>
          <dd className="text-right text-ink">{formatFecha(pago.aprobado_en ?? pago.creado_en)}</dd>
          <dt className="text-muted">Monto (IVA incluido)</dt>
          <dd className="text-right font-display text-lg font-extrabold text-ink">{formatCOP(pago.monto)}</dd>
          <dt className="text-muted">Estado</dt>
          <dd className="text-right">
            <Badge tone={info.tono}>{info.label}</Badge>
          </dd>
        </dl>

        <div className="flex flex-wrap gap-2 border-t-2 border-ink bg-canvas p-6">
          {pago.estado === "pendiente" && <ActualizarEstado />}
          {urlCheckout && (
            <Link href={urlCheckout} className={buttonVariants({ variant: "accent" })}>
              Volver al pago
            </Link>
          )}
          {pago.estado === "aprobado" && (
            <Link href={destacada ? "/empresa/panel" : "/planes"} className={buttonVariants({ variant: "primary" })}>
              {destacada ? "Ver mis vacantes" : "Ver mi plan"}
            </Link>
          )}
          {pago.estado === "fallido" && (
            <Link href={destacada ? "/planes?audiencia=empresa#destacar" : "/planes"} className={buttonVariants({ variant: "primary" })}>
              Intentar de nuevo
            </Link>
          )}
          <Link href="/pagos" className={buttonVariants({ variant: "ghost" })}>
            Mis pagos
          </Link>
        </div>
      </div>
    </div>
  );
}
