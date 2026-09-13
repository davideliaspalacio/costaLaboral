"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Briefcase,
  Sparkles,
  GraduationCap,
  Wand2,
  Plus,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { generarHojaDeVida } from "@/lib/actions/hoja-de-vida";
import { EntradaHVSchema, limpiarEntrada, primerError } from "@/lib/ia/esquemas";
import type { EntradaHV, ExperienciaEntrada } from "@/lib/ia/tipos";

type Props = {
  /** Sugerencias iniciales derivadas del perfil del candidato. */
  sugerencia: { cargoObjetivo: string; experienciaTexto: string; nivel: string };
  onCancelar?: () => void;
};

const PASOS = [
  { icon: Target, titulo: "Tu objetivo" },
  { icon: Briefcase, titulo: "Experiencia" },
  { icon: Sparkles, titulo: "Habilidades" },
  { icon: GraduationCap, titulo: "Educación" },
  { icon: Wand2, titulo: "Generar" },
] as const;

const HAB_SUGERIDAS = ["Atención al cliente", "Trabajo en equipo", "Puntualidad", "Manejo de dinero", "Ventas", "Excel", "Liderazgo", "Organización"];

const EXP_VACIA: ExperienciaEntrada = { cargo: "", empresa: "", periodo: "", descripcion: "" };

export function HvWizard({ sugerencia, onCancelar }: Props) {
  const router = useRouter();
  const [paso, setPaso] = useState(0);

  const [cargoObjetivo, setCargoObjetivo] = useState(sugerencia.cargoObjetivo);
  const [aniosExperiencia, setAniosExperiencia] = useState("0");
  const [experiencia, setExperiencia] = useState<ExperienciaEntrada[]>([
    { ...EXP_VACIA, descripcion: sugerencia.experienciaTexto },
  ]);
  const [habilidades, setHabilidades] = useState<string[]>([]);
  const [habInput, setHabInput] = useState("");
  const [educacion, setEducacion] = useState<string[]>(sugerencia.nivel ? [sugerencia.nivel] : []);
  const [eduInput, setEduInput] = useState("");

  const [generando, startGenerar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const progreso = Math.round(((paso + 1) / PASOS.length) * 100);

  function entrada(): EntradaHV {
    return limpiarEntrada({
      cargoObjetivo,
      aniosExperiencia: aniosExperiencia.trim() === "" ? Number.NaN : Number(aniosExperiencia),
      experiencia,
      habilidades,
      educacion,
    });
  }

  /** Valida solo los campos del paso actual (el servidor vuelve a validar todo). */
  function errorDelPaso(p: number): string | null {
    const r = EntradaHVSchema.safeParse(entrada());
    if (r.success) return null;
    const campos: Record<number, string[]> = {
      0: ["cargoObjetivo", "aniosExperiencia"],
      1: ["experiencia"],
      2: ["habilidades"],
      3: ["educacion"],
      4: ["cargoObjetivo", "aniosExperiencia", "experiencia", "habilidades", "educacion"],
    };
    const issue = r.error.issues.find((i) => campos[p].includes(String(i.path[0])));
    return issue ? issue.message : null;
  }

  function siguiente() {
    const e = errorDelPaso(paso);
    setError(e);
    if (!e) setPaso((p) => p + 1);
  }

  function editarExp(i: number, campo: keyof ExperienciaEntrada, valor: string) {
    setExperiencia((xs) => xs.map((e, idx) => (idx === i ? { ...e, [campo]: valor } : e)));
  }

  function agregarHab(valor?: string) {
    const v = (valor ?? habInput).trim();
    if (!v) return;
    setHabilidades((hs) => (hs.some((h) => h.toLowerCase() === v.toLowerCase()) ? hs : [...hs, v]));
    setHabInput("");
  }

  function agregarEdu() {
    const v = eduInput.trim();
    if (!v) return;
    setEducacion((es) => [...es, v]);
    setEduInput("");
  }

  function generar() {
    const datos = entrada();
    const r = EntradaHVSchema.safeParse(datos);
    if (!r.success) {
      setError(primerError(r.error));
      return;
    }
    setError(null);
    startGenerar(async () => {
      const res = await generarHojaDeVida(r.data);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      router.push(`/hoja-de-vida/${res.id}`);
      router.refresh();
    });
  }

  if (generando) {
    return (
      <div className="card-pop grid place-items-center px-6 py-20 text-center" role="status" aria-live="polite">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-sol-300">
          <Wand2 className="h-8 w-8 animate-pulse text-ink" />
        </span>
        <h3 className="mt-6 font-display text-2xl font-extrabold text-ink">Redactando tu hoja de vida…</h3>
        <p className="mt-2 max-w-sm text-ink-soft">
          Esto puede tardar hasta un minuto. Después revisamos que no aparezca nada que tú no hayas contado.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-brand-700">
          <Loader2 className="h-4 w-4 animate-spin" /> Trabajando en tu perfil, experiencia y habilidades…
        </div>
      </div>
    );
  }

  const exps = entrada().experiencia;

  return (
    <div className="card-pop overflow-hidden">
      <div className="border-b-2 border-ink bg-canvas px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <span className="kicker">
            Paso {paso + 1} de {PASOS.length}
          </span>
          <span className="text-sm font-bold text-ink-soft">{progreso}%</span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-surface">
          <div className="h-full rounded-full bg-accent-500 transition-all duration-300" style={{ width: `${progreso}%` }} />
        </div>
        <ol className="mt-4 hidden grid-cols-5 gap-2 sm:grid">
          {PASOS.map((p, i) => {
            const Icon = p.icon;
            const activo = i === paso;
            const hecho = i < paso;
            return (
              <li key={p.titulo} className="flex flex-col items-center gap-1.5 text-center">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl border-2 border-ink transition-colors ${
                    activo ? "bg-accent-500 text-white" : hecho ? "bg-brand-500 text-white" : "bg-surface text-ink-soft"
                  }`}
                >
                  {hecho ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className={`text-xs font-bold ${activo ? "text-ink" : "text-muted"}`}>{p.titulo}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="p-5 sm:p-8">
        {paso === 0 && (
          <div className="space-y-5">
            <Encabezado
              icon={<Target className="h-5 w-5" />}
              titulo="¿Qué camello estás buscando?"
              texto="Con esto enfocamos tu hoja de vida en lo que quieres conseguir."
            />
            <Field label="Cargo objetivo" htmlFor="cargo" hint="Ej: Cajero, Auxiliar de bodega, Vendedor">
              <Input
                id="cargo"
                value={cargoObjetivo}
                maxLength={80}
                onChange={(e) => setCargoObjetivo(e.target.value)}
                placeholder="¿A qué cargo le vas a apuntar?"
                autoFocus
              />
            </Field>
            <Field label="Años de experiencia" htmlFor="anios" hint="Si vas empezando, deja 0. ¡Todos arrancamos alguna vez!">
              <Input
                id="anios"
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                value={aniosExperiencia}
                onChange={(e) => setAniosExperiencia(e.target.value)}
                className="max-w-32"
              />
            </Field>
          </div>
        )}

        {paso === 1 && (
          <div className="space-y-5">
            <Encabezado
              icon={<Briefcase className="h-5 w-5" />}
              titulo="Cuéntanos tu experiencia"
              texto="Escribe qué hacías con tus palabras. La IA lo redacta mejor, pero no agrega nada que no cuentes. Si no tienes experiencia, sigue al siguiente paso."
            />
            <div className="space-y-4">
              {experiencia.map((e, i) => (
                <div key={i} className="rounded-2xl border-2 border-ink bg-canvas p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge tone="brand">Trabajo {i + 1}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setExperiencia((xs) => (xs.length > 1 ? xs.filter((_, idx) => idx !== i) : [EXP_VACIA]))}
                    >
                      <X className="h-4 w-4" /> Quitar
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Cargo" htmlFor={`cargo-${i}`}>
                      <Input id={`cargo-${i}`} value={e.cargo} maxLength={80} onChange={(ev) => editarExp(i, "cargo", ev.target.value)} placeholder="Ej: Cajero" />
                    </Field>
                    <Field label="Empresa" htmlFor={`empresa-${i}`}>
                      <Input
                        id={`empresa-${i}`}
                        value={e.empresa}
                        maxLength={80}
                        onChange={(ev) => editarExp(i, "empresa", ev.target.value)}
                        placeholder="Ej: Supertienda La 40"
                      />
                    </Field>
                  </div>
                  <Field label="Periodo" htmlFor={`periodo-${i}`} className="mt-3" hint="Tal como quieres que aparezca. Ej: 2021 – 2023">
                    <Input
                      id={`periodo-${i}`}
                      value={e.periodo}
                      maxLength={40}
                      onChange={(ev) => editarExp(i, "periodo", ev.target.value)}
                      placeholder="2021 – 2023"
                      className="max-w-60"
                    />
                  </Field>
                  <Field label="¿Qué hacías? ¿Qué lograste?" htmlFor={`desc-${i}`} className="mt-3" hint="Si tienes cifras reales (ventas, clientes), inclúyelas aquí: la IA no inventa números.">
                    <Textarea
                      id={`desc-${i}`}
                      value={e.descripcion}
                      maxLength={1200}
                      onChange={(ev) => editarExp(i, "descripcion", ev.target.value)}
                      placeholder="Ej: atendía a los clientes, manejaba la caja, cuadraba el inventario…"
                    />
                  </Field>
                </div>
              ))}
            </div>
            {experiencia.length < 8 && (
              <Button type="button" variant="outline" onClick={() => setExperiencia((xs) => [...xs, EXP_VACIA])}>
                <Plus className="h-4 w-4" /> Agregar otro trabajo
              </Button>
            )}
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-5">
            <Encabezado
              icon={<Sparkles className="h-5 w-5" />}
              titulo="Tus habilidades"
              texto="Agrega lo que sabes hacer. Toca una sugerencia o escribe la tuya y dale Enter."
            />
            <div className="flex gap-2">
              <Input
                value={habInput}
                maxLength={60}
                aria-label="Nueva habilidad"
                onChange={(e) => setHabInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarHab();
                  }
                }}
                placeholder="Ej: Manejo de caja"
              />
              <Button type="button" variant="accent" onClick={() => agregarHab()}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
            {habilidades.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {habilidades.map((h) => (
                  <li key={h}>
                    <button
                      type="button"
                      onClick={() => setHabilidades((hs) => hs.filter((x) => x !== h))}
                      className="chip bg-brand-100 hover:bg-brand-200"
                      aria-label={`Quitar ${h}`}
                    >
                      {h} <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Sugerencias</p>
              <ul className="flex flex-wrap gap-2">
                {HAB_SUGERIDAS.filter((h) => !habilidades.some((x) => x.toLowerCase() === h.toLowerCase())).map((h) => (
                  <li key={h}>
                    <button type="button" onClick={() => agregarHab(h)} className="chip hover:bg-sol-200">
                      <Plus className="h-3.5 w-3.5" /> {h}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-5">
            <Encabezado
              icon={<GraduationCap className="h-5 w-5" />}
              titulo="Tu educación"
              texto="Agrega tus estudios, cursos o el SENA, con el nombre real de la institución."
            />
            <div className="flex gap-2">
              <Input
                value={eduInput}
                maxLength={160}
                aria-label="Nuevo estudio"
                onChange={(e) => setEduInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarEdu();
                  }
                }}
                placeholder="Ej: Bachiller académico — I.E. San José (2020)"
              />
              <Button type="button" variant="accent" onClick={agregarEdu}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>
            {educacion.length > 0 ? (
              <ul className="space-y-2">
                {educacion.map((ed, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-canvas px-4 py-2.5">
                    <span className="text-sm font-medium text-ink">{ed}</span>
                    <button
                      type="button"
                      onClick={() => setEducacion((es) => es.filter((_, idx) => idx !== i))}
                      aria-label="Quitar"
                      className="text-muted hover:text-danger-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Aún no has agregado estudios. Puedes seguir sin agregar ninguno.</p>
            )}
          </div>
        )}

        {paso === 4 && (
          <div className="space-y-5">
            <Encabezado
              icon={<Wand2 className="h-5 w-5" />}
              titulo="¡Listo para redactar!"
              texto="Revisa el resumen y genera tu hoja de vida."
            />
            <div className="rounded-2xl border-2 border-ink bg-canvas p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Resumenito etiqueta="Cargo objetivo" valor={cargoObjetivo || "—"} />
                <Resumenito etiqueta="Años de experiencia" valor={aniosExperiencia || "0"} />
                <Resumenito etiqueta="Trabajos" valor={String(exps.length)} />
                <Resumenito etiqueta="Habilidades" valor={String(habilidades.length)} />
                <Resumenito etiqueta="Estudios" valor={String(educacion.length)} />
              </dl>
            </div>
            <p className="flex items-start gap-2 text-sm text-ink-soft">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              La IA solo usa lo que escribiste. Luego tú revisas, corriges y apruebas antes de usarla.
            </p>
            <Button type="button" variant="accent" size="xl" block onClick={generar}>
              <Wand2 className="h-5 w-5" /> Generar mi hoja de vida
            </Button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-xl border-2 border-ink bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-600">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t-2 border-ink bg-canvas px-5 py-4 sm:px-6">
        {paso === 0 ? (
          onCancelar ? (
            <Button type="button" variant="ghost" onClick={onCancelar}>
              Cancelar
            </Button>
          ) : (
            <span />
          )
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setError(null);
              setPaso((p) => p - 1);
            }}
          >
            <ArrowLeft className="h-4 w-4" /> Atrás
          </Button>
        )}
        {paso < PASOS.length - 1 && (
          <Button type="button" variant="primary" onClick={siguiente}>
            Siguiente <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Encabezado({ icon, titulo, texto }: { icon: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-sol-300 text-ink">{icon}</span>
      <div>
        <h3 className="font-display text-xl font-extrabold text-ink sm:text-2xl">{titulo}</h3>
        <p className="mt-1 text-sm text-ink-soft">{texto}</p>
      </div>
    </div>
  );
}

function Resumenito({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted">{etiqueta}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{valor}</dd>
    </div>
  );
}
