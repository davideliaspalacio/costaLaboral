"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, BadgeCheck, Briefcase, Building2, ClipboardCheck, Clock } from "lucide-react";
import { enviarWizard, type WizardState } from "@/lib/actions/empresa";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { CIUDADES, SECTORES } from "@/lib/constants";
import { revisarContenidoVacante } from "@/lib/moderacion";
import { cn, formatSalario } from "@/lib/utils";
import { CamposVacante } from "@/app/empresa/_components/campos-vacante";
import {
  labelArea,
  labelDisponibilidad,
  labelModalidad,
  labelNivel,
  labelTipo,
} from "@/app/empresa/_components/etiquetas";

const PASOS = [
  { titulo: "Tu negocio", icon: Building2 },
  { titulo: "La vacante", icon: Briefcase },
  { titulo: "Revisión", icon: ClipboardCheck },
] as const;

type EmpresaResumen = { nombre_negocio: string; verificada: boolean };

function BotonesEnvio({ yaEsEmpresa }: { yaEsEmpresa: boolean }) {
  const { pending, data } = useFormStatus();
  const intent = data?.get("intent");
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row">
      <Button type="submit" name="intent" value="borrador" variant="outline" size="lg" disabled={pending}>
        {pending && intent === "borrador" ? "Guardando…" : "Guardar borrador"}
      </Button>
      <Button type="submit" name="intent" value="publicar" variant="accent" size="lg" disabled={pending}>
        {pending && intent !== "borrador" ? (yaEsEmpresa ? "Publicando…" : "Creando cuenta…") : "Publicar vacante"}
      </Button>
    </div>
  );
}

const num = (v: string | undefined) => {
  const n = parseInt(String(v ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

export function Wizard({ yaEsEmpresa, empresa }: { yaEsEmpresa: boolean; empresa: EmpresaResumen | null }) {
  const [state, action] = useActionState<WizardState, FormData>(enviarWizard, null);
  const [paso, setPaso] = useState(yaEsEmpresa ? 1 : 0);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // Si el servidor devuelve un error de otro paso, vuelve a ese paso.
  const [ultimoState, setUltimoState] = useState(state);
  if (state !== ultimoState) {
    setUltimoState(state);
    if (state?.paso != null) setPaso(state.paso === 0 && yaEsEmpresa ? 1 : state.paso);
  }

  function leer(): Record<string, string> {
    const fd = new FormData(formRef.current!);
    const out: Record<string, string> = {};
    fd.forEach((v, k) => {
      if (typeof v === "string") out[k] = v.trim();
    });
    return out;
  }

  function validar(p: number, f: Record<string, string>): string | null {
    if (p === 0 && !yaEsEmpresa) {
      if (!f.nombre_negocio) return "Escribe el nombre de tu negocio.";
      if (!f.nombre_contacto) return "Escribe el nombre de la persona de contacto.";
      if (!f.empresa_ciudad) return "Elige la ciudad de tu negocio.";
      if (!f.sector) return "Elige el sector.";
      const d = (f.whatsapp ?? "").replace(/\D/g, "");
      if (d.length < 10 || d.length > 13) return "Escribe un WhatsApp válido, ej: +57 300 123 4567.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email ?? "")) return "Escribe un correo válido.";
      if ((f.password ?? "").length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    }
    if (p === 1) {
      if ((f.titulo ?? "").length < 3) return "Escribe el título del cargo.";
      if (!f.area) return "Elige el área.";
      if (!f.ciudad) return "Elige la ciudad de la vacante.";
      if ((f.descripcion ?? "").length < 20) return "Describe el cargo con al menos 20 caracteres.";
      const min = num(f.salario_min);
      const max = num(f.salario_max);
      if (min != null && max != null && max < min) return "El salario máximo no puede ser menor que el mínimo.";
    }
    return null;
  }

  function siguiente() {
    const f = leer();
    const err = validar(paso, f);
    if (err) return setError(err);
    setError(null);
    if (paso === 1) setResumen(f);
    setPaso((p) => Math.min(p + 1, 2));
  }

  function atras() {
    setError(null);
    setPaso((p) => Math.max(p - 1, yaEsEmpresa ? 1 : 0));
  }

  const revision = paso === 2 ? revisarContenidoVacante(resumen) : null;
  const verificada = empresa?.verificada ?? false;
  const salMin = num(resumen.salario_min);
  const salMax = num(resumen.salario_max);
  const mensajeError = error ?? state?.error;

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-3 gap-2" aria-label="Pasos">
        {PASOS.map((p, i) => {
          const Icon = p.icon;
          const hecho = i < paso;
          const actual = i === paso;
          return (
            <li
              key={p.titulo}
              aria-current={actual ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 border-ink px-2.5 py-2 text-xs font-bold sm:text-sm",
                actual ? "bg-sol-300 text-ink" : hecho ? "bg-brand-100 text-brand-800" : "bg-surface text-muted",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {i + 1}. {p.titulo}
              </span>
            </li>
          );
        })}
      </ol>

      <form ref={formRef} action={action} className="space-y-6" noValidate>
        {/* ---------- Paso 1: negocio y cuenta ---------- */}
        <fieldset className={paso === 0 ? "space-y-4" : "hidden"}>
          <legend className="mb-4 font-display text-xl font-extrabold text-ink">Tu negocio</legend>
          {yaEsEmpresa ? (
            <p className="rounded-xl border-2 border-ink bg-canvas px-4 py-3 text-sm text-ink-soft">
              Publicas como <strong className="text-ink">{empresa?.nombre_negocio}</strong>. Puedes cambiar tus datos en{" "}
              <Link href="/empresa/perfil" className="font-bold text-brand-700 underline">
                tu perfil
              </Link>
              .
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre del negocio" htmlFor="nombre_negocio">
                  <Input id="nombre_negocio" name="nombre_negocio" maxLength={120} placeholder="Ej: Restaurante La Costeña" autoComplete="organization" />
                </Field>
                <Field label="Persona de contacto" htmlFor="nombre_contacto">
                  <Input id="nombre_contacto" name="nombre_contacto" maxLength={120} placeholder="¿Con quién hablamos?" autoComplete="name" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Ciudad" htmlFor="empresa_ciudad">
                  {/* name distinto al de la vacante: la ciudad del negocio va como empresa_ciudad → ciudad en el servidor */}
                  <Select id="empresa_ciudad" name="empresa_ciudad" defaultValue="">
                    <option value="" disabled>
                      Elige tu ciudad
                    </option>
                    {CIUDADES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Sector" htmlFor="sector">
                  <Select id="sector" name="sector" defaultValue="">
                    <option value="" disabled>
                      Elige el sector
                    </option>
                    {SECTORES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="WhatsApp del negocio" htmlFor="whatsapp" hint="Los candidatos no lo ven; lo usamos para avisarte.">
                <Input id="whatsapp" name="whatsapp" type="tel" placeholder="+57 300 123 4567" autoComplete="tel" />
              </Field>
              <div className="grid gap-4 rounded-2xl border-2 border-ink bg-canvas p-4 sm:grid-cols-2">
                <p className="text-sm font-bold text-ink sm:col-span-2">Crea tu cuenta</p>
                <Field label="Correo" htmlFor="email">
                  <Input id="email" name="email" type="email" placeholder="tucorreo@negocio.com" autoComplete="email" />
                </Field>
                <Field label="Contraseña" htmlFor="password" hint="Mínimo 8 caracteres.">
                  <Input id="password" name="password" type="password" autoComplete="new-password" />
                </Field>
              </div>
            </>
          )}
        </fieldset>

        {/* ---------- Paso 2: vacante ---------- */}
        <fieldset className={paso === 1 ? "space-y-4" : "hidden"}>
          <legend className="mb-4 font-display text-xl font-extrabold text-ink">La vacante</legend>
          <CamposVacante />
        </fieldset>

        {/* ---------- Paso 3: revisión ---------- */}
        {paso === 2 && (
          <section className="space-y-5">
            <h2 className="font-display text-xl font-extrabold text-ink">Revisa antes de publicar</h2>
            <div className="card-pop space-y-3 p-5">
              <p className="font-display text-lg font-extrabold text-ink">{resumen.titulo}</p>
              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {[
                  ["Área", labelArea(resumen.area)],
                  ["Ciudad", resumen.ciudad],
                  ["Tipo", labelTipo(resumen.tipo)],
                  ["Modalidad", labelModalidad(resumen.modalidad)],
                  ["Nivel mínimo", labelNivel(resumen.nivel_educativo_min)],
                  ["Inicio", labelDisponibilidad(resumen.disponibilidad_requerida)],
                  ["Salario", formatSalario(salMin, salMax)],
                  ["Contrato", resumen.tiene_contrato === "on" ? "Contrato laboral" : "No especificado"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b border-line pb-1">
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-right font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="line-clamp-4 whitespace-pre-line text-sm text-ink-soft">{resumen.descripcion}</p>
            </div>

            {salMin == null && salMax == null && (
              <p className="flex items-start gap-2 rounded-xl border-2 border-ink bg-sol-100 px-4 py-3 text-sm text-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Te recomendamos publicar el salario: las vacantes con salario reciben más postulaciones. Puedes volver atrás para agregarlo.
              </p>
            )}

            {revision?.sospechosa && (
              <div className="rounded-xl border-2 border-ink bg-danger-50 px-4 py-3 text-sm text-ink">
                <p className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="h-4 w-4" /> Revisaremos estos puntos antes de publicar:
                </p>
                <ul className="mt-1 list-disc pl-6">
                  {revision.motivos.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
                <p className="mt-1 text-ink-soft">Si los quitas, tu vacante sale más rápido.</p>
              </div>
            )}

            {(!verificada || revision?.sospechosa) && (
              <p className="flex items-start gap-2 rounded-xl border-2 border-ink bg-brand-50 px-4 py-3 text-sm text-ink">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                <span>
                  <strong>En revisión:</strong> la publicamos apenas la aprobemos (normalmente el mismo día).
                  {!verificada && (
                    <>
                      {" "}
                      <BadgeCheck className="inline h-4 w-4 text-brand-700" /> Al verificar tu empresa (razón social y NIT) tus próximas vacantes se publican sin revisión previa.
                    </>
                  )}
                </span>
              </p>
            )}

            {!yaEsEmpresa && (
              <div className="space-y-2 rounded-2xl border-2 border-ink bg-canvas p-4 text-sm text-ink-soft">
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="acepta_terminos" className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
                  <span>
                    Acepto los{" "}
                    <Link href="/terminos" target="_blank" className="font-bold text-brand-700 underline">
                      Términos y condiciones
                    </Link>
                    .
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input type="checkbox" name="acepta_datos" className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
                  <span>
                    Autorizo el tratamiento de mis datos según la{" "}
                    <Link href="/privacidad" target="_blank" className="font-bold text-brand-700 underline">
                      Política de tratamiento de datos
                    </Link>{" "}
                    (Ley 1581 de 2012).
                  </span>
                </label>
              </div>
            )}
          </section>
        )}

        {mensajeError && (
          <p role="alert" className="rounded-xl border-2 border-ink bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-600">
            {mensajeError}
          </p>
        )}

        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t-2 border-ink pt-5 sm:flex-row sm:items-center">
          {paso > (yaEsEmpresa ? 1 : 0) ? (
            <Button type="button" variant="ghost" size="lg" onClick={atras}>
              Atrás
            </Button>
          ) : (
            <span />
          )}
          {paso < 2 ? (
            <Button type="button" size="lg" onClick={siguiente}>
              Siguiente
            </Button>
          ) : (
            <BotonesEnvio yaEsEmpresa={yaEsEmpresa} />
          )}
        </div>
      </form>
    </div>
  );
}
