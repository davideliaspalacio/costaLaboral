"use client";

import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { AREAS, CIUDADES, DISPONIBILIDAD, MODALIDADES, NIVELES_EDUCATIVOS, TIPOS_EMPLEO } from "@/lib/constants";

export type ValoresVacante = {
  titulo?: string;
  area?: string;
  ciudad?: string;
  tipo?: string;
  modalidad?: string;
  nivel_educativo_min?: string;
  disponibilidad_requerida?: string;
  salario_min?: number | null;
  salario_max?: number | null;
  tiene_contrato?: boolean;
  descripcion?: string;
  requisitos?: string;
};

/** Campos de una vacante (no controlados). Se usan en el wizard y en la edición. */
export function CamposVacante({ valores = {} }: { valores?: ValoresVacante }) {
  return (
    <div className="space-y-4">
      <Field label="Título del cargo" htmlFor="titulo" hint="Corto y claro, como lo buscaría la gente: «Mesero», «Auxiliar de bodega».">
        <Input id="titulo" name="titulo" defaultValue={valores.titulo ?? ""} maxLength={120} placeholder="Ej: Mesero fin de semana" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Área" htmlFor="area">
          <Select id="area" name="area" defaultValue={valores.area ?? ""}>
            <option value="" disabled>
              Elige el área
            </option>
            {AREAS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ciudad de la vacante" htmlFor="ciudad">
          <Select id="ciudad" name="ciudad" defaultValue={valores.ciudad ?? ""}>
            <option value="" disabled>
              Elige la ciudad
            </option>
            {CIUDADES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo de empleo" htmlFor="tipo">
          <Select id="tipo" name="tipo" defaultValue={valores.tipo ?? "tiempo_completo"}>
            {TIPOS_EMPLEO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Modalidad" htmlFor="modalidad">
          <Select id="modalidad" name="modalidad" defaultValue={valores.modalidad ?? "presencial"}>
            {MODALIDADES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nivel educativo mínimo" htmlFor="nivel_educativo_min">
          <Select id="nivel_educativo_min" name="nivel_educativo_min" defaultValue={valores.nivel_educativo_min ?? "bachiller"}>
            {NIVELES_EDUCATIVOS.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="¿Para cuándo necesitas a la persona?" htmlFor="disponibilidad_requerida">
          <Select
            id="disponibilidad_requerida"
            name="disponibilidad_requerida"
            defaultValue={valores.disponibilidad_requerida ?? "en_1_mes"}
          >
            {DISPONIBILIDAD.map((d) => (
              <option key={d.value} value={d.value}>
                {d.value === "en_1_mes" ? "En 1 mes o sin afán" : d.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Salario mínimo (COP)" htmlFor="salario_min" hint="Recomendado: con salario llegan más postulaciones.">
          <Input
            id="salario_min"
            name="salario_min"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            defaultValue={valores.salario_min ?? ""}
            placeholder="1423500"
          />
        </Field>
        <Field label="Salario máximo (COP)" htmlFor="salario_max" hint="Igual o mayor que el mínimo. Opcional.">
          <Input
            id="salario_max"
            name="salario_max"
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            defaultValue={valores.salario_max ?? ""}
            placeholder="1800000"
          />
        </Field>
      </div>

      <label className="flex items-start gap-3 rounded-xl border-2 border-ink bg-canvas px-4 py-3 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="tiene_contrato"
          defaultChecked={valores.tiene_contrato ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
        />
        <span>Ofrezco contrato laboral (no solo prestación de servicios).</span>
      </label>

      <Field label="Descripción del cargo" htmlFor="descripcion" hint="Qué hará la persona en el día a día, horario y lugar.">
        <Textarea
          id="descripcion"
          name="descripcion"
          defaultValue={valores.descripcion ?? ""}
          maxLength={5000}
          placeholder="Ej: Atención de mesas en restaurante del Centro Histórico, turnos de viernes a domingo de 4 p. m. a 11 p. m."
        />
      </Field>

      <Field
        label="Requisitos"
        htmlFor="requisitos"
        hint="Experiencia, conocimientos y documentos. No pidas edad, sexo, estado civil, «buena presencia» ni cobres nada al candidato."
      >
        <Textarea
          id="requisitos"
          name="requisitos"
          defaultValue={valores.requisitos ?? ""}
          maxLength={3000}
          placeholder="Ej: 6 meses de experiencia como mesero, manejo de datáfono, curso de manipulación de alimentos."
        />
      </Field>
    </div>
  );
}
