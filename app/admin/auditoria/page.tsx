import Link from "next/link";
import { ChevronRight, ScrollText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";
import { ACTOR_LABEL, ENTIDAD_LABEL, fechaCO, tonoAccion, valorLegible } from "@/components/admin/labels";
import { listarAuditoria, type AuditRow } from "@/lib/data/admin";
import { ACCIONES } from "@/lib/audit";
import { exigirPermiso } from "@/lib/roles";

export const metadata = { title: "Auditoría · Administración" };

type Params = { accion?: string; entidad?: string; entidadId?: string; actor?: string; desde?: string; hasta?: string; cursor?: string };

function Diff({ fila }: { fila: AuditRow }) {
  const claves = [...new Set([...Object.keys(fila.antes ?? {}), ...Object.keys(fila.despues ?? {})])];
  if (!claves.length) return <p className="text-xs text-muted">Sin cambios de campos registrados.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-left text-xs">
        <thead>
          <tr className="border-b-2 border-line uppercase tracking-wide text-muted">
            <th className="py-1.5 pr-3 font-semibold">Campo</th>
            <th className="py-1.5 pr-3 font-semibold">Antes</th>
            <th className="py-1.5 font-semibold">Después</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {claves.map((k) => (
            <tr key={k}>
              <td className="py-1.5 pr-3 font-mono font-semibold text-ink">{k}</td>
              <td className="py-1.5 pr-3 text-danger-600 line-through decoration-danger-500/40">{valorLegible(fila.antes?.[k])}</td>
              <td className="py-1.5 font-semibold text-success-600">{valorLegible(fila.despues?.[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminAuditoriaPage({ searchParams }: { searchParams: Promise<Params> }) {
  await exigirPermiso("ver_auditoria");
  const sp = await searchParams;
  const filtros: Params = {
    accion: (ACCIONES as readonly string[]).includes(sp.accion ?? "") ? sp.accion : undefined,
    entidad: sp.entidad && /^[a-z_]{1,40}$/.test(sp.entidad) ? sp.entidad : undefined,
    entidadId: sp.entidadId?.slice(0, 80) || undefined,
    actor: sp.actor?.slice(0, 120) || undefined,
    desde: sp.desde || undefined,
    hasta: sp.hasta || undefined,
  };
  const { items, siguiente } = await listarAuditoria({ ...filtros, cursor: sp.cursor });

  const qsSiguiente = new URLSearchParams(
    Object.entries({ ...filtros, cursor: siguiente ?? undefined }).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  const qsInicio = new URLSearchParams(
    Object.entries(filtros).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();

  return (
    <main className="space-y-6">
      <PageHeader kicker="Trazabilidad" titulo="Auditoría">
        Registro append-only de mutaciones de negocio: quién, qué, sobre qué, antes y después.
      </PageHeader>

      <Card>
        <CardBody>
          <form action="/admin/auditoria" method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="label-base mb-0">
              Acción
              <select name="accion" defaultValue={filtros.accion ?? ""} className="input-base mt-1 h-10 py-0 text-sm">
                <option value="">Todas</option>
                {ACCIONES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="label-base mb-0">
              Entidad
              <select name="entidad" defaultValue={filtros.entidad ?? ""} className="input-base mt-1 h-10 py-0 text-sm">
                <option value="">Todas</option>
                {Object.entries(ENTIDAD_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v} ({k})
                  </option>
                ))}
              </select>
            </label>
            <label className="label-base mb-0">
              Id de entidad
              <input name="entidadId" defaultValue={filtros.entidadId ?? ""} className="input-base mt-1 h-10 py-0 font-mono text-sm" />
            </label>
            <label className="label-base mb-0">
              Actor (id o correo de staff)
              <input name="actor" defaultValue={filtros.actor ?? ""} className="input-base mt-1 h-10 py-0 text-sm" />
            </label>
            <label className="label-base mb-0">
              Desde
              <input type="date" name="desde" defaultValue={filtros.desde ?? ""} className="input-base mt-1 h-10 py-0 text-sm" />
            </label>
            <label className="label-base mb-0">
              Hasta
              <input type="date" name="hasta" defaultValue={filtros.hasta ?? ""} className="input-base mt-1 h-10 py-0 text-sm" />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
              <button type="submit" className={buttonVariants({ variant: "primary", size: "sm" })}>
                Filtrar
              </button>
              <Link href="/admin/auditoria" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Limpiar
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {items.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-6 w-6" />} title="Sin entradas" description="No hay registros de auditoría con estos filtros." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y-2 divide-line">
            {items.map((f) => (
              <li key={f.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-canvas">
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
                    <Badge tone={tonoAccion(f.accion)} className="font-mono">
                      {f.accion}
                    </Badge>
                    <span className="text-sm text-ink-soft">
                      {ENTIDAD_LABEL[f.entidad] ?? f.entidad}
                      {f.entidad_id && <span className="ml-1 font-mono text-xs text-muted">{f.entidad_id.slice(0, 8)}…</span>}
                    </span>
                    <span className="text-sm text-ink-soft">
                      por <strong className="text-ink">{f.actor_email ?? ACTOR_LABEL[f.actor_tipo] ?? f.actor_tipo}</strong>
                    </span>
                    <span className="ml-auto text-xs text-muted tabular-nums">{fechaCO(f.creado_en, true)}</span>
                  </summary>
                  <div className="space-y-4 border-t-2 border-line bg-canvas px-4 py-4 sm:px-11">
                    <Diff fila={f} />
                    {Object.keys(f.metadata ?? {}).length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Metadata</p>
                        <pre className="overflow-x-auto rounded-xl border-2 border-line bg-surface p-3 text-xs text-ink">
                          {JSON.stringify(f.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                    <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="text-muted">Id</dt>
                        <dd className="font-mono text-ink">{f.id}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted">Actor</dt>
                        <dd className="break-all font-mono text-ink">
                          {ACTOR_LABEL[f.actor_tipo] ?? f.actor_tipo} · {f.actor_id ?? "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted">Entidad</dt>
                        <dd className="break-all font-mono text-ink">
                          {f.entidad} · {f.entidad_id ?? "—"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted">IP</dt>
                        <dd className="font-mono text-ink">{f.ip ?? "—"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-muted">Request id</dt>
                        <dd className="break-all font-mono text-ink">{f.request_id ?? "—"}</dd>
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <dt className="shrink-0 text-muted">User agent</dt>
                        <dd className="break-all text-ink">{f.user_agent ?? "—"}</dd>
                      </div>
                    </dl>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <nav className="flex items-center justify-between gap-3" aria-label="Paginación">
        {sp.cursor ? (
          <Link href={`/admin/auditoria${qsInicio ? `?${qsInicio}` : ""}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Volver a lo más reciente
          </Link>
        ) : (
          <span />
        )}
        {siguiente && (
          <Link href={`/admin/auditoria?${qsSiguiente}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Más antiguos <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </nav>
    </main>
  );
}
