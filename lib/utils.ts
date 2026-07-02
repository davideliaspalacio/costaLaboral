import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind resolviendo conflictos. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formatea un valor en pesos colombianos sin decimales. Ej: 1500000 -> "$1.500.000". */
export function formatCOP(value: number | null | undefined): string {
  if (value == null) return "A convenir";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Rango salarial legible a partir de min/max. */
export function formatSalario(min: number | null, max: number | null): string {
  if (!min && !max) return "Salario a convenir";
  if (min && max && max > min) return `${formatCOP(min)} – ${formatCOP(max)}`;
  return formatCOP(min ?? max);
}

/** "hace 3 días", "hoy", etc. */
export function tiempoRelativo(fecha: string | Date): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  const diffMs = Date.now() - d.getTime();
  const dias = Math.floor(diffMs / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  if (dias < 30) return `hace ${Math.floor(dias / 7)} sem`;
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

/** Genera un enlace wa.me con mensaje pre-cargado. */
export function waLink(whatsapp: string, mensaje: string): string {
  const num = whatsapp.replace(/[^\d]/g, "");
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`;
}

/** Iniciales para avatares. */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
