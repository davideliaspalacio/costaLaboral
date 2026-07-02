"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { actualizarPerfil, type FormState } from "@/lib/actions/candidato";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { CIUDADES, AREAS, NIVELES_EDUCATIVOS, DISPONIBILIDAD } from "@/lib/constants";
import type { Candidato } from "@/lib/types";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

export function PerfilForm({ candidato }: { candidato: Candidato }) {
  const [state, action] = useActionState<FormState, FormData>(actualizarPerfil, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="Nombre completo" htmlFor="nombre">
        <Input id="nombre" name="nombre" required defaultValue={candidato.nombre} autoComplete="name" />
      </Field>

      <Field label="WhatsApp" htmlFor="whatsapp" hint="Con indicativo, ej: +57 300 123 4567">
        <Input id="whatsapp" name="whatsapp" type="tel" required defaultValue={candidato.whatsapp} autoComplete="tel" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ciudad" htmlFor="ciudad">
          <Select id="ciudad" name="ciudad" required defaultValue={candidato.ciudad}>
            {CIUDADES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Barrio (opcional)" htmlFor="barrio">
          <Input id="barrio" name="barrio" defaultValue={candidato.barrio ?? ""} placeholder="Ej: El Prado" />
        </Field>
      </div>

      <Field label="Área de interés" htmlFor="area_interes">
        <Select id="area_interes" name="area_interes" required defaultValue={candidato.area_interes}>
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nivel educativo" htmlFor="nivel_educativo">
          <Select id="nivel_educativo" name="nivel_educativo" required defaultValue={candidato.nivel_educativo}>
            {NIVELES_EDUCATIVOS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Disponibilidad" htmlFor="disponibilidad">
          <Select id="disponibilidad" name="disponibilidad" required defaultValue={candidato.disponibilidad}>
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
          defaultValue={candidato.experiencia ?? ""}
          placeholder="Ej: 2 años como cajero, atención al cliente, manejo de inventario…"
        />
      </Field>

      {state?.error && (
        <p className="rounded-xl bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-500">{state.error}</p>
      )}

      <div className="flex items-center gap-3">
        <SubmitBtn />
        {state?.ok && <span className="text-sm font-semibold text-success-600">Guardado ✓</span>}
      </div>
    </form>
  );
}
