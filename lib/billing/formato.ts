/* Formatos de presentación de pagos (puros, usables en cliente y servidor). */
import { PRODUCTOS, esProductoCodigo } from "@/lib/billing/catalogo";

export function formatFecha(fecha: string | Date | null | undefined): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  });
}

export function nombreProducto(codigo: string): string {
  return esProductoCodigo(codigo) ? PRODUCTOS[codigo].nombre : codigo;
}

export const CONCEPTO_LABEL: Record<string, string> = {
  suscripcion: "Suscripción",
  renovacion: "Renovación",
  vacante_destacada: "Vacante destacada",
  addon: "Adicional",
};
