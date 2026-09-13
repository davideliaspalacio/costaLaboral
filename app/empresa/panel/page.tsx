import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MapPin,
  Pencil,
  Sparkles,
  Users,
} from "lucide-react";
import { getVacantesDeEmpresa } from "@/lib/data/vacantes";
import { destacadasRestantes, evaluarDestacar, requerirEmpresa } from "@/lib/data/empresa";
import { getBeneficiosEmpresa } from "@/lib/billing/suscripciones";
import { contarDestacadasIncluidasUsadasMes } from "@/lib/billing/servicio";
import { PRODUCTOS, PRODUCTOS_DESTACADA } from "@/lib/billing/catalogo";
import { estaDestacada } from "@/lib/vacante";
import { MOTIVOS_CIERRE } from "@/lib/constants";
import { formatCOP, formatSalario } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { Vacante } from "@/lib/types";
import { EmpresaNav } from "../_components/empresa-nav";
import { MODERACION, fechaCorta, labelTipo } from "../_components/etiquetas";
import { AccionesVacante } from "./acciones-vacante";
import { DestacarVacante, type OpcionDestacada } from "./destacar-vacante";

export const metadata: Metadata = { title: "Panel de empresa" };

type VacantePanel = Vacante & { total_postulaciones: number };
type Grupo = "publicadas" | "revision" | "rechazadas" | "borradores" | "pausadas" | "cerradas";

const GRUPOS: { id: Grupo; titulo: string; vacio?: string }[] = [
  { id: "publicadas", titulo: "Publicadas" },
  { id: "revision", titulo: "En revisión" },
  { id: "rechazadas", titulo: "Rechazadas" },
  { id: "borradores", titulo: "Borradores" },
  { id: "pausadas", titulo: "Pausadas" },
  { id: "cerradas", titulo: "Cerradas" },
];

function grupoDe(v: Vacante): Grupo {
  if (v.estado === "borrador") return "borradores";
  if (v.estado === "cerrada") return "cerradas";
  if (v.estado_moderacion === "rechazada") return "rechazadas";
  if (v.estado_moderacion === "pendiente" || v.estado_moderacion === "reportada") return "revision";
  if (v.estado === "pausada") return "pausadas";
  return "publicadas";
}

type Aviso = { tono: "success" | "sol" | "danger"; titulo: string; texto: string };

function avisoDe(sp: Record<string, string | undefined>, verificada: boolean): Aviso | null {
  const extraVerificar = verificada ? "" : " Verifica tu empresa en tu perfil para que tus próximas vacantes salgan sin revisión previa.";
  if (sp.error === "publicar")
    return { tono: "danger", titulo: "No pudimos publicarla", texto: "Guardamos la vacante como borrador. Complétala y vuelve a intentarlo." };
  if (sp.revision)
    return {
      tono: "sol",
      titulo: "En revisión",
      texto: `La publicamos apenas la aprobemos (normalmente el mismo día).${extraVerificar}`,
    };
  if (sp.publicada)
    return { tono: "success", titulo: "¡Vacante publicada!", texto: "Ya está en el portal y avisamos a los candidatos que encajan." };
  if (sp.editada) return { tono: "success", titulo: "Cambios guardados", texto: "La vacante quedó actualizada." };
  if (sp.borrador) return { tono: "success", titulo: "Borrador guardado", texto: "Publícalo cuando esté listo." };
  return null;
}

const FONDO_AVISO = { success: "bg-success-50", sol: "bg-sol-100", danger: "bg-danger-50" } as const;

export default async function PanelEmpresaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const empresa = await requerirEmpresa("/empresa/panel");
  const sp = await searchParams;
  const [vacantes, { plan, beneficios }] = await Promise.all([
    getVacantesDeEmpresa(empresa.id) as Promise<VacantePanel[]>,
    getBeneficiosEmpresa(empresa.id),
  ]);
  const usadas = beneficios.destacadasIncluidasMes > 0 ? await contarDestacadasIncluidasUsadasMes(empresa.id) : 0;
  const incluidasRestantes = destacadasRestantes(beneficios.destacadasIncluidasMes, usadas);
  const opciones: OpcionDestacada[] = PRODUCTOS_DESTACADA.map((c) => ({
    codigo: c,
    nombre: PRODUCTOS[c].nombre,
    precio: formatCOP(PRODUCTOS[c].precioCop),
    dias: PRODUCTOS[c].duracionDias ?? 0,
  }));

  const porGrupo = new Map<Grupo, VacantePanel[]>();
  for (const v of vacantes) porGrupo.set(grupoDe(v), [...(porGrupo.get(grupoDe(v)) ?? []), v]);
  const aviso = avisoDe(sp, empresa.verificada);

  return (
    <div className="container-page py-8 sm:py-12">
      <EmpresaNav empresa={empresa} plan={plan} activo="panel" />

      {aviso && (
        <div role="status" className={`mb-6 flex items-start gap-3 rounded-2xl border-2 border-ink px-5 py-4 text-sm text-ink ${FONDO_AVISO[aviso.tono]}`}>
          {aviso.tono === "sol" ? <Clock className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
          <p>
            <strong>{aviso.titulo}.</strong> {aviso.texto}
          </p>
        </div>
      )}

      {!empresa.verificada && vacantes.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border-2 border-ink bg-brand-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-sm text-ink">
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
            <span>
              <strong>Verifica tu empresa:</strong> publica sin revisión previa, muestra la insignia de confianza y destaca vacantes.
            </span>
          </p>
          <Link href="/empresa/perfil#verificacion" className={buttonVariants({ variant: "brand", size: "sm" })}>
            {empresa.verificacion === "en_revision" ? "Ver estado" : "Verificar empresa"}
          </Link>
        </div>
      )}

      {vacantes.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="Aún no tienes vacantes"
          description="Publica tu primera vacante gratis en menos de 5 minutos."
          action={
            <Link href="/registro-empresa" className={buttonVariants({ variant: "accent", size: "lg" })}>
              Publicar vacante
            </Link>
          }
        />
      ) : (
        <div className="space-y-10">
          {GRUPOS.map((g) => {
            const lista = porGrupo.get(g.id) ?? [];
            if (!lista.length) return null;
            return (
              <section key={g.id} aria-labelledby={`grupo-${g.id}`}>
                <h2 id={`grupo-${g.id}`} className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-ink">
                  {g.titulo}
                  <span className="rounded-full border-2 border-ink bg-surface px-2 text-sm tabular-nums">{lista.length}</span>
                </h2>
                <ul className="space-y-4">
                  {lista.map((v) => (
                    <li key={v.id}>
                      <TarjetaVacante
                        v={v}
                        grupo={g.id}
                        bloqueoDestacar={(() => {
                          const r = evaluarDestacar({ empresaVerificada: empresa.verificada, esPublica: v.es_publica });
                          return r.ok ? null : r.motivo;
                        })()}
                        opciones={opciones}
                        incluidasRestantes={incluidasRestantes}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TarjetaVacante({
  v,
  grupo,
  bloqueoDestacar,
  opciones,
  incluidasRestantes,
}: {
  v: VacantePanel;
  grupo: Grupo;
  bloqueoDestacar: string | null;
  opciones: OpcionDestacada[];
  incluidasRestantes: number;
}) {
  const destacada = estaDestacada(v);
  const mod = MODERACION[v.estado_moderacion];
  const muestraDestacar = grupo === "publicadas" || grupo === "revision";
  return (
    <article className="card-pop p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-lg font-extrabold text-ink">{v.titulo}</h3>
            {v.estado !== "borrador" && v.estado !== "cerrada" && mod && v.estado_moderacion !== "aprobada" && (
              <Badge tone={mod.tono}>{mod.label}</Badge>
            )}
            {destacada && (
              <Badge tone="sol">
                <Sparkles className="h-3 w-3" /> Destacada hasta {fechaCorta(v.destacada_hasta)}
              </Badge>
            )}
            {v.estado === "cerrada" && (
              <Badge tone={v.motivo_cierre === "contratado" ? "success" : "neutral"}>
                {MOTIVOS_CIERRE.find((m) => m.value === v.motivo_cierre)?.label ?? "Cerrada"}
              </Badge>
            )}
          </div>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted" /> {v.ciudad} · {labelTipo(v.tipo)}
            </span>
            <span>{formatSalario(v.salario_min, v.salario_max)}</span>
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-ink">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye className="h-4 w-4 text-muted" /> {v.vistas} vistas
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Users className="h-4 w-4 text-muted" /> {v.total_postulaciones} postulados
            </span>
            {(v.estado === "publicada" || v.estado === "pausada") && (
              <span className="inline-flex items-center gap-1 font-normal text-muted">
                <CalendarClock className="h-4 w-4" /> Vence {fechaCorta(v.expira_en)}
              </span>
            )}
            {v.estado === "borrador" && (
              <span className="inline-flex items-center gap-1 font-normal text-muted">
                <FileText className="h-4 w-4" /> Creado {fechaCorta(v.creado_en)}
              </span>
            )}
          </p>
          {(grupo === "rechazadas" || grupo === "revision") && v.motivo_moderacion && (
            <p className={`rounded-xl border-2 border-ink px-3 py-2 text-sm text-ink ${grupo === "rechazadas" ? "bg-danger-50" : "bg-sol-100"}`}>
              <strong>{grupo === "rechazadas" ? "Motivo del rechazo:" : "Por qué está en revisión:"}</strong> {v.motivo_moderacion}
              {grupo === "rechazadas" && " Edítala para corregirla y la revisamos de nuevo."}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap gap-2">
            {v.estado !== "borrador" && (
              <Link href={`/empresa/vacante/${v.id}`} className={buttonVariants({ variant: "primary", size: "sm" })}>
                <Users className="h-4 w-4" /> Postulados
              </Link>
            )}
            <Link href={`/empresa/vacante/${v.id}/editar`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Pencil className="h-4 w-4" /> Editar
            </Link>
            {v.es_publica && (
              <Link href={`/v/${v.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Ver ficha
              </Link>
            )}
          </div>
          <AccionesVacante vacanteId={v.id} estado={v.estado} />
        </div>
      </div>

      {muestraDestacar && (
        <div className="mt-4 border-t-2 border-dashed border-line pt-4">
          <DestacarVacante
            vacanteId={v.id}
            bloqueo={bloqueoDestacar}
            opciones={opciones}
            incluidasRestantes={incluidasRestantes}
          />
        </div>
      )}
    </article>
  );
}
