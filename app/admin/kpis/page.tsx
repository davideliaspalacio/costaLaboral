import { KpiCard, SEMAFORO_INFO } from "@/components/admin/kpi-card";
import { PageHeader, RangoFechasForm } from "@/components/admin/page-header";
import { fechaCO } from "@/components/admin/labels";
import { getKpis } from "@/lib/data/metrics";
import { rangoFechas, type Semaforo } from "@/lib/data/kpis";
import { exigirPermiso } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const metadata = { title: "KPIs · Administración" };

export default async function AdminKpisPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  await exigirPermiso("ver_kpis");
  const sp = await searchParams;
  const rango = rangoFechas(sp, 30);
  const { kpis, truncado, generadoEn } = await getKpis(rango);

  const resumen = (["verde", "amarillo", "rojo", "sin_datos"] as Semaforo[]).map((s) => ({
    s,
    n: kpis.filter((k) => k.semaforo === s).length,
  }));

  return (
    <main className="space-y-6">
      <PageHeader kicker="Hipótesis del MVP" titulo="KPIs">
        Del {fechaCO(rango.desde.toISOString())} al {fechaCO(rango.hasta.toISOString())} (hora de Bogotá). Calculado{" "}
        {fechaCO(generadoEn, true)}.
      </PageHeader>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <RangoFechasForm action="/admin/kpis" desde={rango.desdeStr} hasta={rango.hastaStr} />
        <ul className="flex flex-wrap gap-2" aria-label="Resumen del semáforo">
          {resumen.map(({ s, n }) => (
            <li key={s} className="chip text-xs">
              <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full border border-ink", SEMAFORO_INFO[s].punto)} />
              {SEMAFORO_INFO[s].label} <span className="tabular-nums">{n}</span>
            </li>
          ))}
        </ul>
      </div>

      {truncado && (
        <p className="rounded-xl border-2 border-ink bg-sol-100 px-4 py-2 text-sm text-ink">
          El rango es muy amplio: alguna consulta alcanzó su tope de filas y el resultado es aproximado. Reduce el rango.
        </p>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <KpiCard key={k.id} kpi={k} />
        ))}
      </section>

      <p className="text-xs text-muted">
        Semáforo: verde cumple la meta; amarillo está a ≤ 25 % de la meta (≤ 50 % por encima en tiempos, ≥ la mitad del
        mínimo en rangos); rojo por debajo. Los KPIs de WhatsApp requieren la integración del proveedor (sección 9).
      </p>
    </main>
  );
}
