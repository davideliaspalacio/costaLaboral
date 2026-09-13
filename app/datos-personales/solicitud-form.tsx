"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleCheck } from "lucide-react";
import { crearSolicitudTitular, type EstadoSolicitud } from "@/lib/actions/solicitudes";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { TIPOS_DOCUMENTO, TIPOS_SOLICITUD } from "@/lib/legal/solicitudes";

function Enviar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? "Radicando..." : "Radicar solicitud"}
    </Button>
  );
}

export function SolicitudForm({ emailInicial }: { emailInicial?: string }) {
  const [estado, accion] = useActionState<EstadoSolicitud, FormData>(crearSolicitudTitular, null);

  if (estado?.ok) {
    return (
      <div role="status" className="card p-6 shadow-[var(--shadow-sticker-lg)] sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-xl border-2 border-ink bg-success-50 text-success-600">
          <CircleCheck className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="kicker mt-4">Solicitud radicada</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-ink">Guarda tu número de radicado</h2>
        <p className="mt-4 rounded-xl border-2 border-ink bg-sol-100 px-4 py-3 text-center font-mono text-2xl font-extrabold tracking-wider text-ink">
          {estado.radicado}
        </p>
        <dl className="mt-5 space-y-2 text-sm text-ink-soft">
          <div>
            <dt className="inline font-semibold text-ink">Trámite: </dt>
            <dd className="inline">
              {estado.clase === "consulta" ? "Consulta" : "Reclamo"} · {estado.dias} días hábiles
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold text-ink">Fecha límite de respuesta: </dt>
            <dd className="inline">{estado.venceTexto} (hora de Colombia)</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">
          Te responderemos al correo que indicaste. Si necesitamos más tiempo te avisaremos antes del vencimiento, con
          los motivos y la nueva fecha, dentro de la prórroga que permite la ley.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-bold text-brand-700 underline underline-offset-2">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const errores = estado && !estado.ok ? estado.errores : {};

  return (
    <form action={accion} className="card space-y-5 p-6 shadow-[var(--shadow-sticker)] sm:p-8" noValidate>
      <Field label="Tipo de solicitud" htmlFor="tipo" error={errores.tipo}>
        <Select id="tipo" name="tipo" required defaultValue="">
          <option value="" disabled>
            Elige una opción
          </option>
          {TIPOS_SOLICITUD.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Nombre completo del titular" htmlFor="nombre" error={errores.nombre}>
        <Input id="nombre" name="nombre" required maxLength={120} autoComplete="name" />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tipo de documento" htmlFor="tipo_documento" error={errores.tipo_documento}>
          <Select id="tipo_documento" name="tipo_documento" required defaultValue="CC">
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Número de documento" htmlFor="numero_documento" error={errores.numero_documento}>
          <Input id="numero_documento" name="numero_documento" required maxLength={20} inputMode="text" />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Correo para la respuesta" htmlFor="email" error={errores.email}>
          <Input id="email" name="email" type="email" required maxLength={160} autoComplete="email" defaultValue={emailInicial} />
        </Field>
        <Field label="Teléfono (opcional)" htmlFor="telefono" error={errores.telefono}>
          <Input id="telefono" name="telefono" type="tel" maxLength={20} autoComplete="tel" />
        </Field>
      </div>

      <Field
        label="Describe tu solicitud"
        htmlFor="descripcion"
        hint="Indica qué datos, qué quieres que hagamos y, si aplica, los documentos que quieras hacer valer."
        error={errores.descripcion}
      >
        <Textarea id="descripcion" name="descripcion" required minLength={20} maxLength={4000} rows={6} />
      </Field>

      <div>
        <label className="flex items-start gap-3 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="declaracion"
            required
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-ink accent-brand-600"
          />
          <span>
            Declaro que soy el titular de los datos o su representante o apoderado debidamente acreditado, y que la
            información de este formulario es verídica. Sé que podrán pedirme acreditar mi identidad antes de responder.
          </span>
        </label>
        {errores.declaracion && <p className="mt-1 text-xs font-medium text-danger-500">{errores.declaracion}</p>}
      </div>

      {errores.general && (
        <p role="alert" className="rounded-xl border-2 border-ink bg-danger-50 px-4 py-2.5 text-sm font-medium text-danger-600">
          {errores.general}
        </p>
      )}

      <Enviar />
    </form>
  );
}
