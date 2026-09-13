import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { infoRequest } from "@/lib/request";
import { log } from "@/lib/log";
import { VERSION_PRIVACIDAD, VERSION_TERMINOS } from "@/lib/legal/documentos";

/* ============================================================
   Evidencia de consentimiento (Ley 1581/2012 art. 9; Decreto
   1377/2013 arts. 5 y 7): qué autorizó, cuándo, con qué versión
   del documento y por qué medio. Append-only: revocar = nueva fila
   con otorgado=false.
   ============================================================ */

export type Finalidad = "tratamiento_datos" | "terminos" | "whatsapp" | "perfil_visible_empresas" | "mayoria_edad";

export type TitularConsentimiento = { id: string; tipo: "candidato" | "empresa" };

export type ItemConsentimiento = { finalidad: Finalidad; otorgado: boolean };

export type ConsentimientoRow = {
  id: string;
  titular_id: string;
  titular_tipo: "candidato" | "empresa";
  finalidad: Finalidad;
  otorgado: boolean;
  version_documento: string;
  canal: string;
  creado_en: string;
};

function versionDe(f: Finalidad): string {
  return f === "terminos" ? VERSION_TERMINOS : VERSION_PRIVACIDAD;
}

/** Guarda la evidencia. Devuelve false si no se pudo (el llamador decide si bloquea el flujo). */
export async function registrarConsentimientos(
  titular: TitularConsentimiento,
  items: ItemConsentimiento[],
  canal: string,
): Promise<boolean> {
  if (items.length === 0) return true;
  try {
    const req = await infoRequest();
    const admin = createAdminClient();
    const { error } = await admin.from("consentimientos").insert(
      items.map((i) => ({
        titular_id: titular.id,
        titular_tipo: titular.tipo,
        finalidad: i.finalidad,
        otorgado: i.otorgado,
        version_documento: versionDe(i.finalidad),
        canal,
        ip: req.ip,
        user_agent: req.userAgent,
      })),
    );
    if (error) throw error;
    return true;
  } catch (err) {
    log.error("consentimiento_fallo", { titularId: titular.id, canal, err });
    return false;
  }
}

/** Historial completo de autorizaciones del titular (más reciente primero). */
export async function getHistorialConsentimientos(titularId: string): Promise<ConsentimientoRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("consentimientos")
    .select("id, titular_id, titular_tipo, finalidad, otorgado, version_documento, canal, creado_en")
    .eq("titular_id", titularId)
    .order("creado_en", { ascending: false });
  return (data ?? []) as ConsentimientoRow[];
}
