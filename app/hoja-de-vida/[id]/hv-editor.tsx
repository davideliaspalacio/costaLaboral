"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Plus, X, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { ListaEditable } from "@/components/hv/lista-editable";
import { actualizarHojaDeVida } from "@/lib/actions/hoja-de-vida";
import { ContenidoHVSchema, TituloHVSchema, primerError } from "@/lib/ia/esquemas";
import type { ContenidoHV, ExperienciaHV } from "@/lib/ia/tipos";

/* ============================================================
   Editor de una hoja de vida (planes pagos). Guardar una HV
   aprobada la devuelve a borrador.
   ============================================================ */

type Props = {
  id: string;
  titulo: string;
  contenidoInicial: ContenidoHV;
  estado: "borrador" | "aprobada";
};

export function HvEditor({ id, titulo: tituloInicial, contenidoInicial, estado }: Props) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(tituloInicial);
  const [contenido, setContenido] = useState<ContenidoHV>(contenidoInicial);
  const [guardando, startGuardar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ContenidoHV>(k: K, v: ContenidoHV[K]) {
    setContenido((c) => ({ ...c, [k]: v }));
  }
  function setExp(i: number, cambio: Partial<ExperienciaHV>) {
    setContenido((c) => ({ ...c, experiencia: c.experiencia.map((x, j) => (j === i ? { ...x, ...cambio } : x)) }));
  }

  function guardar() {
    const limpio: ContenidoHV = {
      ...contenido,
      habilidades: contenido.habilidades.map((h) => h.trim()).filter(Boolean),
      educacion: contenido.educacion.map((h) => h.trim()).filter(Boolean),
      logros: contenido.logros.map((h) => h.trim()).filter(Boolean),
      experiencia: contenido.experiencia.map((e) => ({ ...e, logros: e.logros.map((l) => l.trim()).filter(Boolean) })),
    };
    const t = TituloHVSchema.safeParse(titulo);
    const c = ContenidoHVSchema.safeParse(limpio);
    if (!t.success || !c.success) {
      setError(!t.success ? primerError(t.error) : primerError((c as { error: Parameters<typeof primerError>[0] }).error));
      return;
    }
    setError(null);
    startGuardar(async () => {
      const r = await actualizarHojaDeVida(id, { titulo: t.data, contenido: c.data });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      router.push(`/hoja-de-vida/${id}`);
      router.refresh();
    });
  }

  const botonGuardar = (
    <Button type="button" variant="accent" onClick={guardar} disabled={guardando}>
      {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      Guardar cambios
    </Button>
  );

  return (
    <div className="space-y-6">
      {estado === "aprobada" && (
        <p className="flex items-start gap-2 rounded-xl border-2 border-ink bg-warn-50 px-4 py-2.5 text-sm font-semibold text-ink">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Esta hoja de vida está aprobada. Si guardas cambios, vuelve a borrador y tendrás que aprobarla de nuevo.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push(`/hoja-de-vida/${id}`)}>
          Cancelar
        </Button>
        {botonGuardar}
      </div>

      <div className="card-pop">
        <div className="space-y-6 p-5 sm:p-6">
          <Field label="Título de esta hoja de vida" htmlFor="titulo">
            <Input id="titulo" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} />
          </Field>

          <Field label="Perfil profesional" htmlFor="resumen">
            <Textarea id="resumen" className="min-h-24" maxLength={1500} value={contenido.resumen} onChange={(e) => set("resumen", e.target.value)} />
          </Field>

          <ListaEditable label="Habilidades" items={contenido.habilidades} onChange={(v) => set("habilidades", v)} placeholder="Agregar habilidad" max={30} />

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
                      onClick={() => set("experiencia", contenido.experiencia.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" /> Quitar
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input value={e.cargo} aria-label="Cargo" placeholder="Cargo" maxLength={120} onChange={(ev) => setExp(i, { cargo: ev.target.value })} />
                    <Input value={e.empresa} aria-label="Empresa" placeholder="Empresa" maxLength={120} onChange={(ev) => setExp(i, { empresa: ev.target.value })} />
                    <Input value={e.periodo} aria-label="Periodo" placeholder="Periodo" maxLength={60} onChange={(ev) => setExp(i, { periodo: ev.target.value })} />
                  </div>
                  <div className="mt-3">
                    <ListaEditable label="Logros" items={e.logros} onChange={(v) => setExp(i, { logros: v })} placeholder="Agregar logro" max={10} />
                  </div>
                </div>
              ))}
            </div>
            {contenido.experiencia.length < 10 && (
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => set("experiencia", [...contenido.experiencia, { cargo: "", empresa: "", periodo: "", logros: [] }])}
              >
                <Plus className="h-4 w-4" /> Agregar experiencia
              </Button>
            )}
          </div>

          <ListaEditable label="Educación" items={contenido.educacion} onChange={(v) => set("educacion", v)} placeholder="Agregar estudio" max={10} />
          <ListaEditable label="Logros y fortalezas" items={contenido.logros} onChange={(v) => set("logros", v)} placeholder="Agregar logro" max={10} />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border-2 border-ink bg-danger-50 px-4 py-2.5 text-sm font-semibold text-danger-600">
          {error}
        </p>
      )}
      <div className="flex justify-end">{botonGuardar}</div>
    </div>
  );
}
