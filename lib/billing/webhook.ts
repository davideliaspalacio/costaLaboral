import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/log";
import { getPasarela } from "@/lib/billing/pasarela";
import { procesarEventoPasarela } from "@/lib/billing/servicio";

/* ============================================================
   Recepción idempotente de webhooks. La usa la ruta
   /api/pagos/webhook/[proveedor] (y el simulador sandbox como
   respaldo si no puede llamarse a sí mismo por HTTP).
   ============================================================ */

export type RespuestaWebhook = { status: number; body: Record<string, unknown> };

function parsear(cuerpo: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(cuerpo);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function manejarWebhook(proveedor: string, headers: Headers, cuerpoCrudo: string): Promise<RespuestaWebhook> {
  const pasarela = getPasarela();
  if (pasarela.id !== proveedor) return { status: 404, body: { error: "proveedor_no_activo" } };

  const admin = createAdminClient();
  const { valida, evento } = await pasarela.verificarWebhook(headers, cuerpoCrudo);
  const payload = parsear(cuerpoCrudo);

  if (!valida) {
    log.warn("webhook_firma_invalida", { proveedor });
    if (payload) {
      // Id propio: un atacante no debe poder "reservar" el id de un evento legítimo.
      await admin.from("webhook_eventos").insert({
        proveedor,
        evento_id: `firma_invalida:${randomUUID()}`,
        tipo: typeof payload.tipo === "string" ? payload.tipo.slice(0, 100) : "desconocido",
        payload,
        firma_valida: false,
        procesado_en: new Date().toISOString(),
        resultado: "rechazado_firma",
      });
    }
    return { status: 401, body: { error: "firma_invalida" } };
  }

  if (!evento || !payload) return { status: 200, body: { ok: true, ignorado: true } };

  const { data: insertado, error: errIns } = await admin
    .from("webhook_eventos")
    .insert({ proveedor, evento_id: evento.id, tipo: evento.tipo, payload, firma_valida: true })
    .select("id")
    .maybeSingle();

  let filaId = insertado?.id as string | undefined;
  if (errIns) {
    if (errIns.code !== "23505") throw errIns;
    const { data: existente } = await admin
      .from("webhook_eventos")
      .select("id, procesado_en, resultado")
      .eq("proveedor", proveedor)
      .eq("evento_id", evento.id)
      .single();
    if (existente?.procesado_en) {
      return { status: 200, body: { ok: true, duplicado: true, resultado: existente.resultado } };
    }
    filaId = existente?.id as string | undefined; // llegó antes pero no terminó: reintenta
  }

  try {
    const r = await procesarEventoPasarela(proveedor, evento);
    await admin
      .from("webhook_eventos")
      .update({ procesado_en: new Date().toISOString(), resultado: r.resultado, error: r.ok ? null : r.error })
      .eq("id", filaId!);
    return { status: 200, body: { ok: true, resultado: r.resultado } };
  } catch (err) {
    log.error("webhook_procesamiento_fallo", { proveedor, eventoId: evento.id, err });
    await admin
      .from("webhook_eventos")
      .update({ error: err instanceof Error ? err.message.slice(0, 500) : "error" })
      .eq("id", filaId!);
    // 500 → el proveedor reintenta; la fila sigue sin procesado_en.
    return { status: 500, body: { error: "procesamiento_fallido" } };
  }
}
