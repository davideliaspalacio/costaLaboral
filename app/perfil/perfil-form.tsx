"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
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

/** Muestra el celular sin el +57 para editarlo cómodo; el servidor lo vuelve a normalizar. */
const celularLocal = (w: string) => w.replace(/^\+57/, "");

export function PerfilForm({ candidato }: { candidato: Candidato }) {
  const [state, action] = useActionState<FormState, FormData>(actualizarPerfil, null);
  const e = state?.campos ?? {};
  return (
    <form action={action} className="space-y-4">
      <Field label="Nombre completo" htmlFor="nombre" error={e.nombre}>
        <Input id="nombre" name="nombre" required maxLength={100} defaultValue={candidato.nombre} autoComplete="name" />
      </Field>

      <Field label="WhatsApp" htmlFor="whatsapp" hint="Tu celular, ej: 300 123 4567" error={e.whatsapp}>
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          required
          defaultValue={celularLocal(candidato.whatsapp)}
          autoComplete="tel-national"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ciudad" htmlFor="ciudad" error={e.ciudad}>
          <Select id="ciudad" name="ciudad" required defaultValue={candidato.ciudad}>
            {CIUDADES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Barrio (opcional)" htmlFor="barrio" error={e.barrio}>
          <Input id="barrio" name="barrio" maxLength={80} defaultValue={candidato.barrio ?? ""} placeholder="Ej: El Prado" />
        </Field>
      </div>

      <Field label="Área de interés" htmlFor="area_interes" error={e.area_interes}>
        <Select id="area_interes" name="area_interes" required defaultValue={candidato.area_interes}>
          {AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nivel educativo" htmlFor="nivel_educativo" error={e.nivel_educativo}>
          <Select id="nivel_educativo" name="nivel_educativo" required defaultValue={candidato.nivel_educativo}>
            {NIVELES_EDUCATIVOS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Disponibilidad" htmlFor="disponibilidad" error={e.disponibilidad}>
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
        hint="Cuéntanos en qué has trabajado"
        error={e.experiencia}
      >
        <Textarea
          id="experiencia"
          name="experiencia"
          maxLength={2000}
          defaultValue={candidato.experiencia ?? ""}
          placeholder="Ej: 2 años como cajero, atención al cliente, manejo de inventario…"
        />
      </Field>

      {state?.error && (
        <p role="alert" className="rounded-xl border-2 border-danger-500 bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-600">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitBtn />
        {state?.ok && (
          <span role="status" className="inline-flex items-center gap-1 text-sm font-semibold text-success-600">
            <CheckCircle2 className="h-4 w-4" /> Guardado
          </span>
        )}
      </div>
    </form>
  );
}
