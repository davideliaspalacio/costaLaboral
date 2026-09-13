import Link from "next/link";
import type { ReactNode } from "react";
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
  Flag,
  Inbox,
  AlarmClock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/admin/metric-card";
import { PageHeader } from "@/components/admin/page-header";
import { EventosPorTipoChart, SerieDiariaChart } from "@/components/admin/eventos-chart";
import { ActividadFeed } from "@/components/admin/actividad-feed";
import { getColasPendientes, getMetricas } from "@/lib/data/metrics";
import { getMetricasAvanzadas, getEventosRecientes } from "@/lib/data/admin";
import { exigirPermiso, puede } from "@/lib/roles";
import { cn } from "@/lib/utils";

export const metadata = { title: "Resumen · Administración" };

function ColaCard({
  href,
  icon,
  label,
  total,
  urgente,
  detalle,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  total: number;
  urgente?: boolean;
  detalle: string;
}) {
  const activa = total > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group card flex items-center gap-4 p-4 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker-lg)]",
        activa && "shadow-[var(--shadow-sticker)]",
        activa && urgente ? "bg-danger-50" : activa ? "bg-sol-100" : "bg-surface",
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border-2 border-ink",
          activa && urgente ? "bg-danger-500 text-white" : activa ? "bg-sol-400 text-ink" : "bg-canvas text-muted",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-ink">{label}</span>
        <span className="block text-xs text-ink-soft">{detalle}</span>
      </span>
      <span className="font-display text-3xl font-extrabold text-ink tabular-nums">{total}</span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted group-hover:text-ink" />
    </Link>
  );
}

export default async function AdminResumenPage() {
  const staff = await exigirPermiso("ver");
  const [metricas, avanzadas, eventos, colas] = await Promise.all([
    getMetricas(),
    getMetricasAvanzadas(),
    getEventosRecientes(12),
    getColasPendientes(),
  ]);

  const hoy = new Date().toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const eventos14d = avanzadas.serie14d.reduce((s, d) => s + d.total, 0);

  const puedeModerar = puede(staff.rol, "moderar");
  const puedeVerificar = puede(staff.rol, "verificar");
  const puedeSolicitudes = puede(staff.rol, "atender_solicitudes");

  return (
    <main className="space-y-10">
      <PageHeader kicker="Panel interno" titulo="Resumen de la plataforma">
        <span className="capitalize">{hoy}</span>
      </PageHeader>

      {/* ---------- COLAS PENDIENTES ---------- */}
      <section aria-labelledby="colas">
        <h2 id="colas" className="mb-3 font-display text-lg font-bold tracking-tight text-ink">
          Pendientes
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {puedeModerar && (
            <>
              <ColaCard
                href="/admin/vacantes"
                icon={<ShieldAlert className="h-5 w-5" />}
                label="Vacantes en revisión"
                total={colas.vacantesRevision}
                detalle="Empresas sin verificar o contenido sospechoso."
              />
              <ColaCard
                href="/admin/reportes"
                icon={<Flag className="h-5 w-5" />}
                label="Vacantes reportadas"
                total={colas.vacantesReportadas}
                urgente
                detalle={`${colas.reportesAbiertos} reportes abiertos en total.`}
              />
            </>
          )}
          {puedeVerificar && (
            <ColaCard
              href="/admin/empresas"
              icon={<BadgeCheck className="h-5 w-5" />}
              label="Verificaciones en revisión"
              total={colas.verificacionesRevision}
              detalle="Empresas que pidieron verificarse."
            />
          )}
          {puedeSolicitudes && (
            <>
              <ColaCard
                href="/admin/solicitudes"
                icon={<AlarmClock className="h-5 w-5" />}
                label="Solicitudes por vencer"
                total={colas.solicitudesPorVencer}
                detalle="Vencen en 3 días hábiles o menos."
              />
              <ColaCard
                href="/admin/solicitudes"
                icon={<Inbox className="h-5 w-5" />}
                label="Solicitudes vencidas"
                total={colas.solicitudesVencidas}
                urgente
                detalle="Plazo legal superado (Ley 1581)."
              />
            </>
          )}
        </div>
      </section>

      {/* ---------- MÉTRICAS ---------- */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard
            icon={<Users className="h-5 w-5" />}
            label={`Candidatos (${avanzadas.candidatosActivos.toLocaleString("es-CO")} activos)`}
            valor={metricas.candidatos.toLocaleString("es-CO")}
            valorNumerico={metricas.candidatos}
            meta={1000}
            metaCorta={200}
          />
          <MetricCard
            icon={<Building2 className="h-5 w-5" />}
            label={`Empresas (${avanzadas.empresasVerificadas.toLocaleString("es-CO")} verificadas)`}
            valor={metricas.empresas.toLocaleString("es-CO")}
            valorNumerico={metricas.empresas}
            meta={100}
            metaCorta={25}
          />
          <MetricCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Vacantes visibles en el portal"
            valor={metricas.vacantesPublicas.toLocaleString("es-CO")}
            valorNumerico={metricas.vacantesPublicas}
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
            icon={<Eye className="h-5 w-5" />}
            label="Vistas promedio por vacante visible"
            valor={metricas.vistasPromedio.toLocaleString("es-CO")}
            valorNumerico={metricas.vistasPromedio}
            meta={40}
            metaCorta={15}
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Candidatos por vacante visible"
            valor={`${metricas.ratioCandidatosVacante}x`}
            valorNumerico={metricas.ratioCandidatosVacante}
            meta={5}
            metaCorta={3}
            sufijo="x"
          />
          <MetricCard
            icon={<MessageCircle className="h-5 w-5" />}
            label={`Avisos WhatsApp marcados leídos (${metricas.notifLeidas}/${metricas.notifEnviadas}, envío manual)`}
            valor={`${metricas.lecturaNotif}%`}
            valorNumerico={metricas.lecturaNotif}
          />
          <MetricCard
            icon={<Activity className="h-5 w-5" />}
            label="Eventos (14 días)"
            valor={eventos14d.toLocaleString("es-CO")}
            valorNumerico={eventos14d}
          />
        </div>
        <p className="mt-3 text-xs text-muted">
          Metas de volumen de la fase 1. Los KPIs de producto con semáforo están en{" "}
          {puede(staff.rol, "ver_kpis") ? (
            <Link href="/admin/kpis" className="font-bold text-brand-700 hover:underline">
              KPIs
            </Link>
          ) : (
            "KPIs"
          )}
          .
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
              <h2 className="font-display text-lg font-bold tracking-tight text-ink">Actividad reciente</h2>
              <p className="text-sm text-ink-soft">Últimos eventos de producto.</p>
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
          <ActividadFeed eventos={eventos.items} />
        </Card>
      </section>
    </main>
  );
}
