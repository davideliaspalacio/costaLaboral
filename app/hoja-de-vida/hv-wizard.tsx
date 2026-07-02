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
  Save,
  Trash2,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/hv/copy-button";
import { LinkedInBlock } from "@/components/hv/linkedin-block";
import { crearHojaDeVida, actualizarHojaDeVida } from "@/lib/actions/hoja-de-vida";
import type { ContenidoHV, LinkedInHV } from "@/lib/ai";
import { cvATexto } from "@/lib/hv-texto";

type ExpEntrada = { cargo: string; empresa: string; periodo: string; descripcion: string };

type Props = {
  candidato: { nombre: string; ciudad: string; whatsapp: string; email: string };
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

const HAB_SUGERIDAS = [
  "Atención al cliente",
  "Trabajo en equipo",
  "Puntualidad",
  "Manejo de dinero",
  "Ventas",
  "Excel",
  "Liderazgo",
  "Organización",
];

export function HvWizard({ candidato, sugerencia, onCancelar }: Props) {
  const router = useRouter();
  const [paso, setPaso] = useState(0);

  // Paso 1
  const [cargoObjetivo, setCargoObjetivo] = useState(sugerencia.cargoObjetivo);
  const [aniosExperiencia, setAniosExperiencia] = useState("2");

  // Paso 2
  const [experiencia, setExperiencia] = useState<ExpEntrada[]>([
    { cargo: "", empresa: "", periodo: "", descripcion: sugerencia.experienciaTexto },
  ]);

  // Paso 3
  const [habilidades, setHabilidades] = useState<string[]>([]);
  const [habInput, setHabInput] = useState("");

  // Paso 4
  const [educacion, setEducacion] = useState<string[]>(sugerencia.nivel ? [sugerencia.nivel] : []);
  const [eduInput, setEduInput] = useState("");

  // Resultado
  const [generando, startGenerar] = useTransition();
  const [errorGen, setErrorGen] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    id: string;
    contenido: ContenidoHV;
    linkedin: LinkedInHV;
    generada_por_ia: boolean;
  } | null>(null);

  const progreso = resultado ? 100 : Math.round(((paso + 1) / PASOS.length) * 100);

  function agregarExp() {
    setExperiencia((xs) => [...xs, { cargo: "", empresa: "", periodo: "", descripcion: "" }]);
  }
  function quitarExp(i: number) {
    setExperiencia((xs) => xs.filter((_, idx) => idx !== i));
  }
  function editarExp(i: number, campo: keyof ExpEntrada, valor: string) {
    setExperiencia((xs) => xs.map((e, idx) => (idx === i ? { ...e, [campo]: valor } : e)));
  }

  function agregarHab(valor?: string) {
    const v = (valor ?? habInput).trim();
    if (!v) return;
    setHabilidades((hs) => (hs.some((h) => h.toLowerCase() === v.toLowerCase()) ? hs : [...hs, v]));
    setHabInput("");
  }
  function quitarHab(h: string) {
    setHabilidades((hs) => hs.filter((x) => x !== h));
  }

  function agregarEdu() {
    const v = eduInput.trim();
    if (!v) return;
    setEducacion((es) => [...es, v]);
    setEduInput("");
  }
  function quitarEdu(i: number) {
    setEducacion((es) => es.filter((_, idx) => idx !== i));
  }

  function generar() {
    setErrorGen(null);
    startGenerar(async () => {
      const r = await crearHojaDeVida({
        cargoObjetivo,
        aniosExperiencia: parseInt(aniosExperiencia, 10) || 0,
        experiencia,
        habilidades,
        educacion,
      });
      if ("error" in r) {
        if (r.error === "premium") {
          router.push("/planes");
          return;
        }
        setErrorGen(
          r.error === "sesion"
            ? "Tu sesión expiró. Inicia sesión de nuevo."
            : "No pudimos generar tu hoja de vida. Intenta otra vez.",
        );
        return;
      }
      setResultado({ id: r.id, contenido: r.contenido, linkedin: r.linkedin, generada_por_ia: r.generada_por_ia });
    });
  }

  const puedeAvanzar =
    paso === 0 ? cargoObjetivo.trim().length > 1 : paso === 1 ? experiencia.some((e) => e.cargo || e.descripcion) : true;

  // ------- Vista de RESULTADO (preview editable) -------
  if (resultado) {
    return (
      <ResultadoEditable
        candidato={candidato}
        inicial={resultado}
        onNuevo={() => {
          setResultado(null);
          setPaso(0);
        }}
      />
    );
  }

  // ------- Estado GENERANDO -------
  if (generando) {
    return (
      <div className="card-pop grid place-items-center px-6 py-20 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-ink bg-sol-300">
          <Wand2 className="h-8 w-8 animate-pulse text-ink" />
        </span>
        <h3 className="mt-6 font-display text-2xl font-extrabold text-ink">Generando con IA…</h3>
        <p className="mt-2 max-w-sm text-ink-soft">
          Estamos armando tu hoja de vida y tu perfil de LinkedIn. Dame un momentico, mi llave.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-brand-700">
          <Loader2 className="h-4 w-4 animate-spin" /> Redactando resumen, experiencia y habilidades…
        </div>
      </div>
    );
  }

  // ------- ASISTENTE por pasos -------
  return (
    <div className="card-pop overflow-hidden">
      {/* Barra de progreso + stepper */}
      <div className="border-b-2 border-ink bg-canvas px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <span className="kicker">
            Paso {paso + 1} de {PASOS.length}
          </span>
          <span className="text-sm font-bold text-ink-soft">{progreso}%</span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full border-2 border-ink bg-surface">
          <div
            className="h-full rounded-full bg-accent-500 transition-all duration-300"
            style={{ width: `${progreso}%` }}
          />
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
        {/* PASO 1 */}
        {paso === 0 && (
          <div className="space-y-5">
            <Encabezado
              icon={<Target className="h-5 w-5" />}
              titulo="¿Qué camello estás buscando?"
              texto="Con esto arrancamos tu hoja de vida enfocada en lo que quieres conseguir."
            />
            <Field label="Cargo objetivo" htmlFor="cargo" hint="Ej: Cajero, Auxiliar de bodega, Vendedor">
              <Input
                id="cargo"
                value={cargoObjetivo}
                onChange={(e) => setCargoObjetivo(e.target.value)}
                placeholder="¿A qué cargo le vas a apuntar?"
                autoFocus
              />
            </Field>
            <Field label="Años de experiencia" htmlFor="anios" hint="Si vas empezando, deja 0. ¡Todos arrancamos alguna vez!">
              <Input
                id="anios"
                type="number"
                min={0}
                max={50}
                value={aniosExperiencia}
                onChange={(e) => setAniosExperiencia(e.target.value)}
                className="max-w-32"
              />
            </Field>
          </div>
        )}

        {/* PASO 2 */}
        {paso === 1 && (
          <div className="space-y-5">
            <Encabezado
              icon={<Briefcase className="h-5 w-5" />}
              titulo="Cuéntanos tu experiencia"
              texto="Agrega uno o varios trabajos. Escribe qué hacías con tus palabras; la IA lo pule."
            />
            <div className="space-y-4">
              {experiencia.map((e, i) => (
                <div key={i} className="rounded-2xl border-2 border-ink bg-canvas p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge tone="brand">Trabajo {i + 1}</Badge>
                    {experiencia.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => quitarExp(i)}>
                        <X className="h-4 w-4" /> Quitar
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Cargo" htmlFor={`cargo-${i}`}>
                      <Input
                        id={`cargo-${i}`}
                        value={e.cargo}
                        onChange={(ev) => editarExp(i, "cargo", ev.target.value)}
                        placeholder="Ej: Cajero"
                      />
                    </Field>
                    <Field label="Empresa" htmlFor={`empresa-${i}`}>
                      <Input
                        id={`empresa-${i}`}
                        value={e.empresa}
                        onChange={(ev) => editarExp(i, "empresa", ev.target.value)}
                        placeholder="Ej: Supertienda La 40"
                      />
                    </Field>
                  </div>
                  <Field label="Periodo" htmlFor={`periodo-${i}`} className="mt-3" hint="Ej: 2021 – 2023 o '1 año'">
                    <Input
                      id={`periodo-${i}`}
                      value={e.periodo}
                      onChange={(ev) => editarExp(i, "periodo", ev.target.value)}
                      placeholder="2021 – 2023"
                      className="max-w-60"
                    />
                  </Field>
                  <Field label="¿Qué hacías?" htmlFor={`desc-${i}`} className="mt-3">
                    <Textarea
                      id={`desc-${i}`}
                      value={e.descripcion}
                      onChange={(ev) => editarExp(i, "descripcion", ev.target.value)}
                      placeholder="Ej: atendía a los clientes, manejaba la caja, cuadraba el inventario…"
                    />
                  </Field>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" onClick={agregarExp}>
              <Plus className="h-4 w-4" /> Agregar otro trabajo
            </Button>
          </div>
        )}

        {/* PASO 3 */}
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
                    <button type="button" onClick={() => quitarHab(h)} className="chip bg-brand-100 hover:bg-brand-200">
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

        {/* PASO 4 */}
        {paso === 3 && (
          <div className="space-y-5">
            <Encabezado
              icon={<GraduationCap className="h-5 w-5" />}
              titulo="Tu educación"
              texto="Agrega tus estudios, cursos o el SENA. Uno por línea."
            />
            <div className="flex gap-2">
              <Input
                value={eduInput}
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
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-canvas px-4 py-2.5"
                  >
                    <span className="text-sm font-medium text-ink">{ed}</span>
                    <button type="button" onClick={() => quitarEdu(i)} aria-label="Quitar" className="text-muted hover:text-danger-500">
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

        {/* PASO 5 */}
        {paso === 4 && (
          <div className="space-y-5">
            <Encabezado
              icon={<Wand2 className="h-5 w-5" />}
              titulo="¡Listo para la magia!"
              texto="Revisa el resumen y genera tu hoja de vida + LinkedIn con IA."
            />
            <div className="rounded-2xl border-2 border-ink bg-canvas p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Resumenito etiqueta="Cargo objetivo" valor={cargoObjetivo || "—"} />
                <Resumenito etiqueta="Años de experiencia" valor={aniosExperiencia || "0"} />
                <Resumenito etiqueta="Trabajos" valor={String(experiencia.filter((e) => e.cargo || e.descripcion).length)} />
                <Resumenito etiqueta="Habilidades" valor={String(habilidades.length)} />
                <Resumenito etiqueta="Estudios" valor={String(educacion.length)} />
              </dl>
            </div>
            {errorGen && (
              <p className="rounded-xl border-2 border-ink bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-600">
                {errorGen}
              </p>
            )}
            <Button type="button" variant="accent" size="xl" block onClick={generar}>
              <Wand2 className="h-5 w-5" /> Generar mi hoja de vida con IA
            </Button>
          </div>
        )}
      </div>

      {/* Navegación */}
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
          <Button type="button" variant="outline" onClick={() => setPaso((p) => p - 1)}>
            <ArrowLeft className="h-4 w-4" /> Atrás
          </Button>
        )}
        {paso < PASOS.length - 1 && (
          <Button type="button" variant="primary" disabled={!puedeAvanzar} onClick={() => setPaso((p) => p + 1)}>
            Siguiente <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Sub-componentes ---------------- */

function Encabezado({ icon, titulo, texto }: { icon: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-sol-300 text-ink">
        {icon}
      </span>
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

/* ---------------- Vista previa editable ---------------- */

function ResultadoEditable({
  candidato,
  inicial,
  onNuevo,
}: {
  candidato: { nombre: string; ciudad: string; whatsapp: string; email: string };
  inicial: { id: string; contenido: ContenidoHV; linkedin: LinkedInHV; generada_por_ia: boolean };
  onNuevo: () => void;
}) {
  const router = useRouter();
  const [contenido, setContenido] = useState<ContenidoHV>(inicial.contenido);
  const [linkedin, setLinkedin] = useState<LinkedInHV>(inicial.linkedin);
  const [guardando, startGuardar] = useTransition();
  const [guardado, setGuardado] = useState(false);

  const textoCv = cvATexto(
    candidato.nombre,
    candidato.ciudad,
    { whatsapp: candidato.whatsapp, email: candidato.email },
    contenido,
  );

  function set<K extends keyof ContenidoHV>(k: K, v: ContenidoHV[K]) {
    setContenido((c) => ({ ...c, [k]: v }));
    setGuardado(false);
  }
  function editarLogro(expIdx: number, logroIdx: number, valor: string) {
    setContenido((c) => ({
      ...c,
      experiencia: c.experiencia.map((e, i) =>
        i === expIdx ? { ...e, logros: e.logros.map((l, j) => (j === logroIdx ? valor : l)) } : e,
      ),
    }));
    setGuardado(false);
  }

  function guardar() {
    startGuardar(async () => {
      const r = await actualizarHojaDeVida(inicial.id, {
        contenido,
        linkedin_titular: linkedin.titular,
        linkedin_acerca: linkedin.acerca,
      });
      if ("ok" in r) {
        setGuardado(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Encabezado del resultado */}
      <div className="card-pop bg-brand-50">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-success-500 text-white">
              <PartyPopper className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-xl font-extrabold text-ink">¡Tu hoja de vida está lista!</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Revísala, ajusta lo que quieras y guarda. También te dejamos tu LinkedIn listo para copiar.
              </p>
              <div className="mt-2">
                {inicial.generada_por_ia ? (
                  <Badge tone="sol">
                    <Sparkles className="h-3 w-3" /> Generada con IA
                  </Badge>
                ) : (
                  <Badge tone="neutral">Redactada con plantilla inteligente</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton text={textoCv} label="Copiar hoja de vida" variant="outline" />
            <Button type="button" variant="accent" onClick={guardar} disabled={guardando}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {guardado ? "Guardado ✓" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Vista previa editable del CV */}
      <div className="card-pop">
        <div className="border-b-2 border-ink bg-canvas px-5 py-3 sm:px-6">
          <h4 className="font-display text-lg font-extrabold text-ink">Vista previa editable</h4>
          <p className="text-xs text-muted">Toca cualquier texto para ajustarlo a tu gusto.</p>
        </div>
        <div className="space-y-6 p-5 sm:p-6">
          <CampoEditable
            label="Perfil profesional"
            multiline
            value={contenido.resumen}
            onChange={(v) => set("resumen", v)}
          />

          <ListaEditable
            label="Habilidades"
            items={contenido.habilidades}
            onChange={(v) => set("habilidades", v)}
            placeholder="Agregar habilidad"
          />

          <div>
            <p className="label-base">Experiencia</p>
            <div className="space-y-4">
              {contenido.experiencia.map((e, i) => (
                <div key={i} className="rounded-xl border-2 border-ink bg-canvas p-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      value={e.cargo}
                      onChange={(ev) =>
                        set(
                          "experiencia",
                          contenido.experiencia.map((x, j) => (j === i ? { ...x, cargo: ev.target.value } : x)),
                        )
                      }
                      placeholder="Cargo"
                    />
                    <Input
                      value={e.empresa}
                      onChange={(ev) =>
                        set(
                          "experiencia",
                          contenido.experiencia.map((x, j) => (j === i ? { ...x, empresa: ev.target.value } : x)),
                        )
                      }
                      placeholder="Empresa"
                    />
                    <Input
                      value={e.periodo}
                      onChange={(ev) =>
                        set(
                          "experiencia",
                          contenido.experiencia.map((x, j) => (j === i ? { ...x, periodo: ev.target.value } : x)),
                        )
                      }
                      placeholder="Periodo"
                    />
                  </div>
                  <ul className="mt-3 space-y-2">
                    {e.logros.map((lg, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />
                        <Textarea
                          value={lg}
                          onChange={(ev) => editarLogro(i, j, ev.target.value)}
                          className="min-h-11"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <ListaEditable
            label="Educación"
            items={contenido.educacion}
            onChange={(v) => set("educacion", v)}
            placeholder="Agregar estudio"
          />
          <ListaEditable
            label="Logros y fortalezas"
            items={contenido.logros}
            onChange={(v) => set("logros", v)}
            placeholder="Agregar logro"
          />
        </div>
      </div>

      {/* LinkedIn editable */}
      <div className="card-pop">
        <div className="border-b-2 border-ink bg-canvas px-5 py-3 sm:px-6">
          <h4 className="font-display text-lg font-extrabold text-ink">LinkedIn — edita y copia</h4>
        </div>
        <div className="grid gap-4 p-5 sm:p-6">
          <Field label="Titular" htmlFor="li-titular">
            <Input
              id="li-titular"
              value={linkedin.titular}
              onChange={(e) => {
                setLinkedin((l) => ({ ...l, titular: e.target.value }));
                setGuardado(false);
              }}
            />
          </Field>
          <Field label="Acerca de" htmlFor="li-acerca">
            <Textarea
              id="li-acerca"
              className="min-h-32"
              value={linkedin.acerca}
              onChange={(e) => {
                setLinkedin((l) => ({ ...l, acerca: e.target.value }));
                setGuardado(false);
              }}
            />
          </Field>
        </div>
      </div>

      {/* Vista limpia para copiar */}
      <LinkedInBlock titular={linkedin.titular} acerca={linkedin.acerca} />

      {/* Acciones finales */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onNuevo}>
          <Plus className="h-4 w-4" /> Crear otra hoja de vida
        </Button>
        <div className="flex items-center gap-2">
          <CopyButton text={textoCv} label="Copiar hoja de vida" />
          <Button type="button" variant="accent" onClick={guardar} disabled={guardando}>
            {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {guardado ? "Guardado ✓" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CampoEditable({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <Field label={label}>
      {multiline ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} className="min-h-24" />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

function ListaEditable({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [nuevo, setNuevo] = useState("");
  return (
    <div>
      <p className="label-base">{label}</p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <button
              type="button"
              aria-label="Quitar"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-surface text-muted hover:text-danger-500"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (nuevo.trim()) {
                onChange([...items, nuevo.trim()]);
                setNuevo("");
              }
            }
          }}
          placeholder={placeholder}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (nuevo.trim()) {
              onChange([...items, nuevo.trim()]);
              setNuevo("");
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
