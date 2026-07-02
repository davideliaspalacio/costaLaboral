"use client";

import Link from "next/link";
import { useState, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { publicarVacante, type PublicarState } from "@/lib/actions/empresa";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import {
  CIUDADES,
  SECTORES,
  AREAS,
  MODALIDADES,
  NIVELES_EDUCATIVOS,
} from "@/lib/constants";
import type { Empresa } from "@/lib/types";
import { Building2, Briefcase, ClipboardList, Gift } from "lucide-react";

const PASOS = ["Empresa", "Cargo", "Detalles"] as const;

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? "Publicando…" : "Publicar vacante gratis"}
    </Button>
  );
}

export function Wizard({
  yaEsEmpresa,
  empresa,
}: {
  yaEsEmpresa: boolean;
  empresa: Empresa | null;
}) {
  const [state, action] = useActionState<PublicarState, FormData>(publicarVacante, null);
  const [paso, setPaso] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Estado controlado de los campos requeridos para validar por paso.
  const [f, setF] = useState({
    nombre_negocio: empresa?.nombre_negocio ?? "",
    nombre_contacto: empresa?.nombre_contacto ?? "",
    ciudad: empresa?.ciudad ?? "",
    whatsapp: empresa?.whatsapp ?? "",
    sector: empresa?.sector ?? "",
    email: "",
    password: "",
    titulo: "",
    area: "",
    modalidad: "presencial",
    nivel_educativo_min: "bachiller",
    salario_min: "",
    salario_max: "",
    descripcion: "",
    requisitos: "",
    tiene_contrato: false,
    consentimiento: false,
  });
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  function validarPaso(p: number): string | null {
    if (p === 0) {
      if (!f.nombre_negocio.trim()) return "Escribe el nombre de tu negocio.";
      if (!f.nombre_contacto.trim()) return "Escribe el nombre de contacto.";
      if (!f.ciudad) return "Elige la ciudad.";
      if (!f.whatsapp.trim()) return "Escribe tu WhatsApp.";
      if (!f.sector) return "Elige el sector.";
      if (!yaEsEmpresa) {
        if (!f.email.trim()) return "Ingresa un correo para tu cuenta.";
        if (f.password.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
        if (!f.consentimiento)
          return "Debes aceptar los Términos y la política de privacidad para continuar.";
      }
      return null;
    }
    if (p === 1) {
      if (!f.titulo.trim()) return "Escribe el título del cargo.";
      if (!f.area) return "Elige el área.";
      return null;
    }
    if (p === 2) {
      if (!f.descripcion.trim()) return "Escribe una descripción del cargo.";
      return null;
    }
    return null;
  }

  function siguiente() {
    const err = validarPaso(paso);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  }

  function atras() {
    setError(null);
    setPaso((p) => Math.max(p - 1, 0));
  }

  const progreso = ((paso + 1) / PASOS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Barra de progreso */}
      <div>
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-ink-soft">
          <span>
            Paso {paso + 1} de {PASOS.length}: {PASOS[paso]}
          </span>
          <span className="text-muted">{Math.round(progreso)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-brand-50">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${progreso}%` }} />
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-600">
        <Gift className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Publicar es <strong>100% gratis</strong> y toma menos de 5 minutos. No pedimos RUT ni cámara de comercio.</span>
      </div>

      <form action={action} className="space-y-5">
        {/* ---------- Paso 1: Empresa ---------- */}
        <fieldset className={paso === 0 ? "space-y-4" : "hidden"} aria-hidden={paso !== 0}>
          <legend className="flex items-center gap-2 text-lg font-bold text-ink">
            <Building2 className="h-5 w-5 text-brand-600" /> Tu negocio
          </legend>
          <Field label="Nombre del negocio" htmlFor="nombre_negocio">
            <Input id="nombre_negocio" name="nombre_negocio" value={f.nombre_negocio}
              onChange={(e) => set("nombre_negocio")(e.target.value)} placeholder="Ej: Restaurante La Costeña" />
          </Field>
          <Field label="Nombre de contacto" htmlFor="nombre_contacto">
            <Input id="nombre_contacto" name="nombre_contacto" value={f.nombre_contacto}
              onChange={(e) => set("nombre_contacto")(e.target.value)} placeholder="¿Con quién hablamos?" autoComplete="name" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ciudad" htmlFor="ciudad">
              <Select id="ciudad" name="ciudad" value={f.ciudad} onChange={(e) => set("ciudad")(e.target.value)}>
                <option value="" disabled>Elige tu ciudad</option>
                {CIUDADES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Sector" htmlFor="sector">
              <Select id="sector" name="sector" value={f.sector} onChange={(e) => set("sector")(e.target.value)}>
                <option value="" disabled>Elige el sector</option>
                {SECTORES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="WhatsApp" htmlFor="whatsapp" hint="Con indicativo, ej: +57 300 123 4567">
            <Input id="whatsapp" name="whatsapp" type="tel" value={f.whatsapp}
              onChange={(e) => set("whatsapp")(e.target.value)} placeholder="+57 300 123 4567" autoComplete="tel" />
          </Field>

          {!yaEsEmpresa && (
            <div className="space-y-4 rounded-xl bg-canvas p-4">
              <p className="text-sm font-semibold text-ink-soft">Crea tu cuenta de empresa</p>
              <Field label="Correo electrónico" htmlFor="email">
                <Input id="email" name="email" type="email" value={f.email}
                  onChange={(e) => set("email")(e.target.value)} placeholder="tucorreo@ejemplo.com" autoComplete="email" />
              </Field>
              <Field label="Contraseña" htmlFor="password" hint="Mínimo 6 caracteres">
                <Input id="password" name="password" type="password" value={f.password}
                  onChange={(e) => set("password")(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
              </Field>
              <label className="flex items-start gap-3 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="consentimiento"
                  checked={f.consentimiento}
                  onChange={(e) => set("consentimiento")(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus:ring-brand-100"
                />
                <span>
                  Acepto los{" "}
                  <Link href="/terminos" className="font-semibold text-brand-700 hover:underline">
                    Términos y condiciones
                  </Link>{" "}
                  y la{" "}
                  <Link href="/privacidad" className="font-semibold text-brand-700 hover:underline">
                    política de privacidad
                  </Link>{" "}
                  (Ley 1581 de 2012).
                </span>
              </label>
            </div>
          )}
        </fieldset>

        {/* ---------- Paso 2: Cargo ---------- */}
        <fieldset className={paso === 1 ? "space-y-4" : "hidden"} aria-hidden={paso !== 1}>
          <legend className="flex items-center gap-2 text-lg font-bold text-ink">
            <Briefcase className="h-5 w-5 text-brand-600" /> El cargo
          </legend>
          <Field label="Título del cargo" htmlFor="titulo">
            <Input id="titulo" name="titulo" value={f.titulo}
              onChange={(e) => set("titulo")(e.target.value)} placeholder="Ej: Mesero, Auxiliar de bodega…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Área" htmlFor="area">
              <Select id="area" name="area" value={f.area} onChange={(e) => set("area")(e.target.value)}>
                <option value="" disabled>Elige el área</option>
                {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </Select>
            </Field>
            <Field label="Modalidad" htmlFor="modalidad">
              <Select id="modalidad" name="modalidad" value={f.modalidad} onChange={(e) => set("modalidad")(e.target.value)}>
                {MODALIDADES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Nivel educativo mínimo" htmlFor="nivel_educativo_min">
            <Select id="nivel_educativo_min" name="nivel_educativo_min" value={f.nivel_educativo_min}
              onChange={(e) => set("nivel_educativo_min")(e.target.value)}>
              {NIVELES_EDUCATIVOS.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Salario mínimo" htmlFor="salario_min" hint="En pesos (opcional)">
              <Input id="salario_min" name="salario_min" type="number" inputMode="numeric" min={0} value={f.salario_min}
                onChange={(e) => set("salario_min")(e.target.value)} placeholder="1400000" />
            </Field>
            <Field label="Salario máximo" htmlFor="salario_max" hint="En pesos (opcional)">
              <Input id="salario_max" name="salario_max" type="number" inputMode="numeric" min={0} value={f.salario_max}
                onChange={(e) => set("salario_max")(e.target.value)} placeholder="1800000" />
            </Field>
          </div>
        </fieldset>

        {/* ---------- Paso 3: Detalles ---------- */}
        <fieldset className={paso === 2 ? "space-y-4" : "hidden"} aria-hidden={paso !== 2}>
          <legend className="flex items-center gap-2 text-lg font-bold text-ink">
            <ClipboardList className="h-5 w-5 text-brand-600" /> Detalles
          </legend>
          <Field label="Descripción del cargo" htmlFor="descripcion" hint="Qué hará la persona en el día a día">
            <Textarea id="descripcion" name="descripcion" value={f.descripcion}
              onChange={(e) => set("descripcion")(e.target.value)}
              placeholder="Ej: Atención al cliente en el punto de venta, manejo de caja…" />
          </Field>
          <Field label="Requisitos" htmlFor="requisitos" hint="Experiencia y habilidades necesarias">
            <Textarea id="requisitos" name="requisitos" value={f.requisitos}
              onChange={(e) => set("requisitos")(e.target.value)}
              placeholder="Ej: Experiencia de 1 año, buena actitud, disponibilidad de horario…" />
          </Field>
          <label className="flex items-start gap-3 rounded-xl bg-canvas px-4 py-3 text-sm text-ink-soft">
            <input type="checkbox" name="tiene_contrato" checked={f.tiene_contrato}
              onChange={(e) => set("tiene_contrato")(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-brand-600 focus:ring-brand-100" />
            <span>Ofrezco contrato formal (no solo prestación de servicios).</span>
          </label>
        </fieldset>

        {(error || state?.error) && (
          <p className="rounded-xl bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-500">
            {error ?? state?.error}
          </p>
        )}

        {/* Navegación */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {paso > 0 ? (
            <Button type="button" variant="outline" size="lg" onClick={atras}>Atrás</Button>
          ) : (
            <span />
          )}
          {paso < PASOS.length - 1 ? (
            <Button type="button" size="lg" onClick={siguiente}>Siguiente</Button>
          ) : (
            <SubmitBtn />
          )}
        </div>
      </form>
    </div>
  );
}
