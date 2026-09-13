import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, IdCard, Lock, Sparkles } from "lucide-react";
import { getUsuario, getCandidato } from "@/lib/auth";
import { getBeneficiosCandidato } from "@/lib/billing/suscripciones";
import { getHojasAprobadas } from "@/lib/data/hoja-de-vida";
import { getPerfilLinkedIn } from "@/lib/data/linkedin";
import { cuotaUsadaMes } from "@/lib/ia/uso";
import { resumenCuota } from "@/lib/ia/cuota";
import { PLAN_NOMBRE } from "@/lib/constants";
import { experienciasLinkedInATexto, listaATexto } from "@/lib/hv-texto";
import { buttonVariants } from "@/components/ui/button";
import { CopyButton } from "@/components/hv/copy-button";
import { AprobarContenido } from "@/components/hv/aprobar-hv";
import { AvisoValidacion, EstadoContenidoBadge } from "@/components/hv/estado-badge";
import type { ContenidoLinkedIn } from "@/lib/ia/tipos";
import type { BloqueLinkedIn } from "@/lib/actions/linkedin";
import { LinkedinPanel } from "./linkedin-panel";

export const metadata: Metadata = {
  title: "Optimiza tu LinkedIn",
  description: "Titular, “Acerca de” y más para tu perfil de LinkedIn, redactados solo con tu información real.",
  robots: { index: false },
};

// Las server actions de generación corren desde esta ruta y pueden tardar.
export const maxDuration = 300;

export default async function LinkedinPage() {
  const candidato = await getCandidato();
  if (!candidato) {
    const sesion = await getUsuario();
    if (sesion?.tipo === "empresa") redirect("/empresa/panel");
    redirect("/login?next=/linkedin");
  }

  const { plan, beneficios } = await getBeneficiosCandidato(candidato.id);
  if (beneficios.linkedin === "no") return <Upsell />;
  const nivel = beneficios.linkedin;

  const [perfil, aprobadas, usadas] = await Promise.all([
    getPerfilLinkedIn(candidato.id),
    getHojasAprobadas(candidato.id),
    cuotaUsadaMes(candidato.id, "linkedin_generar"),
  ]);
  const cuota = resumenCuota(usadas, beneficios.generacionesLinkedinMes);
  const contenido: ContenidoLinkedIn | null = perfil
    ? nivel === "avanzado"
      ? perfil.contenido
      : { titular: perfil.contenido.titular, acerca: perfil.contenido.acerca }
    : null;

  const bloques: { bloque: BloqueLinkedIn; titulo: string; texto: string }[] = contenido
    ? [
        { bloque: "titular" as const, titulo: "Titular", texto: contenido.titular },
        { bloque: "acerca" as const, titulo: "Acerca de", texto: contenido.acerca },
        { bloque: "titulares_alternativos" as const, titulo: "Titulares alternativos", texto: listaATexto(contenido.titulares_alternativos) },
        { bloque: "habilidades" as const, titulo: "Habilidades priorizadas", texto: listaATexto(contenido.habilidades, ", ") },
        { bloque: "experiencias" as const, titulo: "Descripción por experiencia", texto: experienciasLinkedInATexto(contenido.experiencias) },
        { bloque: "palabras_clave" as const, titulo: "Palabras clave sugeridas", texto: listaATexto(contenido.palabras_clave, ", ") },
      ].filter((b) => b.texto.trim())
    : [];

  return (
    <div className="container-page space-y-8 py-8">
      <header className="space-y-3">
        <span className="kicker">
          <IdCard className="h-4 w-4" /> {nivel === "avanzado" ? "LinkedIn avanzado" : "LinkedIn básico"} · {PLAN_NOMBRE[plan]}
        </span>
        <h1 className="max-w-2xl font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Tu LinkedIn, listo para que te encuentren
        </h1>
        <p className="max-w-2xl text-lg text-ink-soft">
          Partimos de tu hoja de vida aprobada (o de tu perfil) y redactamos solo con información real. Tú lo revisas y lo apruebas.
        </p>
      </header>

      {perfil && (
        <div className="flex flex-wrap items-center gap-3">
          <EstadoContenidoBadge estado={perfil.estado} />
          <AvisoValidacion estadoIa={perfil.validacion?.estado_ia} graves={perfil.validacion?.graves} />
        </div>
      )}

      <LinkedinPanel
        key={perfil?.actualizado_en ?? "nuevo"}
        nivel={nivel}
        contenido={contenido}
        estado={perfil?.estado ?? null}
        hojas={aprobadas.map((h) => ({ id: h.id, titulo: h.titulo }))}
        fuenteActual={perfil?.hoja_de_vida_id ?? null}
        cuota={cuota}
      />

      {perfil && perfil.estado === "borrador" && <AprobarContenido tipo="linkedin" />}

      {perfil && perfil.estado === "aprobada" && bloques.length > 0 && (
        <section className="space-y-4" aria-labelledby="copiar-linkedin">
          <h2 id="copiar-linkedin" className="font-display text-2xl font-extrabold text-ink">
            Copia y pega en LinkedIn
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {bloques.map((b) => (
              <div key={b.bloque} className={`card p-5 ${b.bloque === "acerca" || b.bloque === "experiencias" ? "md:col-span-2" : ""}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="label-base mb-0">{b.titulo}</p>
                  <CopyButton text={b.texto} registro={{ tipo: "linkedin", bloque: b.bloque }} />
                </div>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{b.texto}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Upsell() {
  const basico = ["Titular potente para tu perfil", "Sección “Acerca de” en primera persona"];
  const avanzado = ["3 titulares alternativos", "10 habilidades priorizadas", "Descripción para cada experiencia", "Palabras clave de tu área"];
  return (
    <div className="container-page py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="card-pop overflow-hidden">
          <div className="border-b-2 border-ink bg-sol-300 px-6 py-8 text-center sm:px-10">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-surface">
              <Lock className="h-8 w-8 text-ink" />
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Optimiza tu LinkedIn</h1>
            <p className="mt-3 text-ink-soft">
              Redactamos tu perfil de LinkedIn a partir de tu hoja de vida aprobada, sin inventar nada. Es un beneficio de los planes pagos.
            </p>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2 sm:p-10">
            <Lista titulo={PLAN_NOMBRE.camelleitor} items={basico} />
            <Lista titulo={PLAN_NOMBRE.berraco_pro} items={[...basico, ...avanzado]} destacado />
            <Link href="/planes" className={`${buttonVariants({ variant: "accent", size: "xl", block: true })} sm:col-span-2`}>
              Ver planes <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Lista({ titulo, items, destacado }: { titulo: string; items: string[]; destacado?: boolean }) {
  return (
    <div className={`rounded-2xl border-2 border-ink p-5 ${destacado ? "bg-brand-50" : "bg-surface"}`}>
      <p className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
        {destacado && <Sparkles className="h-4 w-4" />} {titulo}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((t) => (
          <li key={t} className="flex items-start gap-2 text-sm text-ink">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-600" /> {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
