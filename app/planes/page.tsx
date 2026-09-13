import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Check, Filter, Megaphone, Minus, ShieldCheck, Sparkles, Star, Users, Download } from "lucide-react";
import { getUsuario } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_EMPRESA_NOMBRE, PLAN_NOMBRE, type PlanId } from "@/lib/constants";
import { BENEFICIOS_CANDIDATO, BENEFICIOS_EMPRESA, type BeneficiosCandidato } from "@/lib/entitlements";
import { PRODUCTOS, PRODUCTOS_DESTACADA, type ProductoCodigo } from "@/lib/billing/catalogo";
import { getBeneficiosCandidato, getBeneficiosEmpresa, type Suscripcion } from "@/lib/billing/suscripciones";
import { contarDestacadasIncluidasUsadasMes } from "@/lib/billing/servicio";
import { puedeRecomprarMismoPlan } from "@/lib/billing/estados";
import { formatFecha } from "@/lib/billing/formato";
import { formatCOP, cn } from "@/lib/utils";
import { estaDestacada } from "@/lib/vacante";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ComprarBoton } from "./plan-cta";
import { PlanActual } from "./plan-actual";
import { DestacarForm } from "./destacar-form";

export const metadata: Metadata = {
  title: "Planes y precios",
  description:
    "Ver vacantes, postular y ver tu match es gratis siempre. Planes opcionales para candidatos y herramientas para empresas, sin comisión por contratación.",
};

type Audiencia = "candidato" | "empresa";
type Sesion = Awaited<ReturnType<typeof getUsuario>>;

export default async function PlanesPage({ searchParams }: { searchParams: Promise<{ audiencia?: string }> }) {
  const sp = await searchParams;
  const sesion = await getUsuario();
  const audiencia: Audiencia =
    sp.audiencia === "empresa" || sp.audiencia === "candidato"
      ? sp.audiencia
      : sesion?.tipo === "empresa"
        ? "empresa"
        : "candidato";

  return (
    <div className="bg-canvas">
      <header className="container-page pb-10 pt-14 text-center sm:pt-20">
        <span className="kicker">Planes y precios</span>
        <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Lo esencial es gratis. Siempre.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-soft">
          Ver vacantes con salario, requisitos y empresa, postularte y ver tu match no cuesta nada. Los planes
          suman herramientas; nunca te quitan el acceso.
        </p>

        <nav aria-label="Tipo de plan" className="mx-auto mt-8 inline-flex rounded-2xl border-2 border-ink bg-surface p-1">
          {(["candidato", "empresa"] as const).map((a) => (
            <Link
              key={a}
              href={a === "empresa" ? "/planes?audiencia=empresa" : "/planes?audiencia=candidato"}
              aria-current={audiencia === a ? "page" : undefined}
              className={cn(
                "rounded-xl px-5 py-2.5 text-sm font-bold transition",
                audiencia === a ? "bg-ink text-canvas" : "text-ink-soft hover:text-ink",
              )}
            >
              {a === "candidato" ? "Candidatos" : "Empresas"}
            </Link>
          ))}
        </nav>
      </header>

      {audiencia === "candidato" ? <SeccionCandidatos sesion={sesion} /> : <SeccionEmpresas sesion={sesion} />}

      <AvisoLegal />
    </div>
  );
}

/* ============================ Candidatos ============================ */

const ORDEN_CANDIDATO: PlanId[] = ["gratis", "camelleitor", "berraco_pro"];
const PRODUCTO_DE_PLAN: Record<Exclude<PlanId, "gratis">, ProductoCodigo> = {
  camelleitor: "plan_camelleitor",
  berraco_pro: "plan_berraco_pro",
};

type Celda = "Sí" | "No" | string;
const FILAS_CANDIDATO: { etiqueta: string; valor: (b: BeneficiosCandidato) => Celda }[] = [
  { etiqueta: "Vacantes, salario, requisitos y empresa", valor: () => "Sí" },
  { etiqueta: "Postulación", valor: () => "Sí" },
  { etiqueta: "Match explicable", valor: () => "Sí" },
  { etiqueta: "Hoja de vida con IA", valor: (b) => (b.cvIa === "preview" ? "Vista previa" : "Sí") },
  {
    etiqueta: "Hoja de vida por vacante",
    valor: (b) => ({ no: "No", reordenar: "Reordenada", reordenar_versiones: "Reordenada + versiones" })[b.cvDinamico],
  },
  { etiqueta: "LinkedIn con IA", valor: (b) => ({ no: "No", basico: "Sí", avanzado: "Avanzado" })[b.linkedin] },
  {
    etiqueta: "Visibilidad ante empresas",
    valor: (b) => ({ base: "Base", mayor: "Mayor", prioritaria: "Prioritaria" })[b.visibilidad],
  },
  {
    etiqueta: "Beneficios de empleabilidad",
    valor: (b) => ({ base: "Base", intermedio: "Intermedios", premium: "Premium" })[b.empleabilidad],
  },
];

const RESUMEN_CANDIDATO: Record<PlanId, string> = {
  gratis: "Todo lo que necesitas para buscar y postularte.",
  camelleitor: PRODUCTOS.plan_camelleitor.descripcion,
  berraco_pro: PRODUCTOS.plan_berraco_pro.descripcion,
};

async function SeccionCandidatos({ sesion }: { sesion: Sesion }) {
  const esCandidato = sesion?.tipo === "candidato";
  const datos = esCandidato ? await getBeneficiosCandidato(sesion.user.id) : null;
  const suscripcion = datos?.suscripcion ?? null;
  const planActual: PlanId = datos?.plan ?? "gratis";

  return (
    <>
      <section className="border-y-2 border-ink bg-surface py-12 sm:py-16">
        <div className="container-page space-y-10">
          {esCandidato && <PlanActual nombrePlan={PLAN_NOMBRE[planActual]} suscripcion={suscripcion} />}

          <div className="grid items-stretch gap-6 lg:grid-cols-3">
            {ORDEN_CANDIDATO.map((id) => {
              const pro = id === "berraco_pro";
              const precio = id === "gratis" ? 0 : PRODUCTOS[PRODUCTO_DE_PLAN[id]].precioCop;
              const dias = id === "gratis" ? null : PRODUCTOS[PRODUCTO_DE_PLAN[id]].periodoDias;
              const b = BENEFICIOS_CANDIDATO[id];
              return (
                <article
                  key={id}
                  className={cn(
                    "relative flex flex-col rounded-2xl border-2 border-ink p-6 sm:p-7",
                    pro ? "bg-sol-100 shadow-[var(--shadow-sticker-lg)]" : "bg-surface",
                  )}
                >
                  {pro && (
                    <span className="absolute -top-3.5 left-6">
                      <Badge tone="accent" className="px-3 py-1">
                        <Star className="h-3.5 w-3.5" aria-hidden="true" /> El más completo
                      </Badge>
                    </span>
                  )}
                  {id === planActual && esCandidato && (
                    <span className="absolute -top-3.5 right-6">
                      <Badge tone="ink" className="px-3 py-1">Tu plan</Badge>
                    </span>
                  )}
                  <h2 className="font-display text-2xl font-extrabold text-ink">{PLAN_NOMBRE[id]}</h2>
                  <p className="mt-1 min-h-10 text-sm text-ink-soft">{RESUMEN_CANDIDATO[id]}</p>
                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="font-display text-4xl font-extrabold text-ink">{precio === 0 ? "$0" : formatCOP(precio)}</span>
                    <span className="text-sm text-muted">{dias ? `/ ${dias} días · IVA incluido` : "para siempre"}</span>
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-soft">
                    <Beneficio>Vacantes completas, postulación y match</Beneficio>
                    <Beneficio>Hoja de vida con IA: {b.cvIa === "preview" ? "vista previa" : `${b.generacionesCvMes} generaciones al mes`}</Beneficio>
                    {b.cvDinamico !== "no" && (
                      <Beneficio>
                        Hoja de vida por vacante {b.cvDinamico === "reordenar_versiones" ? `(hasta ${b.maxVersionesCv} versiones)` : ""}
                      </Beneficio>
                    )}
                    {b.linkedin !== "no" && <Beneficio>LinkedIn con IA {b.linkedin === "avanzado" ? "avanzado" : ""}</Beneficio>}
                    <Beneficio>Visibilidad {FILAS_CANDIDATO[6].valor(b).toLowerCase()} ante empresas</Beneficio>
                  </ul>
                  <div className="mt-7">
                    <CtaCandidato id={id} sesion={sesion} planActual={planActual} suscripcion={suscripcion} destacado={pro} />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="container-page py-14 sm:py-16">
        <p className="kicker">Comparación</p>
        <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink">Qué incluye cada plan</h2>
        <div className="mt-6 overflow-x-auto rounded-2xl border-2 border-ink bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <caption className="sr-only">Beneficios por plan para candidatos</caption>
            <thead>
              <tr className="border-b-2 border-ink bg-canvas">
                <th scope="col" className="px-4 py-4 text-sm font-bold text-muted">Beneficio</th>
                {ORDEN_CANDIDATO.map((id) => (
                  <th key={id} scope="col" className="px-4 py-4 text-center text-sm font-extrabold text-ink">
                    {PLAN_NOMBRE[id]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FILAS_CANDIDATO.map((fila, i) => (
                <tr key={fila.etiqueta} className={cn("border-b border-line last:border-b-0", i < 3 && "bg-brand-50")}>
                  <th scope="row" className="px-4 py-3.5 text-sm font-semibold text-ink">
                    {fila.etiqueta}
                  </th>
                  {ORDEN_CANDIDATO.map((id) => (
                    <td key={id} className="px-4 py-3.5 text-center">
                      <ValorCelda v={fila.valor(BENEFICIOS_CANDIDATO[id])} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-ink bg-canvas">
                <th scope="row" className="px-4 py-3.5 text-sm font-bold text-ink">Precio (IVA incluido)</th>
                {ORDEN_CANDIDATO.map((id) => (
                  <td key={id} className="px-4 py-3.5 text-center text-sm font-extrabold text-ink">
                    {id === "gratis"
                      ? "Gratis"
                      : `${formatCOP(PRODUCTOS[PRODUCTO_DE_PLAN[id]].precioCop)} / ${PRODUCTOS[PRODUCTO_DE_PLAN[id]].periodoDias} días`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
          Las filas resaltadas son gratis para todos y no dependen de ningún plan.
        </p>
      </section>
    </>
  );
}

function CtaCandidato({
  id,
  sesion,
  planActual,
  suscripcion,
  destacado,
}: {
  id: PlanId;
  sesion: Sesion;
  planActual: PlanId;
  suscripcion: Suscripcion | null;
  destacado: boolean;
}) {
  const variante = destacado ? "accent" : "primary";
  if (id === "gratis") {
    if (!sesion) {
      return (
        <Link href="/registro-candidato" className={buttonVariants({ variant: "outline", size: "lg", block: true })}>
          Crear cuenta gratis
        </Link>
      );
    }
    return <NotaCta>{planActual === "gratis" && sesion.tipo === "candidato" ? "Estás usando este plan" : "Incluido siempre"}</NotaCta>;
  }
  if (!sesion) {
    return (
      <Link href="/login?next=/planes" className={buttonVariants({ variant: variante, size: "lg", block: true })}>
        Inicia sesión para elegirlo
      </Link>
    );
  }
  if (sesion.tipo !== "candidato") return <NotaCta>Disponible para cuentas de candidato</NotaCta>;

  const producto = PRODUCTO_DE_PLAN[id];
  if (suscripcion && suscripcion.plan === id) {
    return puedeRecomprarMismoPlan(suscripcion) ? (
      <ComprarBoton producto={producto} label="Renovar ahora" variant={variante} />
    ) : (
      <NotaCta>Activo hasta el {formatFecha(suscripcion.periodo_fin)}</NotaCta>
    );
  }
  const cambio = planActual !== "gratis";
  return (
    <div className="space-y-2">
      <ComprarBoton producto={producto} label={cambio ? `Cambiar a ${PLAN_NOMBRE[id]}` : `Elegir ${PLAN_NOMBRE[id]}`} variant={variante} />
      {cambio && (
        <p className="text-center text-xs text-muted">Reemplaza tu plan actual desde hoy (sin prorrateo del tiempo restante).</p>
      )}
    </div>
  );
}

/* ============================ Empresas ============================ */

async function SeccionEmpresas({ sesion }: { sesion: Sesion }) {
  const esEmpresa = sesion?.tipo === "empresa";
  const pro = PRODUCTOS.plan_empresa_pro;
  const bPro = BENEFICIOS_EMPRESA.pro;

  let datos: Awaited<ReturnType<typeof getBeneficiosEmpresa>> | null = null;
  let vacantes: { id: string; titulo: string; destacadaHasta: string | null }[] = [];
  let verificada = false;
  let cupo = 0;
  if (esEmpresa) {
    const admin = createAdminClient();
    const [beneficios, usadas, { data: empresa }, { data: filas }] = await Promise.all([
      getBeneficiosEmpresa(sesion.user.id),
      contarDestacadasIncluidasUsadasMes(sesion.user.id),
      admin.from("empresas").select("verificada").eq("id", sesion.user.id).maybeSingle(),
      admin
        .from("vacantes")
        .select("id, titulo, destacada_hasta")
        .eq("empresa_id", sesion.user.id)
        .eq("es_publica", true)
        .order("publicada_en", { ascending: false })
        .limit(50),
    ]);
    datos = beneficios;
    verificada = Boolean(empresa?.verificada);
    cupo = Math.max(0, beneficios.beneficios.destacadasIncluidasMes - usadas);
    vacantes = (filas ?? []).map((v) => ({
      id: v.id as string,
      titulo: v.titulo as string,
      destacadaHasta:
        estaDestacada({ destacada_hasta: (v.destacada_hasta as string | null) ?? null })
          ? formatFecha(v.destacada_hasta as string)
          : null,
    }));
  }

  const opciones = PRODUCTOS_DESTACADA.map((c) => ({
    codigo: c,
    dias: PRODUCTOS[c].duracionDias ?? 0,
    precio: formatCOP(PRODUCTOS[c].precioCop),
  }));
  const suscripcion = datos?.suscripcion ?? null;

  return (
    <>
      <section className="border-y-2 border-ink bg-surface py-12 sm:py-16">
        <div className="container-page space-y-10">
          <p className="mx-auto flex max-w-3xl items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-sol-300 px-5 py-3 text-center font-display text-lg font-extrabold text-ink shadow-[var(--shadow-sticker)]">
            No cobramos comisión por contratación ni por número de contrataciones.
          </p>

          {esEmpresa && datos && <PlanActual nombrePlan={PLAN_EMPRESA_NOMBRE[datos.plan]} suscripcion={suscripcion} />}

          <div className="grid items-stretch gap-6 lg:grid-cols-3">
            {/* Publicar gratis */}
            <article className="flex flex-col rounded-2xl border-2 border-ink bg-surface p-6 sm:p-7">
              <h2 className="font-display text-2xl font-extrabold text-ink">Publicar</h2>
              <p className="mt-1 text-sm text-ink-soft">Publica vacantes y recibe candidatos ordenados por match.</p>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-extrabold text-ink">$0</span>
                <span className="text-sm text-muted">siempre</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-soft">
                <Beneficio>Vacantes ilimitadas</Beneficio>
                <Beneficio>Candidatos ordenados por % de match</Beneficio>
                <Beneficio>Pipeline y contacto por WhatsApp</Beneficio>
                <Beneficio>Analítica básica: vistas y postulados</Beneficio>
              </ul>
              <div className="mt-7">
                {esEmpresa ? (
                  <Link href="/empresa/panel" className={buttonVariants({ variant: "outline", size: "lg", block: true })}>
                    Ir a mi panel
                  </Link>
                ) : (
                  <Link href="/registro-empresa" className={buttonVariants({ variant: "outline", size: "lg", block: true })}>
                    Publicar gratis
                  </Link>
                )}
              </div>
            </article>

            {/* Destacada */}
            <article id="destacar" className="flex flex-col rounded-2xl border-2 border-ink bg-surface p-6 sm:p-7">
              <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold text-ink">
                <Megaphone className="h-6 w-6 text-accent-500" aria-hidden="true" /> Vacante destacada
              </h2>
              <p className="mt-1 text-sm text-ink-soft">Tu vacante aparece primero en el portal y en las recomendaciones.</p>
              <ul className="mt-5 space-y-2">
                {opciones.map((o) => (
                  <li key={o.codigo} className="flex items-center justify-between rounded-xl border-2 border-ink bg-canvas px-4 py-2.5">
                    <span className="font-bold text-ink">{o.dias} días</span>
                    <span className="font-display font-extrabold text-ink">{o.precio}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Pago único, IVA incluido. Requiere empresa verificada.</p>
              <div className="mt-6 flex-1">
                {!sesion ? (
                  <Link href="/login?next=/planes?audiencia=empresa" className={buttonVariants({ variant: "accent", size: "lg", block: true })}>
                    Inicia sesión para destacar
                  </Link>
                ) : !esEmpresa ? (
                  <NotaCta>Disponible para cuentas de empresa</NotaCta>
                ) : !verificada ? (
                  <NotaCta>
                    Verifica tu empresa para destacar vacantes.{" "}
                    <Link href="/empresa/panel" className="font-bold text-brand-700 underline">Ir al panel</Link>
                  </NotaCta>
                ) : vacantes.length === 0 ? (
                  <NotaCta>Publica una vacante para poder destacarla.</NotaCta>
                ) : (
                  <DestacarForm vacantes={vacantes} opciones={opciones} cupoIncluido={datos?.plan === "pro" ? cupo : 0} />
                )}
              </div>
            </article>

            {/* Empresa Pro */}
            <article className="relative flex flex-col rounded-2xl border-2 border-ink bg-brand-50 p-6 shadow-[var(--shadow-sticker-lg)] sm:p-7">
              {datos?.plan === "pro" && (
                <span className="absolute -top-3.5 right-6">
                  <Badge tone="ink" className="px-3 py-1">Tu plan</Badge>
                </span>
              )}
              <h2 className="font-display text-2xl font-extrabold text-ink">{pro.nombre}</h2>
              <p className="mt-1 text-sm text-ink-soft">Para equipos que contratan seguido.</p>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-4xl font-extrabold text-ink">{formatCOP(pro.precioCop)}</span>
                <span className="text-sm text-muted">/ {pro.periodoDias} días · IVA incluido</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-soft">
                <Beneficio icono={BarChart3}>Analítica avanzada: embudo, fuentes y distribución de match</Beneficio>
                <Beneficio icono={Filter}>Filtros del pipeline</Beneficio>
                <Beneficio icono={Download}>Exportar candidatos a CSV</Beneficio>
                <Beneficio icono={Users}>Acceso ampliado a candidatos que autorizan ser visibles</Beneficio>
                <Beneficio icono={Sparkles}>{bPro.destacadasIncluidasMes} vacantes destacadas incluidas al mes</Beneficio>
                <li className="flex items-start gap-2.5 text-muted">
                  <Megaphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Publicación en redes sociales <Badge tone="neutral">Próximamente</Badge></span>
                </li>
              </ul>
              <div className="mt-7">
                <CtaEmpresaPro sesion={sesion} suscripcion={suscripcion} />
              </div>
            </article>
          </div>
        </div>
      </section>
      <div className="h-4" />
    </>
  );
}

function CtaEmpresaPro({ sesion, suscripcion }: { sesion: Sesion; suscripcion: Suscripcion | null }) {
  if (!sesion) {
    return (
      <Link href="/login?next=/planes?audiencia=empresa" className={buttonVariants({ variant: "brand", size: "lg", block: true })}>
        Inicia sesión para elegirlo
      </Link>
    );
  }
  if (sesion.tipo !== "empresa") return <NotaCta>Disponible para cuentas de empresa</NotaCta>;
  if (suscripcion && suscripcion.plan === "pro") {
    return puedeRecomprarMismoPlan(suscripcion) ? (
      <ComprarBoton producto="plan_empresa_pro" label="Renovar ahora" variant="brand" />
    ) : (
      <NotaCta>Activo hasta el {formatFecha(suscripcion.periodo_fin)}</NotaCta>
    );
  }
  return <ComprarBoton producto="plan_empresa_pro" label="Elegir Empresa Pro" variant="brand" />;
}

/* ============================ Comunes ============================ */

function Beneficio({ children, icono: Icono = Check }: { children: React.ReactNode; icono?: typeof Check }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icono className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

function NotaCta({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border-2 border-dashed border-ink/40 px-4 py-3 text-center text-sm font-semibold text-ink-soft">
      {children}
    </p>
  );
}

function ValorCelda({ v }: { v: Celda }) {
  if (v === "Sí") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-bold text-success-600">
        <Check className="h-4 w-4" aria-hidden="true" /> Sí
      </span>
    );
  }
  if (v === "No") {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
        <Minus className="h-4 w-4" aria-hidden="true" /> No
      </span>
    );
  }
  return <span className="text-sm font-semibold text-ink">{v}</span>;
}

function AvisoLegal() {
  return (
    <section className="container-page pb-16">
      <div className="card space-y-2 p-5 text-sm text-ink-soft sm:p-6">
        <p>
          <strong className="text-ink">Precios en pesos colombianos (COP), IVA incluido.</strong> Los planes duran el periodo
          indicado. No guardamos tu tarjeta ni hacemos cobros automáticos: cuando tu periodo termina te avisamos y pagas la
          renovación desde <Link href="/pagos" className="font-bold text-brand-700 underline">Mis pagos</Link>. Si cancelas la
          renovación conservas los beneficios hasta la fecha de fin.
        </p>
        <p>
          Derecho de retracto, reversión del pago y reembolsos: consulta los{" "}
          <Link href="/terminos" className="font-bold text-brand-700 underline">Términos y condiciones</Link>.
        </p>
      </div>
    </section>
  );
}
