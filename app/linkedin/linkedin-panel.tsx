"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ListaEditable } from "@/components/hv/lista-editable";
import { actualizarLinkedIn, generarLinkedIn } from "@/lib/actions/linkedin";
import { ContenidoLinkedInSchema, primerError } from "@/lib/ia/esquemas";
import type { ContenidoLinkedIn, NivelLinkedIn } from "@/lib/ia/tipos";

type Props = {
  nivel: NivelLinkedIn;
  contenido: ContenidoLinkedIn | null;
  estado: "borrador" | "aprobada" | null;
  hojas: { id: string; titulo: string }[];
  fuenteActual: string | null;
  cuota: { usadas: number; limite: number; restantes: number; agotada: boolean };
};

const FUENTE_PERFIL = "perfil";

export function LinkedinPanel({ nivel, contenido: inicial, estado, hojas, fuenteActual, cuota }: Props) {
  const router = useRouter();
  const [fuente, setFuente] = useState<string>(fuenteActual ?? hojas[0]?.id ?? FUENTE_PERFIL);
  const [contenido, setContenido] = useState<ContenidoLinkedIn | null>(inicial);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [generando, startGenerar] = useTransition();
  const [guardando, startGuardar] = useTransition();

  function generar() {
    if (inicial && !window.confirm("Esto reemplaza tu perfil de LinkedIn actual. ¿Seguimos?")) return;
    setError(null);
    setAviso(null);
    startGenerar(async () => {
      const r = await generarLinkedIn({ hojaDeVidaId: fuente === FUENTE_PERFIL ? null : fuente });
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  function set<K extends keyof ContenidoLinkedIn>(k: K, v: ContenidoLinkedIn[K]) {
    setContenido((c) => (c ? { ...c, [k]: v } : c));
    setAviso(null);
  }

  function guardar() {
    if (!contenido) return;
    const parsed = ContenidoLinkedInSchema.safeParse(contenido);
    if (!parsed.success) {
      setError(primerError(parsed.error));
      return;
    }
    setError(null);
    startGuardar(async () => {
      const r = await actualizarLinkedIn(parsed.data);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setAviso(estado === "aprobada" ? "Guardado. Tu perfil volvió a borrador: apruébalo de nuevo para copiarlo." : "Guardado.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Generación */}
      <div className="card-pop p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          <Field label="¿De dónde partimos?" htmlFor="fuente" className="md:max-w-md" hint="Recomendado: una hoja de vida aprobada.">
            <Select id="fuente" value={fuente} onChange={(e) => setFuente(e.target.value)} disabled={generando}>
              {hojas.map((h) => (
                <option key={h.id} value={h.id}>
                  Hoja de vida: {h.titulo}
                </option>
              ))}
              <option value={FUENTE_PERFIL}>Mi perfil de CostaLaboral</option>
            </Select>
          </Field>
          <Button type="button" variant="accent" size="lg" onClick={generar} disabled={generando || cuota.agotada}>
            {generando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            {generando ? "Redactando…" : inicial ? "Generar de nuevo" : "Generar mi LinkedIn"}
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted">
          {cuota.agotada
            ? `Ya usaste tus ${cuota.limite} generaciones de este mes.`
            : `Te quedan ${cuota.restantes} de ${cuota.limite} generaciones este mes.`}
          {hojas.length === 0 && " Aún no tienes hojas de vida aprobadas: usaremos tu perfil."}
        </p>
        {generando && (
          <p role="status" className="mt-3 text-sm font-semibold text-brand-700">
            Esto puede tardar hasta un minuto. Después revisamos que no aparezca nada que no esté en tu información.
          </p>
        )}
      </div>

      {/* Edición */}
      {contenido && (
        <div className="card-pop">
          <div className="border-b-2 border-ink bg-canvas px-5 py-3 sm:px-6">
            <h2 className="font-display text-lg font-extrabold text-ink">Revisa y ajusta</h2>
            <p className="text-xs text-muted">Corrige cualquier cosa que no sea exacta antes de aprobar.</p>
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            <Field label={`Titular (${contenido.titular.length}/220)`} htmlFor="li-titular">
              <Input id="li-titular" value={contenido.titular} maxLength={220} onChange={(e) => set("titular", e.target.value)} />
            </Field>
            <Field label={`Acerca de (${contenido.acerca.length}/2600)`} htmlFor="li-acerca">
              <Textarea id="li-acerca" className="min-h-40" maxLength={2600} value={contenido.acerca} onChange={(e) => set("acerca", e.target.value)} />
            </Field>

            {nivel === "avanzado" && (
              <>
                <ListaEditable
                  label="Titulares alternativos"
                  items={contenido.titulares_alternativos ?? []}
                  onChange={(v) => set("titulares_alternativos", v)}
                  placeholder="Agregar titular"
                  max={3}
                />
                <ListaEditable
                  label="Habilidades priorizadas"
                  items={contenido.habilidades ?? []}
                  onChange={(v) => set("habilidades", v)}
                  placeholder="Agregar habilidad"
                  max={10}
                />
                {(contenido.experiencias ?? []).length > 0 && (
                  <div>
                    <p className="label-base">Descripción por experiencia</p>
                    <div className="space-y-3">
                      {(contenido.experiencias ?? []).map((e, i) => (
                        <Field key={i} label={[e.cargo, e.empresa].filter(Boolean).join(" — ")} htmlFor={`li-exp-${i}`}>
                          <Textarea
                            id={`li-exp-${i}`}
                            className="min-h-24"
                            maxLength={2000}
                            value={e.descripcion}
                            onChange={(ev) =>
                              set(
                                "experiencias",
                                (contenido.experiencias ?? []).map((x, j) => (j === i ? { ...x, descripcion: ev.target.value } : x)),
                              )
                            }
                          />
                        </Field>
                      ))}
                    </div>
                  </div>
                )}
                <ListaEditable
                  label="Palabras clave sugeridas"
                  items={contenido.palabras_clave ?? []}
                  onChange={(v) => set("palabras_clave", v)}
                  placeholder="Agregar palabra clave"
                  max={15}
                />
              </>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3">
              {aviso && <p className="text-sm font-semibold text-success-600">{aviso}</p>}
              <Button type="button" variant="primary" onClick={guardar} disabled={guardando}>
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border-2 border-ink bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
