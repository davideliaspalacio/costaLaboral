"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { actualizarPerfilEmpresa, type PerfilEmpresaState } from "@/lib/actions/empresa";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { CIUDADES, SECTORES } from "@/lib/constants";
import type { Empresa } from "@/lib/types";

function Guardar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Guardando…" : "Guardar perfil"}
    </Button>
  );
}

export type EmpresaPerfil = Pick<
  Empresa,
  "nombre_negocio" | "nombre_contacto" | "whatsapp" | "ciudad" | "sector" | "razon_social" | "nit" | "descripcion" | "sitio_web" | "direccion" | "verificacion"
>;

export function PerfilForm({ empresa }: { empresa: EmpresaPerfil }) {
  const [state, action] = useActionState<PerfilEmpresaState, FormData>(actualizarPerfilEmpresa, null);
  const verificadaOEnRevision = empresa.verificacion === "verificada" || empresa.verificacion === "en_revision";

  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre comercial" htmlFor="nombre_negocio">
          <Input id="nombre_negocio" name="nombre_negocio" defaultValue={empresa.nombre_negocio} maxLength={120} required />
        </Field>
        <Field label="Persona de contacto" htmlFor="nombre_contacto">
          <Input id="nombre_contacto" name="nombre_contacto" defaultValue={empresa.nombre_contacto} maxLength={120} required />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp">
          <Input id="whatsapp" name="whatsapp" type="tel" defaultValue={empresa.whatsapp} required />
        </Field>
        <Field label="Ciudad" htmlFor="ciudad">
          <Select id="ciudad" name="ciudad" defaultValue={empresa.ciudad}>
            {CIUDADES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sector" htmlFor="sector">
          <Select id="sector" name="sector" defaultValue={empresa.sector}>
            {SECTORES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sitio web" htmlFor="sitio_web" hint="Opcional, ej: https://minegocio.com">
          <Input id="sitio_web" name="sitio_web" type="url" inputMode="url" defaultValue={empresa.sitio_web ?? ""} placeholder="https://" />
        </Field>
        <Field label="Dirección" htmlFor="direccion" className="sm:col-span-2">
          <Input id="direccion" name="direccion" defaultValue={empresa.direccion ?? ""} maxLength={200} placeholder="Ej: Cra 54 # 72-80, local 3" />
        </Field>
      </div>

      <Field label="Descripción del negocio" htmlFor="descripcion" hint="Qué hacen y cómo es trabajar con ustedes.">
        <Textarea id="descripcion" name="descripcion" defaultValue={empresa.descripcion ?? ""} maxLength={2000} />
      </Field>

      <fieldset className="space-y-4 rounded-2xl border-2 border-ink bg-canvas p-4">
        <legend className="px-1 font-bold text-ink">Datos legales (para verificar tu empresa)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razón social" htmlFor="razon_social">
            <Input id="razon_social" name="razon_social" defaultValue={empresa.razon_social ?? ""} maxLength={200} placeholder="Como aparece en el RUT" />
          </Field>
          <Field label="NIT con dígito de verificación" htmlFor="nit" hint="Ej: 900123456-7">
            <Input id="nit" name="nit" defaultValue={empresa.nit ?? ""} inputMode="numeric" placeholder="900123456-7" />
          </Field>
        </div>
        {verificadaOEnRevision && (
          <p className="text-xs text-muted">Si cambias la razón social o el NIT, tendrás que solicitar la verificación de nuevo.</p>
        )}
      </fieldset>

      {state?.error && (
        <p role="alert" className="rounded-xl border-2 border-ink bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-600">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-xl border-2 border-ink bg-success-50 px-4 py-2.5 text-sm font-semibold text-success-600">
          Perfil guardado.
        </p>
      )}
      <Guardar />
    </form>
  );
}
