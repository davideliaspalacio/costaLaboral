import { Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Columna } from "@/components/admin/data-table";
import { BarList, SerieBarras } from "@/components/admin/bar-list";
import { PageHeader, RangoFechasForm, StatTile } from "@/components/admin/page-header";
import { planInfo } from "@/components/admin/labels";
import { getUsoIA } from "@/lib/data/metrics";
import { rangoFechas } from "@/lib/data/kpis";
import { exigirPermiso } from "@/lib/roles";
import { formatCOP } from "@/lib/utils";

export const metadata = { title: "Uso de IA · Administración" };

const TRM_DEFAULT = 4000;

const usd = (n: number) =>
  `US$${n.toLocaleString("en-US", { minimumFractionDigits: n > 0 && n < 1 ? 4 : 2, maximumFractionDigits: n > 0 && n < 1 ? 4 : 2 })}`;
const num = (n: number) => n.toLocaleString("es-CO");
const pct = (n: number | null) => (n == null ? "—" : `${n < 10 ? n.toFixed(1) : Math.round(n)}%`);
const ms = (n: number | null) => (n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${Math.round(n)} ms`);

const COL_TOP: Columna[] = [
  { key: "pos", label: "#" },
  { key: "usuario", label: "Usuario" },
  { key: "llamadas", label: "Llamadas", align: "right" },
  { key: "costo", label: "Costo", align: "right" },
];

export default async function AdminIAPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  await exigirPermiso("ver_ia");
  const sp = await searchParams;
  const rango = rangoFechas(sp, 30);
  const trmEnv = Number(process.env.TRM_COP_USD);
  const trm = Number.isFinite(trmEnv) && trmEnv > 0 ? trmEnv : TRM_DEFAULT;
  const { resumen: r, nombres, truncado } = await getUsoIA(rango, trm);

  return (
    <main className="space-y-8">
      <PageHeader kicker="Costos" titulo="Uso de IA">
        Hojas de vida, adaptaciones y LinkedIn generados con IA, desde el registro <code className="font-mono">ia_uso</code>.
        {truncado && " Rango muy amplio: se muestran las 50.000 llamadas más recientes."}
      </PageHeader>

      <RangoFechasForm action="/admin/ia" desde={rango.desdeStr} hasta={rango.hastaStr} />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Costo del periodo" valor={usd(r.costoUsd)} detalle={`${num(r.llamadas)} llamadas`} tono="sol" />
        <StatTile
          label="Costo en COP (estimación)"
          valor={formatCOP(Math.round(r.costoCop))}
          detalle={`TRM ${num(trm)} COP/USD${process.env.TRM_COP_USD ? "" : " (valor por defecto)"} · estimado`}
        />
        <StatTile label="Costo promedio por generación" valor={r.costoPromedioUsd == null ? "—" : usd(r.costoPromedioUsd)} />
        <StatTile label="Latencia" valor={ms(r.latenciaMediaMs)} detalle={`p95: ${ms(r.latenciaP95Ms)}`} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tokens de entrada" valor={num(r.tokens.input)} />
        <StatTile label="Tokens de salida" valor={num(r.tokens.output)} />
        <StatTile label="Caché: escritura" valor={num(r.tokens.cacheCreacion)} />
        <StatTile label="Caché: lectura" valor={num(r.tokens.cacheLectura)} />
      </section>

      <section aria-label="Tasas de falla" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Error" valor={pct(r.tasas.error)} tono={(r.tasas.error ?? 0) > 5 ? "danger" : "surface"} />
        <StatTile
          label="Validación fallida"
          valor={pct(r.tasas.validacionFallida)}
          tono={(r.tasas.validacionFallida ?? 0) > 5 ? "danger" : "surface"}
        />
        <StatTile label="Refusal (rechazo del modelo)" valor={pct(r.tasas.rechazo)} />
        <StatTile
          label="Sin credenciales"
          valor={pct(r.tasas.sinCredenciales)}
          detalle="Llamadas sin API key configurada."
          tono={(r.tasas.sinCredenciales ?? 0) > 0 ? "danger" : "surface"}
        />
      </section>

      <SerieBarras
        titulo="Costo por día"
        descripcion="Últimos 30 días hasta el final del rango."
        total={usd(r.porDia.reduce((s, d) => s + d.costoUsd, 0))}
        datos={r.porDia.map((d) => ({ fecha: d.fecha, valor: d.costoUsd, texto: `${usd(d.costoUsd)} · ${d.llamadas} llamadas` }))}
      />

      <section className="grid gap-6 lg:grid-cols-3">
        <BarList
          titulo="Por feature"
          items={r.porFeature.map((g) => ({ clave: g.clave, label: g.clave, valor: g.costoUsd, texto: usd(g.costoUsd), detalle: `${num(g.llamadas)} llamadas` }))}
        />
        <BarList
          titulo="Por modelo"
          descripcion="Pedido → servido."
          items={r.porModelo.map((g) => ({
            clave: g.clave,
            label: g.pedido === g.servido ? g.pedido : `${g.pedido} → ${g.servido}`,
            valor: g.costoUsd,
            texto: usd(g.costoUsd),
            detalle: `${num(g.llamadas)} llamadas`,
          }))}
        />
        <BarList
          titulo="Por plan"
          items={r.porPlan.map((g) => ({
            clave: g.clave,
            label: g.clave === "sin_plan" ? "Sin plan registrado" : planInfo(g.clave).label,
            valor: g.costoUsd,
            texto: usd(g.costoUsd),
            detalle: `${num(g.llamadas)} llamadas`,
          }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink">
          <Sparkles className="h-5 w-5 text-accent-600" /> Top 10 usuarios por costo
        </h2>
        {r.topUsuarios.length === 0 ? (
          <Card className="p-6 text-sm text-muted">Sin uso de IA en el periodo.</Card>
        ) : (
          <DataTable columnas={COL_TOP} hayFilas>
            {r.topUsuarios.map((u, i) => (
              <tr key={u.actorId} className="hover:bg-canvas">
                <td className="px-4 py-3 text-muted tabular-nums">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-ink">{nombres[u.actorId] ?? "Cuenta eliminada"}</span>
                  <span className="block font-mono text-xs text-muted">{u.actorId}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-ink-soft">{num(u.llamadas)}</td>
                <td className="px-4 py-3 text-right">
                  <Badge tone={i === 0 ? "sol" : "neutral"} className="tabular-nums">
                    {usd(u.costoUsd)}
                  </Badge>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </section>
    </main>
  );
}
