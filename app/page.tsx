import Link from "next/link";
import {
  Search,
  MapPin,
  Zap,
  MessageCircle,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  FileCheck2,
  Sparkles,
  Wand2,
  FileText,
  Check,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { VacanteCard } from "@/components/vacante/vacante-card";
import { AREAS, CIUDADES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getVacantesRecientes } from "@/lib/data/vacantes";

export default async function Home() {
  const vacantes = await getVacantesRecientes(6);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="border-b-2 border-ink bg-canvas">
        <div className="container-page grid items-center gap-12 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <span className="kicker">
              <Sparkles className="h-3.5 w-3.5" /> Matching dirigido · no vitrina
            </span>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.95] text-ink sm:text-6xl lg:text-7xl">
              El camello está{" "}
              <span className="relative inline-block">
                <span className="relative z-10">aquí</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 z-0 h-4 -rotate-1 bg-sol-300"
                />
              </span>
              , en la Costa 🌴
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium text-ink-soft">
              Nada de buscar entre mil avisos. Recibes solo las vacantes que encajan con tu perfil
              —tu área, tu ciudad o remotas— directo a tu WhatsApp. Y las empresas publican gratis.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row">
              <Link
                href="/registro-candidato"
                className={cn(buttonVariants({ variant: "primary", size: "xl" }))}
              >
                <Search className="h-5 w-5" /> Buscar camello gratis
              </Link>
              <Link
                href="/registro-empresa"
                className={cn(buttonVariants({ variant: "outline", size: "xl" }))}
              >
                Publicar vacante
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-muted">
              <MessageCircle className="h-4 w-4 text-[#25D366]" />
              Te avisamos por WhatsApp. Sin spam, solo lo que te sirve.
            </p>
          </div>

          {/* Preview del producto — stack de stickers */}
          <div className="relative mx-auto hidden w-full max-w-sm lg:block">
            <div className="rotate-2 rounded-2xl border-2 border-ink bg-surface p-5 shadow-[var(--shadow-sticker-lg)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-extrabold text-ink">Vendedor de mostrador</p>
                  <p className="text-sm font-medium text-muted">Tienda de barrio · Barranquilla</p>
                </div>
                <span className="rounded-full border-2 border-ink bg-success-50 px-2.5 py-1 text-xs font-extrabold text-success-600">
                  100% match
                </span>
              </div>
              <p className="mt-3 font-display text-xl font-extrabold text-ink">$1.300.000 – $1.500.000</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="brand">Ventas</Badge>
                <Badge tone="success">
                  <FileCheck2 className="h-3 w-3" /> Con contrato
                </Badge>
              </div>
            </div>
            <div className="mt-4 -rotate-2 rounded-2xl border-2 border-ink bg-[#25D366] p-4 shadow-[var(--shadow-sticker)]">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-ink" />
                <p className="text-sm font-extrabold text-ink">WhatsApp · CostaLaboral</p>
              </div>
              <p className="mt-2 text-sm font-medium text-ink">
                Parcero, hay una vacante de <b>Vendedor</b> en Barranquilla que encaja contigo. Míralas 👇
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- STATS ---------- */}
      <section className="border-b-2 border-ink bg-sol-300">
        <div className="container-page grid divide-ink sm:grid-cols-3 sm:divide-x-2">
          <Stat valor="429.000" etiqueta="jóvenes buscan empleo en la Costa" />
          <Stat valor="< 5 min" etiqueta="toma publicar una vacante" />
          <Stat valor="100% gratis" etiqueta="para las empresas, siempre" />
        </div>
      </section>

      {/* ---------- CÓMO FUNCIONA ---------- */}
      <section className="container-page py-16 sm:py-20">
        <div className="max-w-2xl">
          <span className="kicker">Cómo funciona</span>
          <h2 className="mt-4 font-display text-4xl font-extrabold text-ink">
            Conectamos a la gente de la Costa con el camello correcto
          </h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Columna
            color="bg-brand-100"
            titulo="Si buscas camello"
            pasos={[
              ["Regístrate en 1 minuto", "Tu área, tu ciudad y tu nivel. Sin hojas de vida eternas."],
              ["Recibe lo que encaja por WhatsApp", "Nada de scroll infinito: solo lo que va con tu perfil."],
              ["Postúlate con un clic", "Aplicas al toque y la empresa te contacta directo."],
            ]}
          />
          <Columna
            color="bg-accent-100"
            titulo="Si buscas gente"
            pasos={[
              ["Publica gratis", "Crea tu vacante en menos de 5 minutos. Siempre gratis."],
              ["Te llegan por % de match", "Vemos ciudad, área y nivel para mostrarte a los que encajan."],
              ["Contáctalos por WhatsApp", "Escríbele al candidato con un botón y arma la entrevista."],
            ]}
          />
        </div>
      </section>

      {/* ---------- VENTAJAS ---------- */}
      <section className="border-y-2 border-ink bg-surface py-16 sm:py-20">
        <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Ventaja color="bg-sol-300" icon={<Zap className="h-6 w-6" />} titulo="Solo lo que encaja" texto="El matching filtra por área, ciudad y nivel. Menos ruido, más camello." />
          <Ventaja color="bg-[#25D366]" icon={<MessageCircle className="h-6 w-6" />} titulo="Directo a tu WhatsApp" texto="Te enteras al instante y contactas sin intermediarios." />
          <Ventaja color="bg-brand-200" icon={<TrendingUp className="h-6 w-6" />} titulo="Ordenado por match" texto="Las empresas ven primero a quien mejor encaja." />
          <Ventaja color="bg-accent-300" icon={<ShieldCheck className="h-6 w-6" />} titulo="Datos protegidos" texto="Conforme a la Ley 1581. Tú decides qué compartes." />
        </div>
      </section>

      {/* ---------- HOJA DE VIDA CON IA (feature destacada) ---------- */}
      <section className="container-page py-16 sm:py-20">
        <div className="grid items-center gap-8 rounded-2xl border-2 border-ink bg-sol-300 p-6 shadow-[var(--shadow-sticker-lg)] sm:p-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="kicker bg-surface">
              <Wand2 className="h-3.5 w-3.5" /> Nuevo · con Inteligencia Artificial
            </span>
            <h2 className="mt-4 font-display text-4xl font-extrabold leading-tight text-ink sm:text-5xl">
              Tu hoja de vida y tu LinkedIn, listos con IA
            </h2>
            <p className="mt-4 text-lg font-medium text-ink-soft">
              Responde unas preguntas y te armamos una hoja de vida profesional y un perfil de
              LinkedIn que sí llama la atención. Crea varias versiones según el camello que busques.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                "Redacción profesional en minutos, sin trabarte",
                "Varias hojas de vida a la medida de cada vacante",
                "Optimiza tu titular y tu 'Acerca de' en LinkedIn",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 font-medium text-ink">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-surface">
                    <Check className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/hoja-de-vida" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                <Wand2 className="h-5 w-5" /> Crear mi hoja de vida
              </Link>
              <Link href="/planes" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Ver planes
              </Link>
            </div>
            <p className="mt-3 text-sm font-semibold text-ink-soft">
              Incluido en los planes Camelleitor y Berraco Pro.
            </p>
          </div>

          {/* Mock del documento */}
          <div className="rotate-1 rounded-2xl border-2 border-ink bg-surface p-6 shadow-[var(--shadow-sticker)]">
            <div className="flex items-center gap-2 border-b-2 border-line pb-3">
              <FileText className="h-5 w-5 text-brand-600" />
              <p className="font-display text-lg font-extrabold text-ink">Hoja de vida · Ventas</p>
              <span className="ml-auto rounded-full border-2 border-ink bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">
                IA
              </span>
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Perfil profesional</p>
            <p className="mt-1 text-sm text-ink-soft">
              Vendedor con 2 años de experiencia en retail. Se destaca por atención al cliente,
              manejo de caja y cumplimiento de metas.
            </p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted">Habilidades</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {["Atención al cliente", "Manejo de caja", "Trabajo en equipo"].map((h) => (
                <span key={h} className="rounded-full border-2 border-ink bg-sol-200 px-2.5 py-0.5 text-xs font-semibold text-ink">
                  {h}
                </span>
              ))}
            </div>
            <div className="mt-4 rounded-xl border-2 border-ink bg-brand-50 p-3">
              <p className="text-xs font-bold text-brand-800">LinkedIn · Titular</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                Vendedor orientado a resultados | Atención al cliente en la Costa 🌴
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- VACANTES RECIENTES ---------- */}
      <section className="container-page py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="kicker">Recién publicadas</span>
            <h2 className="mt-4 font-display text-4xl font-extrabold text-ink">Vacantes en la Costa</h2>
          </div>
          <Link href="/ofertas" className={cn(buttonVariants({ variant: "sol", size: "md" }))}>
            Ver todas las ofertas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {vacantes.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vacantes.map((v) => (
              <VacanteCard key={v.id} vacante={v} empresaNombre={v.empresa?.nombre_negocio} />
            ))}
          </div>
        ) : (
          <div className="mt-8">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="Sé de los primeros"
              description="Todavía no hay vacantes publicadas. Publica la tuya gratis y llega a miles de personas en la Costa."
              action={
                <Link href="/registro-empresa" className={cn(buttonVariants({ variant: "primary", size: "lg" }))}>
                  Publicar vacante gratis
                </Link>
              }
            />
          </div>
        )}
      </section>

      {/* ---------- ÁREAS Y CIUDADES ---------- */}
      <section className="border-t-2 border-ink bg-surface py-16 sm:py-20">
        <div className="container-page space-y-10">
          <div>
            <h2 className="font-display text-3xl font-extrabold text-ink">Camello por área</h2>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {AREAS.map((a) => (
                <li key={a.value}>
                  <Link href="/ofertas" className="chip transition hover:bg-sol-300">
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-3xl font-extrabold text-ink">Camello por ciudad</h2>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {CIUDADES.map((c) => (
                <li key={c}>
                  <Link href="/ofertas" className="chip transition hover:bg-sol-300">
                    <MapPin className="h-4 w-4 text-brand-600" /> {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section className="container-page py-16 sm:py-24">
        <div className="rounded-2xl border-2 border-ink bg-brand-500 px-6 py-14 text-center shadow-[var(--shadow-sticker-lg)] sm:px-12 sm:py-20">
          <h2 className="font-display text-4xl font-extrabold text-white sm:text-5xl">
            ¿Listo para tu próximo camello?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-brand-50">
            Regístrate gratis y empieza a recibir las vacantes que sí van contigo.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Link href="/registro-candidato" className={cn(buttonVariants({ variant: "sol", size: "xl" }))}>
              <Search className="h-5 w-5" /> Buscar camello gratis
            </Link>
            <Link href="/registro-empresa" className={cn(buttonVariants({ variant: "outline", size: "xl" }))}>
              Publicar vacante
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="px-2 py-8 text-center">
      <p className="font-display text-4xl font-extrabold text-ink">{valor}</p>
      <p className="mt-1 text-sm font-semibold text-ink-soft">{etiqueta}</p>
    </div>
  );
}

function Columna({ color, titulo, pasos }: { color: string; titulo: string; pasos: [string, string][] }) {
  return (
    <div className="card-pop overflow-hidden">
      <div className={cn("border-b-2 border-ink px-6 py-4", color)}>
        <h3 className="font-display text-2xl font-extrabold text-ink">{titulo}</h3>
      </div>
      <ol className="divide-y-2 divide-line">
        {pasos.map(([t, d], i) => (
          <li key={t} className="flex gap-4 p-6">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-ink bg-ink font-display text-sm font-extrabold text-canvas">
              {i + 1}
            </span>
            <div>
              <p className="font-bold text-ink">{t}</p>
              <p className="mt-0.5 text-sm text-ink-soft">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Ventaja({ color, icon, titulo, texto }: { color: string; icon: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-canvas p-6">
      <span className={cn("grid h-12 w-12 place-items-center rounded-xl border-2 border-ink text-ink", color)}>
        {icon}
      </span>
      <h3 className="mt-4 font-display text-lg font-extrabold text-ink">{titulo}</h3>
      <p className="mt-1.5 text-sm font-medium text-ink-soft">{texto}</p>
    </div>
  );
}
