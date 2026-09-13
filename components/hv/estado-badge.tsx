import { BadgeCheck, PencilLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function EstadoContenidoBadge({ estado }: { estado: "borrador" | "aprobada" }) {
  return estado === "aprobada" ? (
    <Badge tone="success">
      <BadgeCheck className="h-3 w-3" /> Aprobada
    </Badge>
  ) : (
    <Badge tone="warn">
      <PencilLine className="h-3 w-3" /> Borrador
    </Badge>
  );
}

/** Aviso cuando la generación no fue 100% IA o se corrigió algo (sin detalles del contenido). */
export function AvisoValidacion({
  estadoIa,
  graves,
}: {
  estadoIa?: string | null;
  graves?: number | null;
}) {
  let texto: string | null = null;
  if (estadoIa === "validacion_fallida") {
    texto = `Revisamos lo que escribió la IA y quitamos ${graves ?? "algunos"} dato(s) que no venían de tus respuestas. Revisa que no falte nada.`;
  } else if (estadoIa === "sin_credenciales" || estadoIa === "error" || estadoIa === "rechazo") {
    texto = "La IA no estaba disponible, así que la armamos solo con tus respuestas. Puedes pulir la redacción al editar.";
  }
  if (!texto) return null;
  return <p className="rounded-xl border-2 border-ink bg-warn-50 px-4 py-2.5 text-sm font-semibold text-ink">{texto}</p>;
}
