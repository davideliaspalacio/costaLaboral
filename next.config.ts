import type { NextConfig } from "next";

/* ============================================================
   Headers de seguridad (sección 15).

   CSP pragmática SIN nonces: permite 'unsafe-inline' en scripts
   porque Next inyecta scripts inline de hidratación y no usamos
   middleware de nonces. Trade-off: una XSS que logre inyectar HTML
   podría ejecutar script inline. Mitigaciones actuales: React escapa
   todo por defecto, no usamos dangerouslySetInnerHTML con datos de
   usuario (salvo JSON-LD serializado) y frame-ancestors/form-action/
   base-uri/object-src están cerrados.

   Camino a nonces (cuando haya presupuesto de rendimiento): generar
   un nonce por request en proxy.ts, enviar la CSP desde ahí con
   'nonce-…' 'strict-dynamic' y quitar 'unsafe-inline'. Obliga a
   renderizado dinámico de todas las páginas (sin estático/ISR).
   Ver node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md
   ============================================================ */

const isDev = process.env.NODE_ENV === "development";

function origenSupabase(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];
  try {
    const u = new URL(url);
    const ws = `${u.protocol === "https:" ? "wss:" : "ws:"}//${u.host}`;
    return [u.origin, ws];
  } catch {
    return [];
  }
}

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  // next/font/google autoaloja las fuentes: no hace falta fonts.gstatic.com.
  "font-src 'self' data:",
  ["connect-src 'self'", ...origenSupabase(), ...(isDev ? ["ws:"] : [])].join(" "),
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const headersSeguridad = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: headersSeguridad }];
  },
};

export default nextConfig;
