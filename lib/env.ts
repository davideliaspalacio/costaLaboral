import { z } from "zod";

/* ============================================================
   Validación de variables de entorno. Nunca devuelve ni imprime
   valores: solo nombres de variables y el problema.
   Se invoca desde instrumentation.ts al arrancar el servidor.
   ============================================================ */

const url = z.string().trim().url("debe ser una URL válida");
const noVacia = z.string().trim().min(1, "está vacía");

const OBLIGATORIAS = {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: noVacia,
  SUPABASE_SERVICE_ROLE_KEY: noVacia,
  NEXT_PUBLIC_SITE_URL: url,
} as const;

const OBLIGATORIAS_PRODUCCION = {
  CRON_SECRET: z.string().trim().min(16, "debe tener al menos 16 caracteres"),
} as const;

const OPCIONALES = {
  ADMIN_EMAILS: z
    .string()
    .trim()
    .refine(
      (v) => v.split(",").map((e) => e.trim()).filter(Boolean).every((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
      "debe ser una lista de correos separados por coma",
    ),
  ANTHROPIC_API_KEY: noVacia,
  ANTHROPIC_MODEL: noVacia,
  PAGOS_PROVEEDOR: z.enum(["sandbox", "wompi"], { message: "debe ser 'sandbox' o 'wompi'" }),
  PAGOS_SANDBOX_SECRET: z.string().trim().min(16, "debe tener al menos 16 caracteres"),
  TRM_COP_USD: z.coerce.number().positive("debe ser un número positivo"),
  NEXT_PUBLIC_LEGAL_RAZON_SOCIAL: noVacia,
  NEXT_PUBLIC_LEGAL_NIT: noVacia,
  NEXT_PUBLIC_LEGAL_DOMICILIO: noVacia,
  NEXT_PUBLIC_LEGAL_DIRECCION: noVacia,
  NEXT_PUBLIC_LEGAL_EMAIL_DATOS: z.string().trim().email("debe ser un correo válido"),
  NEXT_PUBLIC_LEGAL_TELEFONO: noVacia,
} as const;

/** Datos legales que, si faltan en producción, dejan "[… POR DEFINIR]" visible en las políticas. */
const LEGALES_RECOMENDADAS = [
  "NEXT_PUBLIC_LEGAL_RAZON_SOCIAL",
  "NEXT_PUBLIC_LEGAL_NIT",
  "NEXT_PUBLIC_LEGAL_DIRECCION",
  "NEXT_PUBLIC_LEGAL_EMAIL_DATOS",
  "NEXT_PUBLIC_LEGAL_TELEFONO",
] as const;

export type ResultadoEntorno = {
  ok: boolean;
  /** Obligatorias ausentes o inválidas. */
  errores: string[];
  /** Opcionales inválidas o recomendadas ausentes. */
  advertencias: string[];
};

type Fuente = Record<string, string | undefined>;

function presente(v: string | undefined): v is string {
  return v != null && v.trim() !== "";
}

export function validarEntorno(
  env: Fuente = process.env,
  produccion: boolean = process.env.NODE_ENV === "production",
): ResultadoEntorno {
  const errores: string[] = [];
  const advertencias: string[] = [];

  const obligatorias: Record<string, z.ZodType> = {
    ...OBLIGATORIAS,
    ...(produccion ? OBLIGATORIAS_PRODUCCION : {}),
  };

  for (const [nombre, esquema] of Object.entries(obligatorias)) {
    const valor = env[nombre];
    if (!presente(valor)) {
      errores.push(`${nombre}: falta`);
      continue;
    }
    const r = esquema.safeParse(valor);
    if (!r.success) errores.push(`${nombre}: ${r.error.issues[0]?.message ?? "inválida"}`);
  }

  if (!produccion && !presente(env.CRON_SECRET)) {
    advertencias.push("CRON_SECRET: falta (las rutas /api/cron quedan abiertas fuera de producción)");
  }

  for (const [nombre, esquema] of Object.entries(OPCIONALES)) {
    const valor = env[nombre];
    if (!presente(valor)) continue;
    const r = (esquema as z.ZodType).safeParse(valor);
    if (!r.success) advertencias.push(`${nombre}: ${r.error.issues[0]?.message ?? "inválida"}`);
  }

  if (produccion) {
    if (!presente(env.ANTHROPIC_API_KEY)) advertencias.push("ANTHROPIC_API_KEY: falta (la IA usará el modo sin credenciales)");
    for (const nombre of LEGALES_RECOMENDADAS) {
      if (!presente(env[nombre])) advertencias.push(`${nombre}: falta (el dato aparecerá "POR DEFINIR" en las políticas)`);
    }
    if (env.PAGOS_PROVEEDOR === "sandbox" || !presente(env.PAGOS_PROVEEDOR)) {
      advertencias.push("PAGOS_PROVEEDOR: pasarela de prueba activa en producción");
    }
  }

  return { ok: errores.length === 0, errores, advertencias };
}
