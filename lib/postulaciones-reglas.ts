/* Reglas puras de transición del estado de una postulación. */
import { ESTADOS_PIPELINE_EMPRESA, type EstadoPostulacion } from "./constants";

export type ActorPostulacion = "candidato" | "empresa" | "admin";

/** Estados en los que el candidato todavía puede retirarse. */
export const ESTADOS_RETIRABLES: EstadoPostulacion[] = ["enviada", "vista", "contactado", "en_entrevista"];

/**
 * - Candidato: solo puede retirarse, y solo desde un estado abierto.
 * - Empresa: mueve entre los estados del pipeline (puede corregir un contratado/descartado),
 *   nunca a "retirada" ni desde "retirada".
 * - Admin: cualquier cambio distinto del actual.
 */
export function transicionPermitida(actor: ActorPostulacion, desde: EstadoPostulacion, hacia: EstadoPostulacion): boolean {
  if (desde === hacia) return false;
  if (actor === "admin") return true;
  if (actor === "candidato") return hacia === "retirada" && ESTADOS_RETIRABLES.includes(desde);
  return desde !== "retirada" && hacia !== "retirada" && ESTADOS_PIPELINE_EMPRESA.includes(hacia);
}
