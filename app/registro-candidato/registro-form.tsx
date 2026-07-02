"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registrarCandidato, type FormState } from "@/lib/actions/candidato";
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

export function RegistroForm() {
  const [state, action] = useActionState<FormState, FormData>(registrarCandidato, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Nombre completo" htmlFor="nombre">
        <Input id="nombre" name="nombre" required placeholder="Tu nombre y apellido" autoComplete="name" />
      </Field>

      <Field label="WhatsApp" htmlFor="whatsapp" hint="Con indicativo, ej: +57 300 123 4567">
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          required
          placeholder="+57 300 123 4567"
          autoComplete="tel"
        />
      </Field>

      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" name="email" type="email" required placeholder="tucorreo@ejemplo.com" autoComplete="email" />
      </Field>

      <Field label="Contraseña" htmlFor="password" hint="Mínimo 6 caracteres">
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ciudad" htmlFor="ciudad">
          <Select id="ciudad" name="ciudad" required defaultValue="">
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

        <Field label="Barrio (opcional)" htmlFor="barrio">
          <Input id="barrio" name="barrio" placeholder="Ej: El Prado" />
        </Field>
      </div>

      <Field label="Área de interés" htmlFor="area_interes">
        <Select id="area_interes" name="area_interes" required defaultValue="">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nivel educativo" htmlFor="nivel_educativo">
          <Select id="nivel_educativo" name="nivel_educativo" required defaultValue="">
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

        <Field label="Disponibilidad" htmlFor="disponibilidad">
          <Select id="disponibilidad" name="disponibilidad" defaultValue="inmediata">
            {DISPONIBILIDAD.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Experiencia (opcional)"
        htmlFor="experiencia"
        hint="Cuéntanos en qué has trabajado — mejora tus matches"
      >
        <Textarea
          id="experiencia"
          name="experiencia"
          placeholder="Ej: 2 años como cajero, atención al cliente, manejo de inventario…"
        />
      </Field>

      <label className="flex items-start gap-3 rounded-xl bg-canvas px-4 py-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="consentimiento"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus:ring-brand-100"
        />
        <span>
          Autorizo el tratamiento de mis datos según la{" "}
          <Link href="/privacidad" className="font-semibold text-brand-700 hover:underline">
            política de privacidad
          </Link>{" "}
          (Ley 1581 de 2012).
        </span>
      </label>

      {state?.error && (
        <p className="rounded-xl bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-500">{state.error}</p>
      )}

      <SubmitBtn />
    </form>
  );
}
