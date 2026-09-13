import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Eye, MousePointerClick, Timer, Users } from "lucide-react";
import { formatHoras, getAnaliticaEmpresa, requerirEmpresa, type Reparto } from "@/lib/data/empresa";
import { getBeneficiosEmpresa } from "@/lib/billing/suscripciones";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { EmpresaNav } from "../_components/empresa-nav";
import { UpsellPro } from "../_components/upsell-pro";
import { LABEL_FUENTE, labelEstadoVacante } from "../_components/etiquetas";

export const metadata: Metadata = { title: "Analítica de empresa" };

const pct = (v: number | null) => (v == null ? "—" : `${v}%`);

function Kpi({ icon: Icon, label, valor, nota }: { icon: typeof Eye; label: string; valor: string; nota?: string }) {
  return (
    <div className="card-pop p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-ink-soft">
        <Icon className="h-4 w-4" /> {label}
      </p>
      <p className="mt-2 font-display text-3xl font-extrabold tabular-nums text-ink">{valor}</p>
      {nota && <p className="mt-1 text-xs text-muted">{nota}</p>}
    </div>
  );
}

function Barras({ titulo, filas }: { titulo: string; filas: { label: string; cantidad: number; porcentaje: number }[] }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 font-display text-lg font-extrabold text-ink">{titulo}</h3>
      <ul className="space-y-3">
        {filas.map((f) => (
          <li key={f.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold text-ink">{f.label}</span>
              <span className="tabular-nums text-ink-soft">
                {f.cantidad} · {f.porcentaje}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-canvas">
              <div className="h-full bg-brand-500" style={{ width: `${f.porcentaje}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const repartoFuentes = (r: Reparto[]) => r.map((x) => ({ label: LABEL_FUENTE[x.clave] ?? x.clave, cantidad: x.cantidad, porcentaje: x.porcentaje }));

export default async function AnaliticaPage() {
  const empresa = await requerirEmpresa("/empresa/analitica");
  const { plan, beneficios } = await getBeneficiosEmpresa(empresa.id);
  const avanzadaOn = beneficios.analitica === "avanzada";
  const { basica, avanzada } = await getAnaliticaEmpresa(empresa.id, avanzadaOn);

  return (
    <div className="container-page py-8 sm:py-12">
      <EmpresaNav empresa={empresa} plan={plan} activo="analitica" titulo="Analítica" kicker={empresa.nombre_negocio} />

      {basica.vacantes.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title="Sin datos todavía"
          description="Publica una vacante para empezar a medir vistas y postulaciones."
          action={
            <Link href="/registro-empresa" className={buttonVariants({ variant: "accent" })}>
              Publicar vacante
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          <section className="grid gap-4 sm:grid-cols-3">
            <Kpi icon={Eye} label="Vistas" valor={basica.totalVistas.toLocaleString("es-CO")} />
            <Kpi icon={Users} label="Postulaciones" valor={basica.totalPostulaciones.toLocaleString("es-CO")} nota="Sin contar retiradas" />
            <Kpi icon={MousePointerClick} label="Conversión" valor={pct(basica.conversion)} nota="Postulaciones por cada vista" />
          </section>

          <section aria-labelledby="por-vacante">
            <h2 id="por-vacante" className="mb-4 font-display text-xl font-extrabold text-ink">
              Por vacante
            </h2>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b-2 border-ink bg-canvas text-left">
                  <tr>
                    <th className="px-4 py-3 font-bold">Vacante</th>
                    <th className="px-4 py-3 font-bold">Estado</th>
                    <th className="px-4 py-3 text-right font-bold">Vistas</th>
                    <th className="px-4 py-3 text-right font-bold">Postulaciones</th>
                    <th className="px-4 py-3 text-right font-bold">Conversión</th>
                  </tr>
                </thead>
                <tbody>
                  {basica.vacantes.map((v) => (
                    <tr key={v.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/empresa/vacante/${v.id}`} className="font-semibold text-ink hover:underline">
                          {v.titulo}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="outline">{labelEstadoVacante(v.estado)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{v.vistas}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{v.postulaciones}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{pct(v.conversion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="avanzada" className="space-y-4">
            <h2 id="avanzada" className="font-display text-xl font-extrabold text-ink">
              Analítica avanzada
            </h2>
            {!avanzada ? (
              <UpsellPro
                titulo="Embudo, fuentes y calidad de candidatos"
                descripcion="Con Empresa Pro ves el embudo por estado, de dónde llegan tus candidatos, la distribución de score y cuánto tardas en recibir la primera postulación."
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Kpi
                    icon={Timer}
                    label="Tiempo a la primera postulación"
                    valor={formatHoras(avanzada.medianaHorasPrimeraPostulacion)}
                    nota="Mediana entre vacantes publicadas"
                  />
                  <Kpi icon={Users} label="Vacantes con al menos 1 postulación" valor={pct(avanzada.vacantesConPostulacion)} />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Barras
                    titulo="Embudo (etapa alcanzada)"
                    filas={avanzada.embudo.map((p) => ({ label: p.label, cantidad: p.cantidad, porcentaje: p.porcentaje }))}
                  />
                  <Barras
                    titulo="Distribución de score"
                    filas={avanzada.distribucionScore.map((r) => ({ label: `${r.clave}%`, cantidad: r.cantidad, porcentaje: r.porcentaje }))}
                  />
                  <Barras titulo="Fuentes de las vistas" filas={repartoFuentes(avanzada.fuentesVistas)} />
                  <Barras titulo="Fuentes de las postulaciones" filas={repartoFuentes(avanzada.fuentesPostulaciones)} />
                </div>
                <div className="card p-5">
                  <h3 className="mb-3 font-display text-lg font-extrabold text-ink">Estado actual de las postulaciones</h3>
                  <ul className="flex flex-wrap gap-2">
                    {avanzada.porEstado.map((e) => (
                      <li key={e.estado} className="chip tabular-nums">
                        {e.label}: {e.cantidad}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
