import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type EstadoVacante = "activa" | "pausada" | "cerrada";
export type MotivoCierre = "contratado" | "cerrada" | null;

export type CierreInfo = { cerrada: boolean; motivo: MotivoCierre };

/**
 * Deriva, para un conjunto de vacantes inactivas, si están "cerradas" (con
 * motivo) o solo "pausadas". No hay columna en BD: se infiere del evento
 * `vacante_moderada` más reciente con acción cerrada/reabierta por vacante.
 */
export async function getCierreDeVacantes(vacanteIds: string[]): Promise<Map<string, CierreInfo>> {
  const mapa = new Map<string, CierreInfo>();
  if (vacanteIds.length === 0) return mapa;

  const admin = createAdminClient();
  const { data } = await admin
    .from("eventos")
    .select("entidad_id, meta, creado_en")
    .eq("tipo", "vacante_moderada")
    .eq("entidad", "vacantes")
    .in("entidad_id", vacanteIds)
    .order("creado_en", { ascending: false });

  for (const ev of (data ?? []) as { entidad_id: string; meta: Record<string, unknown> | null }[]) {
    if (mapa.has(ev.entidad_id)) continue; // ya tenemos el más reciente relevante
    const accion = ev.meta?.accion;
    if (accion === "cerrada") {
      const m = ev.meta?.motivo;
      mapa.set(ev.entidad_id, {
        cerrada: true,
        motivo: m === "contratado" || m === "cerrada" ? m : "cerrada",
      });
    } else if (accion === "reabierta") {
      mapa.set(ev.entidad_id, { cerrada: false, motivo: null });
    }
    // "editada" u otras acciones no cambian el estado de cierre → seguir buscando
  }

  return mapa;
}

export function estadoDeVacante(activa: boolean, cierre: CierreInfo | undefined): EstadoVacante {
  if (activa) return "activa";
  if (cierre?.cerrada) return "cerrada";
  return "pausada";
}
