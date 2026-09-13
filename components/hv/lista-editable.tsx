"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Lista de textos editable (agregar, editar, quitar). */
export function ListaEditable({
  label,
  items,
  onChange,
  placeholder,
  max,
}: {
  label: string;
  items: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  max?: number;
}) {
  const [nuevo, setNuevo] = useState("");
  const lleno = max !== undefined && items.length >= max;

  function agregar() {
    const v = nuevo.trim();
    if (!v || lleno) return;
    onChange([...items, v]);
    setNuevo("");
  }

  return (
    <div>
      <p className="label-base">
        {label}
        {max !== undefined && <span className="ml-2 text-xs font-semibold text-muted">{items.length}/{max}</span>}
      </p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input
              value={it}
              aria-label={`${label} ${i + 1}`}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button
              type="button"
              aria-label={`Quitar ${label.toLowerCase()} ${i + 1}`}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink bg-surface text-muted hover:text-danger-500"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      {!lleno && (
        <div className="mt-2 flex gap-2">
          <Input
            value={nuevo}
            aria-label={placeholder}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
            placeholder={placeholder}
          />
          <Button type="button" variant="outline" onClick={agregar} aria-label="Agregar">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
