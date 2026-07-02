import Link from "next/link";
import {
  Users,
  Building2,
  Briefcase,
  Send,
  Eye,
  TrendingUp,
  MessageCircle,
  BadgeCheck,
  ShieldAlert,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/admin/metric-card";
import { EventosPorTipoChart, SerieDiariaChart } from "@/components/admin/eventos-chart";
import { ActividadFeed } from "@/components/admin/actividad-feed";
import { getMetricas } from "@/lib/data/metrics";
import { getMetricasAvanzadas, getEventosRecientes } from "@/lib/data/admin";

export const metadata = { title: "Resumen · Administración" };

export default async function AdminResumenPage() {
  const [metricas, avanzadas, eventos] = await Promise.all([
    getMetricas(),
    getMetricasAvanzadas(),
    getEventosRecientes(12),
  ]);

  const hoy = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pendientes = avanzadas.empresasPendientes + avanzadas.vacantesPendientes + avanzadas.vacantesReportadas;

  return (
    <main className="space-y-10">
      {/* ---------- CABECERA ---------- */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="kicker">Panel interno</span>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Resumen de la plataforma
          </h1>
          <p className="mt-1 text-sm capitalize text-ink-soft">{hoy}</p>
        </div>
        {pendientes > 0 && (
          <div className="flex flex-wrap gap-2">
            {avanzadas.empresasPendientes > 0 && (
              <Link href="/admin/empresas" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <BadgeCheck className="h-4 w-4" /> {avanzadas.empresasPendientes} por verificar
              </Link>
            )}
            {avanzadas.vacantesPendientes + avanzadas.vacantesReportadas > 0 && (
              <Link href="/admin/vacantes?estado=reportada" className={buttonVariants({ variant: "outline", size: "sm" })}>
                <ShieldAlert className="h-4 w-4" />{" "}
                {avanzadas.vacantesPendientes + avanzadas.vacantesReportadas} por moderar
              </Link>
            )}
          </div>
        )}
      </header>

      {/* ---------- MÉTRICAS ---------- */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard
            icon={<Users className="h-5 w-5" />}
            label="Candidatos registrados"
            valor={metricas.candidatos.toLocaleString("es-CO")}
            valorNumerico={metricas.candidatos}
            meta={1000}
            metaCorta={200}
          />
          <MetricCard
            icon={<Building2 className="h-5 w-5" />}
            label="Empresas"
            valor={metricas.empresas.toLocaleString("es-CO")}
            valorNumerico={metricas.empresas}
            meta={100}
            metaCorta={25}
          />
          <MetricCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Vacantes activas"
            valor={metricas.vacantesActivas.toLocaleString("es-CO")}
            valorNumerico={metricas.vacantesActivas}
            meta={150}
            metaCorta={30}
          />
          <MetricCard
            icon={<Send className="h-5 w-5" />}
            label="Postulaciones"
            valor={metricas.postulaciones.toLocaleString("es-CO")}
            valorNumerico={metricas.postulaciones}
          />
          <MetricCard
            icon={<MessageCircle className="h-5 w-5" />}
            label="CTR WhatsApp"
            valor={`${metricas.ctr}%`}
            valorNumerico={metricas.ctr}
            meta={30}
            metaCorta={25}
            sufijo="%"
          />
          <MetricCard
            icon={<Eye className="h-5 w-5" />}
            label="Vistas promedio por vacante"
            valor={metricas.vistasPromedio.toLocaleString("es-CO")}
            valorNumerico={metricas.vistasPromedio}
            meta={40}
            metaCorta={15}
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Ratio candidatos / vacante"
            valor={`${metricas.ratioCandidatosVacante}x`}
            valorNumerico={metricas.ratioCandidatosVacante}
            meta={5}
            metaCorta={3}
            sufijo="x"
          />
          <MetricCard
            icon={<Activity className="h-5 w-5" />}
            label="Eventos (14 días)"
            valor={avanzadas.serie14d.reduce((s, d) => s + d.total, 0).toLocaleString("es-CO")}
            valorNumerico={avanzadas.serie14d.reduce((s, d) => s + d.total, 0)}
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          Metas de la fase 1 (sección 7.1). El porcentaje y la barra comparan el valor actual con la
          meta a 90 días.
        </p>
      </section>

      {/* ---------- GRÁFICOS ---------- */}
      <section className="grid gap-6 lg:grid-cols-2">
        <SerieDiariaChart datos={avanzadas.serie14d} />
        <EventosPorTipoChart datos={avanzadas.eventosPorTipo} />
      </section>

      {/* ---------- FEED DE ACTIVIDAD ---------- */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-ink bg-brand-50 text-brand-600">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                Actividad reciente
              </h2>
              <p className="text-sm text-ink-soft">Últimos eventos de toda la plataforma.</p>
            </div>
          </div>
          <Link
            href="/admin/actividad"
            className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-800 hover:underline"
          >
            Ver todo <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <Card className="overflow-hidden">
          <ActividadFeed eventos={eventos} />
        </Card>
      </section>

      {/* ---------- WHATSAPP ---------- */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-ink bg-brand-50 text-brand-600">
              <MessageCircle className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">
                Notificaciones WhatsApp
              </h2>
              <p className="text-sm text-ink-soft">Envío manual en fase 1 (hipótesis H3).</p>
            </div>
          </div>
          <Badge tone="brand" className="tabular-nums">
            {metricas.notifLeidas.toLocaleString("es-CO")} / {metricas.notifEnviadas.toLocaleString("es-CO")} leídas
          </Badge>
        </div>
        <Card className="p-5 sm:p-6">
          <p className="text-sm text-ink-soft">
            La cola de mensajes por enviar y su gestión detallada están en la vista de{" "}
            <Link href="/admin/actividad" className="font-bold text-brand-700 hover:underline">
              actividad
            </Link>
            . CTR actual: <strong className="text-ink tabular-nums">{metricas.ctr}%</strong>.
          </p>
        </Card>
      </section>
    </main>
  );
}
