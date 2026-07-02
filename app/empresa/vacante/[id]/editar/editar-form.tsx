"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { editarVacante, type EditarState } from "@/lib/actions/empresa";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { CIUDADES, AREAS, MODALIDADES, NIVELES_EDUCATIVOS } from "@/lib/constants";
import type { Vacante } from "@/lib/types";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Guardando…" : "Guardar cambios"}
    </Button>
  );
}

export function EditarForm({ vacante }: { vacante: Vacante }) {
  const [state, action] = useActionState<EditarState, FormData>(editarVacante, null);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="id" value={vacante.id} />

      <Field label="Título del cargo" htmlFor="titulo">
        <Input id="titulo" name="titulo" defaultValue={vacante.titulo} placeholder="Ej: Mesero, Auxiliar de bodega…" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ciudad" htmlFor="ciudad">
          <Select id="ciudad" name="ciudad" defaultValue={vacante.ciudad}>
            <option value="" disabled>Elige la ciudad</option>
            {CIUDADES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Área" htmlFor="area">
          <Select id="area" name="area" defaultValue={vacante.area}>
            <option value="" disabled>Elige el área</option>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Modalidad" htmlFor="modalidad">
          <Select id="modalidad" name="modalidad" defaultValue={vacante.modalidad}>
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nivel educativo mínimo" htmlFor="nivel_educativo_min">
          <Select id="nivel_educativo_min" name="nivel_educativo_min" defaultValue={vacante.nivel_educativo_min}>
            {NIVELES_EDUCATIVOS.map((n) => (
              <option key={n.value} value={n.value}>{n.label}</option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Salario mínimo" htmlFor="salario_min" hint="En pesos (opcional)">
          <Input
            id="salario_min"
            name="salario_min"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={vacante.salario_min ?? ""}
            placeholder="1400000"
          />
        </Field>
        <Field label="Salario máximo" htmlFor="salario_max" hint="En pesos (opcional)">
          <Input
            id="salario_max"
            name="salario_max"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={vacante.salario_max ?? ""}
            placeholder="1800000"
          />
        </Field>
      </div>

      <Field label="Descripción del cargo" htmlFor="descripcion" hint="Qué hará la persona en el día a día">
        <Textarea
          id="descripcion"
          name="descripcion"
          defaultValue={vacante.descripcion}
          placeholder="Ej: Atención al cliente en el punto de venta, manejo de caja…"
        />
      </Field>

      <Field label="Requisitos" htmlFor="requisitos" hint="Experiencia y habilidades necesarias">
        <Textarea
          id="requisitos"
          name="requisitos"
          defaultValue={vacante.requisitos}
          placeholder="Ej: Experiencia de 1 año, buena actitud, disponibilidad de horario…"
        />
      </Field>

      <label className="flex items-start gap-3 rounded-xl border-2 border-ink bg-canvas px-4 py-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="tiene_contrato"
          defaultChecked={vacante.tiene_contrato}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus:ring-brand-100"
        />
        <span>Ofrezco contrato formal (no solo prestación de servicios).</span>
      </label>

      {state?.error && (
        <p className="rounded-xl bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-500">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <Link href="/empresa/panel" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Cancelar
        </Link>
        <SubmitBtn />
      </div>
    </form>
  );
}
