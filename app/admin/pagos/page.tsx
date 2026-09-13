import Link from "next/link";
import { CreditCard, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader, StatTile } from "@/components/admin/page-header";
import { AccionConfirmar } from "@/components/admin/accion-confirmar";
import {
  fechaCO,
  PAGO_CONCEPTO_LABEL,
  PAGO_ESTADO_LABEL,
  PAGO_ESTADO_TONO,
  planInfo,
  SUSCRIPCION_ESTADO_LABEL,
  SUSCRIPCION_ESTADO_TONO,
} from "@/components/admin/labels";
import { getTotalesPagosMes, listarPagos, listarSuscripciones } from "@/lib/data/admin";
import { cancelarSuscripcionDesdeAdmin, reembolsarPagoAdmin } from "@/lib/actions/admin";
import { exigirPermiso, puede } from "@/lib/roles";
import { PRODUCTOS, esProductoCodigo } from "@/lib/billing/catalogo";
import { formatCOP } from "@/lib/utils";

export const metadata = { title: "Pagos · Administración" };

type Params = {
  estado?: string;
  concepto?: string;
  desde?: string;
  hasta?: string;
  page?: string;
  sestado?: string;
  splan?: string;
  spage?: string;
};

const COL_PAGOS: Columna[] = [
  { key: "ref", label: "Referencia" },
  { key: "quien", label: "Propietario" },
  { key: "concepto", label: "Concepto" },
  { key: "monto", label: "Monto", align: "right" },
  { key: "estado", label: "Estado" },
  { key: "fecha", label: "Fecha", align: "right" },
  { key: "accion", label: "", align: "right" },
];

const COL_SUBS: Columna[] = [
  { key: "quien", label: "Propietario" },
  { key: "plan", label: "Plan" },
  { key: "estado", label: "Estado" },
  { key: "fin", label: "Fin del periodo", align: "right" },
  { key: "accion", label: "", align: "right" },
];

const PLANES_FILTRO = ["camelleitor", "berraco_pro", "pro"];

const pick = <T extends string>(v: string | undefined, opciones: readonly T[]) =>
  opciones.includes(v as T) ? (v as T) : undefined;

export default async function AdminPagosPage({ searchParams }: { searchParams: Promise<Params> }) {
  const staff = await exigirPermiso("ver_pagos");
  const sp = await searchParams;
  const estado = pick(sp.estado, Object.keys(PAGO_ESTADO_LABEL));
  const concepto = pick(sp.concepto, Object.keys(PAGO_CONCEPTO_LABEL));
  const sestado = pick(sp.sestado, Object.keys(SUSCRIPCION_ESTADO_LABEL));
  const splan = pick(sp.splan, PLANES_FILTRO);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const spage = Math.max(1, parseInt(sp.spage ?? "1", 10) || 1);

  const [pagos, subs, totales] = await Promise.all([
    listarPagos({ estado, concepto, desde: sp.desde, hasta: sp.hasta, page }),
    listarSuscripciones({ estado: sestado, plan: splan, page: spage }),
    getTotalesPagosMes(),
  ]);
  const puedeReembolsar = puede(staff.rol, "reembolsar");
  const puedeCancelar = puede(staff.rol, "gestionar_usuarios");
  const base = { estado, concepto, desde: sp.desde, hasta: sp.hasta, sestado, splan };

  const mesLabel = new Date(`${totales.mes}-15T12:00:00Z`).toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  return (
    <main className="space-y-8">
      <PageHeader kicker="Monetización" titulo="Pagos y suscripciones">
        Pasarela de pruebas (sandbox) detrás del adaptador de pagos. Los reembolsos y cancelaciones se auditan.
      </PageHeader>

      {/* ---------- Totales del mes ---------- */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={`Aprobado · ${mesLabel}`} valor={formatCOP(totales.total)} detalle={`${totales.cantidad} pagos`} tono="sol" />
        {totales.porConcepto.slice(0, 2).map((c) => (
          <StatTile
            key={c.concepto}
            label={PAGO_CONCEPTO_LABEL[c.concepto] ?? c.concepto}
            valor={formatCOP(c.total)}
            detalle={`${c.cantidad} pagos`}
          />
        ))}
        <StatTile label="Reembolsado este mes" valor={formatCOP(totales.reembolsado)} tono={totales.reembolsado ? "danger" : "surface"} />
      </section>

      {/* ---------- Pagos ---------- */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink">
          <CreditCard className="h-5 w-5 text-brand-600" /> Pagos
        </h2>
        <Card>
          <CardBody>
            <form action="/admin/pagos" method="get" className="flex flex-wrap items-end gap-3">
              {sestado && <input type="hidden" name="sestado" value={sestado} />}
              {splan && <input type="hidden" name="splan" value={splan} />}
              <label className="label-base mb-0">
                Estado
                <select name="estado" defaultValue={estado ?? ""} className="input-base mt-1 h-10 py-0 text-sm">
                  <option value="">Todos</option>
                  {Object.entries(PAGO_ESTADO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label-base mb-0">
                Concepto
                <select name="concepto" defaultValue={concepto ?? ""} className="input-base mt-1 h-10 py-0 text-sm">
                  <option value="">Todos</option>
                  {Object.entries(PAGO_CONCEPTO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label-base mb-0">
                Desde
                <input type="date" name="desde" defaultValue={sp.desde ?? ""} className="input-base mt-1 h-10 py-0 text-sm" />
              </label>
              <label className="label-base mb-0">
                Hasta
                <input type="date" name="hasta" defaultValue={sp.hasta ?? ""} className="input-base mt-1 h-10 py-0 text-sm" />
              </label>
              <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Filtrar
              </button>
              <Link href="/admin/pagos" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Limpiar
              </Link>
            </form>
          </CardBody>
        </Card>

        <DataTable
          columnas={COL_PAGOS}
          hayFilas={pagos.items.length > 0}
          vacio={
            <EmptyState
              icon={<CreditCard className="h-6 w-6" />}
              title="Sin pagos"
              description="No hay pagos con estos filtros."
              className="border-0 bg-transparent py-8 shadow-none"
            />
          }
        >
          {pagos.items.map((p) => (
            <tr key={p.id} className="align-top hover:bg-canvas">
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-ink">{p.referencia}</span>
                <span className="block text-xs text-muted">{p.proveedor}</span>
              </td>
              <td className="px-4 py-3">
                <span className="font-semibold text-ink">{p.propietario_nombre ?? "Cuenta eliminada"}</span>
                <span className="block text-xs capitalize text-muted">{p.propietario_tipo}</span>
              </td>
              <td className="px-4 py-3 text-ink-soft">
                {PAGO_CONCEPTO_LABEL[p.concepto] ?? p.concepto}
                <span className="block text-xs text-muted">
                  {esProductoCodigo(p.producto) ? PRODUCTOS[p.producto].nombre : p.producto}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">{formatCOP(p.monto)}</td>
              <td className="px-4 py-3">
                <Badge tone={PAGO_ESTADO_TONO[p.estado] ?? "neutral"}>{PAGO_ESTADO_LABEL[p.estado] ?? p.estado}</Badge>
              </td>
              <td className="px-4 py-3 text-right text-xs text-muted tabular-nums">{fechaCO(p.aprobado_en ?? p.creado_en, true)}</td>
              <td className="px-4 py-3 text-right">
                {puedeReembolsar && p.estado === "aprobado" && (
                  <AccionConfirmar
                    accion={reembolsarPagoAdmin.bind(null, p.id)}
                    etiqueta="Reembolsar"
                    icono="refund"
                    variante="danger"
                    pregunta={`¿Reembolsar ${formatCOP(p.monto)} (${p.referencia})? Se retirarán los beneficios asociados.`}
                    confirmar="Sí, reembolsar"
                  />
                )}
              </td>
            </tr>
          ))}
        </DataTable>
        <Pagination page={page} totalPaginas={pagos.totalPaginas} basePath="/admin/pagos" baseParams={{ ...base, spage: sp.spage }} />
      </section>

      {/* ---------- Suscripciones ---------- */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink">
          <Repeat className="h-5 w-5 text-brand-600" /> Suscripciones
        </h2>
        <Card>
          <CardBody>
            <form action="/admin/pagos" method="get" className="flex flex-wrap items-end gap-3">
              {Object.entries({ estado, concepto, desde: sp.desde, hasta: sp.hasta }).map(([k, v]) =>
                v ? <input key={k} type="hidden" name={k} value={v} /> : null,
              )}
              <label className="label-base mb-0">
                Estado
                <select name="sestado" defaultValue={sestado ?? ""} className="input-base mt-1 h-10 py-0 text-sm">
                  <option value="">Todos</option>
                  {Object.entries(SUSCRIPCION_ESTADO_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label-base mb-0">
                Plan
                <select name="splan" defaultValue={splan ?? ""} className="input-base mt-1 h-10 py-0 text-sm">
                  <option value="">Todos</option>
                  {PLANES_FILTRO.map((p) => (
                    <option key={p} value={p}>
                      {planInfo(p).label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Filtrar
              </button>
            </form>
          </CardBody>
        </Card>

        <DataTable
          columnas={COL_SUBS}
          hayFilas={subs.items.length > 0}
          vacio={
            <EmptyState
              icon={<Repeat className="h-6 w-6" />}
              title="Sin suscripciones"
              description="No hay suscripciones con estos filtros."
              className="border-0 bg-transparent py-8 shadow-none"
            />
          }
        >
          {subs.items.map((s) => {
            const vigente = s.estado === "active" || s.estado === "past_due";
            const plan = planInfo(s.plan);
            return (
              <tr key={s.id} className="align-top hover:bg-canvas">
                <td className="px-4 py-3">
                  <span className="font-semibold text-ink">{s.propietario_nombre ?? "Cuenta eliminada"}</span>
                  <span className="block text-xs capitalize text-muted">
                    {s.propietario_tipo} · {s.proveedor}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={plan.tone}>{plan.label}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge tone={SUSCRIPCION_ESTADO_TONO[s.estado] ?? "neutral"}>{SUSCRIPCION_ESTADO_LABEL[s.estado] ?? s.estado}</Badge>
                    {s.cancelar_al_final && vigente && <Badge tone="warn">Cancela al final</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-xs text-muted tabular-nums">{fechaCO(s.periodo_fin)}</td>
                <td className="px-4 py-3">
                  {puedeCancelar && vigente && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {!s.cancelar_al_final && (
                        <AccionConfirmar
                          accion={cancelarSuscripcionDesdeAdmin.bind(null, s.id, false)}
                          etiqueta="Cancelar al final"
                          icono="clock"
                          pregunta={`¿Cancelar al final del periodo (${fechaCO(s.periodo_fin)})? Conserva los beneficios hasta entonces.`}
                          confirmar="Programar cancelación"
                        />
                      )}
                      <AccionConfirmar
                        accion={cancelarSuscripcionDesdeAdmin.bind(null, s.id, true)}
                        etiqueta="Cancelar ya"
                        icono="ban"
                        variante="danger"
                        pregunta="¿Cancelar de inmediato? Los beneficios se retiran ahora y no se reembolsa automáticamente."
                        confirmar="Cancelar ahora"
                      />
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
        <Pagination
          page={spage}
          totalPaginas={subs.totalPaginas}
          basePath="/admin/pagos"
          baseParams={{ ...base, page: sp.page }}
          param="spage"
        />
      </section>
    </main>
  );
}
