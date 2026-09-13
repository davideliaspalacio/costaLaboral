"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronDown, MessageCircle } from "lucide-react";
import { registrarCandidato, type FormState } from "@/lib/actions/candidato";
import { MIN_PASSWORD } from "@/lib/candidato-validacion";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { CIUDADES, AREAS, NIVELES_EDUCATIVOS, DISPONIBILIDAD } from "@/lib/constants";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? "Creando cuenta…" : "Crear cuenta gratis"}
    </Button>
  );
}

function Casilla({
  name,
  defaultChecked,
  required,
  error,
  children,
}: {
  name: string;
  defaultChecked?: boolean;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          name={name}
          required={required}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-ink accent-brand-600"
        />
        <span>{children}</span>
      </label>
      {error && <p className="ml-8 mt-1 text-xs font-medium text-danger-500">{error}</p>}
    </div>
  );
}

export function RegistroForm() {
  const [state, action] = useActionState<FormState, FormData>(registrarCandidato, null);
  const v = state?.valores ?? {};
  const e = state?.campos ?? {};
  const txt = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : "");
  const abrirOpcionales = Boolean(txt("barrio") || txt("experiencia") || e.barrio || e.experiencia);

  return (
    <form action={action} className="space-y-4" noValidate={false}>
      <Field label="Nombre completo" htmlFor="nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" required maxLength={100} defaultValue={txt("nombre")} placeholder="Tu nombre y apellido" autoComplete="name" />
      </Field>

      <Field label="WhatsApp" htmlFor="whatsapp" hint="Tu celular, ej: 300 123 4567" error={e.whatsapp}>
        <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" required defaultValue={txt("whatsapp")} placeholder="300 123 4567" autoComplete="tel-national" />
      </Field>

      <Field label="Correo electrónico" htmlFor="email" error={e.email}>
        <Input id="email" name="email" type="email" required defaultValue={txt("email")} placeholder="tucorreo@ejemplo.com" autoComplete="email" />
      </Field>

      <Field label="Contraseña" htmlFor="password" hint={`Mínimo ${MIN_PASSWORD} caracteres`} error={e.password}>
        <Input id="password" name="password" type="password" required minLength={MIN_PASSWORD} placeholder="••••••••" autoComplete="new-password" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ciudad" htmlFor="ciudad" error={e.ciudad}>
          <Select id="ciudad" name="ciudad" required defaultValue={txt("ciudad")}>
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

        <Field label="Área de interés" htmlFor="area_interes" error={e.area_interes}>
          <Select id="area_interes" name="area_interes" required defaultValue={txt("area_interes")}>
            <option value="" disabled>
              ¿En qué quieres camellar?
            </option>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nivel educativo" htmlFor="nivel_educativo" error={e.nivel_educativo}>
          <Select id="nivel_educativo" name="nivel_educativo" required defaultValue={txt("nivel_educativo")}>
            <option value="" disabled>
              Selecciona
            </option>
            {NIVELES_EDUCATIVOS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Disponibilidad" htmlFor="disponibilidad" error={e.disponibilidad}>
          <Select id="disponibilidad" name="disponibilidad" required defaultValue={txt("disponibilidad") || "inmediata"}>
            {DISPONIBILIDAD.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <details className="group rounded-xl border-2 border-line bg-canvas px-4 py-3" open={abrirOpcionales}>
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold text-ink">
          Barrio y experiencia (opcional)
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-4">
          <Field label="Barrio" htmlFor="barrio" error={e.barrio}>
            <Input id="barrio" name="barrio" maxLength={80} defaultValue={txt("barrio")} placeholder="Ej: El Prado" />
          </Field>
          <Field label="Experiencia" htmlFor="experiencia" hint="En qué has trabajado. Lo puedes completar después." error={e.experiencia}>
            <Textarea
              id="experiencia"
              name="experiencia"
              maxLength={2000}
              defaultValue={txt("experiencia")}
              placeholder="Ej: 2 años como cajero, atención al cliente, manejo de inventario…"
            />
          </Field>
        </div>
      </details>

      <fieldset className="space-y-3 rounded-xl border-2 border-ink bg-surface p-4">
        <legend className="sr-only">Autorizaciones</legend>
        <Casilla name="acepta_terminos" required defaultChecked={v.acepta_terminos === true} error={e.acepta_terminos}>
          Acepto los{" "}
          <Link href="/terminos" target="_blank" className="font-bold text-brand-700 underline-offset-2 hover:underline">
            Términos
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="font-bold text-brand-700 underline-offset-2 hover:underline">
            Política de tratamiento de datos
          </Link>
          .
        </Casilla>
        <Casilla name="mayor_de_edad" required defaultChecked={v.mayor_de_edad === true} error={e.mayor_de_edad}>
          Declaro que soy mayor de 18 años.
        </Casilla>

        <div className="border-t-2 border-line pt-3">
          <Casilla name="wsp_opt_in" defaultChecked={v.wsp_opt_in === true}>
            <span className="inline-flex items-center gap-1.5 font-bold text-ink">
              <MessageCircle className="h-4 w-4 text-brand-600" /> Quiero recibir vacantes por WhatsApp
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              Opcional. Solo te escribimos para avisarte de vacantes que encajan con tu perfil. Puedes desactivarlo
              cuando quieras en Mi cuenta.
            </span>
          </Casilla>
        </div>
      </fieldset>

      {state?.error && (
        <p role="alert" className="rounded-xl border-2 border-danger-500 bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-600">
          {state.error}
        </p>
      )}

      <SubmitBtn />
    </form>
  );
}
