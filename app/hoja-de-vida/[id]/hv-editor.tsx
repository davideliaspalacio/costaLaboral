"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Trash2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { CopyButton } from "@/components/hv/copy-button";
import { actualizarHojaDeVida } from "@/lib/actions/hoja-de-vida";
import type { ContenidoHV } from "@/lib/ai";
import { cvATexto, linkedInATexto } from "@/lib/hv-texto";

/* ============================================================
   Editor completo de una hoja de vida guardada. Cliente.
   ============================================================ */

type Props = {
  id: string;
  candidato: { nombre: string; ciudad: string; whatsapp: string; email: string };
  titulo: string;
  contenidoInicial: ContenidoHV;
  linkedinInicial: { titular: string; acerca: string };
};

export function HvEditor({ id, candidato, titulo: tituloInicial, contenidoInicial, linkedinInicial }: Props) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(tituloInicial);
  const [contenido, setContenido] = useState<ContenidoHV>(contenidoInicial);
  const [linkedin, setLinkedin] = useState(linkedinInicial);
  const [guardando, startGuardar] = useTransition();
  const [guardado, setGuardado] = useState(false);

  function marcar() {
    setGuardado(false);
  }

  function guardar() {
    startGuardar(async () => {
      const r = await actualizarHojaDeVida(id, {
        titulo,
        contenido,
        linkedin_titular: linkedin.titular,
        linkedin_acerca: linkedin.acerca,
      });
      if ("ok" in r) {
        setGuardado(true);
        router.refresh();
        router.push(`/hoja-de-vida/${id}`);
      }
    });
  }

  const textoCv = cvATexto(candidato.nombre, candidato.ciudad, candidato, contenido);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CopyButton text={textoCv} label="Copiar hoja de vida" />
          <CopyButton text={linkedInATexto(linkedin)} label="Copiar LinkedIn" variant="brand" />
        </div>
        <Button type="button" variant="accent" onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {guardado ? "Guardado ✓" : "Guardar cambios"}
        </Button>
      </div>

      <div className="card-pop">
        <div className="space-y-6 p-5 sm:p-6">
          <Field label="Título de esta hoja de vida" htmlFor="titulo">
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => {
                setTitulo(e.target.value);
                marcar();
              }}
            />
          </Field>

          <Field label="Perfil profesional">
            <Textarea
              className="min-h-24"
              value={contenido.resumen}
              onChange={(e) => {
                setContenido((c) => ({ ...c, resumen: e.target.value }));
                marcar();
              }}
            />
          </Field>

          <Lista
            label="Habilidades"
            items={contenido.habilidades}
            onChange={(v) => {
              setContenido((c) => ({ ...c, habilidades: v }));
              marcar();
            }}
            placeholder="Agregar habilidad"
          />

          <div>
            <p className="label-base">Experiencia</p>
            <div className="space-y-4">
              {contenido.experiencia.map((e, i) => (
                <div key={i} className="rounded-xl border-2 border-ink bg-canvas p-4">
                  <div className="mb-3 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setContenido((c) => ({ ...c, experiencia: c.experiencia.filter((_, j) => j !== i) }));
                        marcar();
                      }}
                    >
                      <X className="h-4 w-4" /> Quitar
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      value={e.cargo}
                      placeholder="Cargo"
                      onChange={(ev) => {
                        setContenido((c) => ({
                          ...c,
                          experiencia: c.experiencia.map((x, j) => (j === i ? { ...x, cargo: ev.target.value } : x)),
                        }));
                        marcar();
                      }}
                    />
                    <Input
                      value={e.empresa}
                      placeholder="Empresa"
                      onChange={(ev) => {
                        setContenido((c) => ({
                          ...c,
                          experiencia: c.experiencia.map((x, j) => (j === i ? { ...x, empresa: ev.target.value } : x)),
                        }));
                        marcar();
                      }}
                    />
                    <Input
                      value={e.periodo}
                      placeholder="Periodo"
                      onChange={(ev) => {
                        setContenido((c) => ({
                          ...c,
                          experiencia: c.experiencia.map((x, j) => (j === i ? { ...x, periodo: ev.target.value } : x)),
                        }));
                        marcar();
                      }}
                    />
                  </div>
                  <div className="mt-3">
                    <Lista
                      label="Logros"
                      items={e.logros}
                      onChange={(v) => {
                        setContenido((c) => ({
                          ...c,
                          experiencia: c.experiencia.map((x, j) => (j === i ? { ...x, logros: v } : x)),
                        }));
                        marcar();
                      }}
                      placeholder="Agregar logro"
                    />
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => {
                setContenido((c) => ({
                  ...c,
                  experiencia: [...c.experiencia, { cargo: "", empresa: "", periodo: "", logros: [] }],
                }));
                marcar();
              }}
            >
              <Plus className="h-4 w-4" /> Agregar experiencia
            </Button>
          </div>

          <Lista
            label="Educación"
            items={contenido.educacion}
            onChange={(v) => {
              setContenido((c) => ({ ...c, educacion: v }));
              marcar();
            }}
            placeholder="Agregar estudio"
          />
          <Lista
            label="Logros y fortalezas"
            items={contenido.logros}
            onChange={(v) => {
              setContenido((c) => ({ ...c, logros: v }));
              marcar();
            }}
            placeholder="Agregar logro"
          />
        </div>
      </div>

      <div className="card-pop">
        <div className="border-b-2 border-ink bg-canvas px-5 py-3 sm:px-6">
          <h3 className="font-display text-lg font-extrabold text-ink">LinkedIn</h3>
        </div>
        <div className="grid gap-4 p-5 sm:p-6">
          <Field label="Titular" htmlFor="li-titular">
            <Input
              id="li-titular"
              value={linkedin.titular}
              onChange={(e) => {
                setLinkedin((l) => ({ ...l, titular: e.target.value }));
                marcar();
              }}
            />
          </Field>
          <Field label="Acerca de" htmlFor="li-acerca">
            <Textarea
              id="li-acerca"
              className="min-h-32"
              value={linkedin.acerca}
              onChange={(e) => {
                setLinkedin((l) => ({ ...l, acerca: e.target.value }));
                marcar();
              }}
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="accent" size="lg" onClick={guardar} disabled={guardando}>
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {guardado ? "Guardado ✓" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}

function Lista({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [nuevo, setNuevo] = useState("");
  function add() {
    if (nuevo.trim()) {
      onChange([...items, nuevo.trim()]);
      setNuevo("");
    }
  }
  return (
    <div>
      <p className="label-base">{label}</p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <button
              type="button"
              aria-label="Quitar"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-surface text-muted hover:text-danger-500"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
