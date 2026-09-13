import Link from "next/link";
import {
  Search,
  MapPin,
  ShieldCheck,
  ArrowRight,
  FileCheck2,
  Sparkles,
  Wand2,
  Eye,
  Scale,
  Building2,
  HandCoins,
  Check,
  IdCard,
  Star,
  BadgeCheck,
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
              <MapPin className="h-3.5 w-3.5" /> Barranquilla · Cartagena · Santa Marta
            </span>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[0.95] text-ink sm:text-6xl lg:text-7xl">
              El camello está{" "}
              <span className="relative inline-block">
                <span className="relative z-10">aquí</span>
                <span aria-hidden className="absolute inset-x-0 bottom-1 z-0 h-4 -rotate-1 bg-sol-300" />
              </span>
              , en la Costa
            </h1>
            <p className="mt-6 max-w-xl text-lg font-medium text-ink-soft">
              CostaLaboral conecta a candidatos y empresas del Caribe. Vacantes abiertas con empresa y
              salario a la vista, postulación gratis y un match que te explica por qué encajas.
            </p>
            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row">
              <Link href="/ofertas" className={buttonVariants({ variant: "primary", size: "xl" })}>
                <Search className="h-5 w-5" /> Ver ofertas
              </Link>
              <Link href="/registro-empresa" className={buttonVariants({ variant: "outline", size: "xl" })}>
                Publicar vacante gratis
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-muted">
              <ShieldCheck className="h-4 w-4 text-brand-600" />
              No somos agencia de colocación ni cobramos comisión por contratación.
            </p>
          </div>

          {/* Preview del producto — stack de stickers */}
          <div className="relative mx-auto hidden w-full max-w-sm lg:block" aria-hidden>
            <div className="rotate-2 rounded-2xl border-2 border-ink bg-surface p-5 shadow-[var(--shadow-sticker-lg)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-lg font-extrabold text-ink">Vendedor de mostrador</p>
                  <p className="flex items-center gap-1 text-sm font-medium text-muted">
                    Almacén El Progreso <BadgeCheck className="h-4 w-4 text-brand-600" /> · Barranquilla
                  </p>
                </div>
                <span className="rounded-full border-2 border-ink bg-success-50 px-2.5 py-1 text-xs font-extrabold text-success-600">
                  90 match
                </span>
              </div>
              <p className="mt-3 font-display text-xl font-extrabold text-ink">$1.300.000 – $1.500.000</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="brand">Ventas</Badge>
                <Badge tone="outline">Tiempo completo</Badge>
                <Badge tone="success">
                  <FileCheck2 className="h-3 w-3" /> Con contrato
                </Badge>
              </div>
            </div>
            <div className="mt-4 -rotate-2 rounded-2xl border-2 border-ink bg-brand-100 p-4 shadow-[var(--shadow-sticker)]">
              <p className="text-xs font-extrabold uppercase tracking-wide text-ink">Por qué encajas</p>
              <ul className="mt-2 space-y-1 text-sm font-medium text-ink">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> Vives en Barranquilla · 40/40
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> Tu área es Ventas · 30/30
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> Cumples el nivel mínimo · 20/20
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- PROMESAS ---------- */}
      <section className="border-b-2 border-ink bg-sol-300">
        <div className="container-page grid divide-ink sm:grid-cols-3 sm:divide-x-2">
          <Stat valor="Gratis" etiqueta="postularte a cualquier vacante" />
          <Stat valor="100% abiertas" etiqueta="empresa, salario y requisitos a la vista" />
          <Stat valor="0% comisión" etiqueta="por contratación, nunca" />
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
              ["Mira todas las ofertas", "Sin registrarte ves la empresa, el salario y los requisitos."],
              ["Crea tu perfil gratis", "Tu ciudad, tu área, tu nivel y tu disponibilidad. En un minuto."],
              ["Postúlate y entiende tu match", "Te mostramos cómo encajas, factor por factor. Postular no cuesta nada."],
            ]}
          />
          <Columna
            color="bg-accent-100"
            titulo="Si buscas gente"
            pasos={[
              ["Publica gratis", "Crea tu vacante en minutos. Verifica tu empresa para generar confianza."],
              ["Recibe postulados ordenados", "Ves a cada candidato con su match explicado por ciudad, área, educación y disponibilidad."],
              ["Contacta y decide tú", "Mueve a cada persona por tu proceso. La contratación es entre ustedes."],
            ]}
          />
        </div>
      </section>

      {/* ---------- VENTAJAS ---------- */}
      <section className="border-y-2 border-ink bg-surface py-16 sm:py-20">
        <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Ventaja
            color="bg-sol-300"
            icon={<Eye className="h-6 w-6" />}
            titulo="Todo a la vista"
            texto="Empresa, salario, requisitos y descripción completos para todos."
          />
          <Ventaja
            color="bg-brand-200"
            icon={<Scale className="h-6 w-6" />}
            titulo="Match explicable"
            texto="Reglas claras: ciudad, área, educación y disponibilidad. Es una orientación, no una promesa."
          />
          <Ventaja
            color="bg-accent-300"
            icon={<HandCoins className="h-6 w-6" />}
            titulo="Sin comisiones"
            texto="No somos agencia de colocación. No cobramos por contratar ni por postular."
          />
          <Ventaja
            color="bg-brand-100"
            icon={<ShieldCheck className="h-6 w-6" />}
            titulo="Datos protegidos"
            texto="Conforme a la Ley 1581 de 2012. Tú decides qué compartes."
          />
        </div>
      </section>

      {/* ---------- HERRAMIENTAS OPCIONALES ---------- */}
      <section className="container-page py-16 sm:py-20">
        <div className="max-w-2xl">
          <span className="kicker">
            <Sparkles className="h-3.5 w-3.5" /> Opcional
          </span>
          <h2 className="mt-4 font-display text-4xl font-extrabold text-ink">Herramientas para ir más lejos</h2>
          <p className="mt-3 text-lg font-medium text-ink-soft">
            Lo esencial es gratis. Si quieres un empujón extra, tienes herramientas pagas opcionales.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Herramienta
            color="bg-sol-300"
            icon={<Wand2 className="h-6 w-6" />}
            titulo="Hoja de vida con IA"
            texto="Redacta tu hoja de vida y adáptala a cada vacante. Tú revisas y apruebas."
            href="/hoja-de-vida"
          />
          <Herramienta
            color="bg-brand-200"
            icon={<IdCard className="h-6 w-6" />}
            titulo="Perfil de LinkedIn"
            texto="Titular y 'Acerca de' listos para copiar a tu perfil."
            href="/linkedin"
          />
          <Herramienta
            color="bg-accent-300"
            icon={<Star className="h-6 w-6" />}
            titulo="Vacantes destacadas"
            texto="Las empresas pueden destacar una vacante para que aparezca primero."
            href="/planes"
          />
          <Herramienta
            color="bg-brand-100"
            icon={<Building2 className="h-6 w-6" />}
            titulo="Empresa Pro"
            texto="Más herramientas para empresas que contratan seguido."
            href="/planes"
          />
        </div>
        <div className="mt-8">
          <Link href="/planes" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Ver planes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ---------- VACANTES RECIENTES ---------- */}
      <section className="border-t-2 border-ink bg-canvas py-16 sm:py-20">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="kicker">Recién publicadas</span>
              <h2 className="mt-4 font-display text-4xl font-extrabold text-ink">Vacantes en la Costa</h2>
            </div>
            <Link href="/ofertas" className={buttonVariants({ variant: "sol", size: "md" })}>
              Ver todas las ofertas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {vacantes.length > 0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vacantes.map((v) => (
                <VacanteCard key={v.id} vacante={v} />
              ))}
            </div>
          ) : (
            <div className="mt-8">
              <EmptyState
                icon={<Sparkles className="h-6 w-6" />}
                title="Sé de los primeros"
                description="Todavía no hay vacantes publicadas. Publica la tuya gratis y llega a la gente de la Costa."
                action={
                  <Link href="/registro-empresa" className={buttonVariants({ variant: "primary", size: "lg" })}>
                    Publicar vacante gratis
                  </Link>
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* ---------- ÁREAS Y CIUDADES ---------- */}
      <section className="border-t-2 border-ink bg-surface py-16 sm:py-20">
        <div className="container-page space-y-10">
          <div>
            <h2 className="font-display text-3xl font-extrabold text-ink">Camello por área</h2>
            <ul className="mt-6 flex flex-wrap gap-2.5">
              {AREAS.map((a) => (
                <li key={a.value}>
                  <Link href={`/ofertas?area=${a.value}`} className="chip transition hover:bg-sol-300">
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
                  <Link href={`/ofertas?ciudad=${encodeURIComponent(c)}`} className="chip transition hover:bg-sol-300">
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
          <h2 className="font-display text-4xl font-extrabold text-white sm:text-5xl">¿Listo para tu próximo camello?</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-brand-50">
            Crea tu perfil gratis, mira cómo encajas con cada vacante y postúlate sin costo.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Link href="/registro-candidato" className={buttonVariants({ variant: "sol", size: "xl" })}>
              Crear mi perfil gratis
            </Link>
            <Link href="/registro-empresa" className={buttonVariants({ variant: "outline", size: "xl" })}>
              Soy empresa
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
      <span className={cn("grid h-12 w-12 place-items-center rounded-xl border-2 border-ink text-ink", color)}>{icon}</span>
      <h3 className="mt-4 font-display text-lg font-extrabold text-ink">{titulo}</h3>
      <p className="mt-1.5 text-sm font-medium text-ink-soft">{texto}</p>
    </div>
  );
}

function Herramienta({
  color,
  icon,
  titulo,
  texto,
  href,
}: {
  color: string;
  icon: React.ReactNode;
  titulo: string;
  texto: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border-2 border-ink bg-surface p-6 transition-all duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-sticker-lg)]"
    >
      <span className={cn("grid h-12 w-12 place-items-center rounded-xl border-2 border-ink text-ink", color)}>{icon}</span>
      <h3 className="mt-4 font-display text-lg font-extrabold text-ink">{titulo}</h3>
      <p className="mt-1.5 flex-1 text-sm font-medium text-ink-soft">{texto}</p>
      <span className="mt-4 text-sm font-bold text-brand-700 group-hover:underline">Conocer →</span>
    </Link>
  );
}
