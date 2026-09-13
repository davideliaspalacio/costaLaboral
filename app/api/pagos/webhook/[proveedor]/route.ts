import { NextResponse } from "next/server";
import { limitar } from "@/lib/rate-limit";
import { log } from "@/lib/log";
import { manejarWebhook } from "@/lib/billing/webhook";

export const dynamic = "force-dynamic";

const SIN_CACHE = { "cache-control": "no-store" };

export async function POST(req: Request, ctx: { params: Promise<{ proveedor: string }> }) {
  const { proveedor } = await ctx.params;
  if (!/^[a-z0-9_-]{1,40}$/.test(proveedor)) {
    return NextResponse.json({ error: "proveedor_invalido" }, { status: 404, headers: SIN_CACHE });
  }

  const limite = await limitar("webhook", proveedor);
  if (!limite.permitido) {
    return NextResponse.json(
      { error: "limite_tasa" },
      { status: 429, headers: { ...SIN_CACHE, "retry-after": String(limite.reintentarEnSeg) } },
    );
  }

  const cuerpo = await req.text();
  if (cuerpo.length > 64_000) {
    return NextResponse.json({ error: "cuerpo_demasiado_grande" }, { status: 413, headers: SIN_CACHE });
  }

  try {
    const r = await manejarWebhook(proveedor, req.headers, cuerpo);
    return NextResponse.json(r.body, { status: r.status, headers: SIN_CACHE });
  } catch (err) {
    log.error("webhook_error", { proveedor, err });
    return NextResponse.json({ error: "error_interno" }, { status: 500, headers: SIN_CACHE });
  }
}
