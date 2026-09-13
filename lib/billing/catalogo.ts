/* ============================================================
   Catálogo de productos y precios (sección 9: catálogo separado
   de las reglas de beneficios, que viven en lib/entitlements.ts).
   Precios en COP, IVA incluido. Son hipótesis de piloto.
   ============================================================ */
import type { PlanEmpresaId, PlanId } from "@/lib/constants";

export type Audiencia = "candidato" | "empresa";
export type ConceptoPago = "suscripcion" | "renovacion" | "vacante_destacada" | "addon";

export type ProductoCodigo =
  | "plan_camelleitor"
  | "plan_berraco_pro"
  | "plan_empresa_pro"
  | "destacada_7d"
  | "destacada_15d"
  | "destacada_30d";

export type Producto = {
  codigo: ProductoCodigo;
  nombre: string;
  descripcion: string;
  audiencia: Audiencia;
  tipo: "suscripcion" | "compra_unica";
  concepto: ConceptoPago;
  precioCop: number;
  /** Suscripciones: duración de cada periodo. */
  periodoDias?: number;
  /** Suscripciones: plan que otorga. */
  plan?: PlanId | PlanEmpresaId;
  /** Destacadas: días de exposición. */
  duracionDias?: number;
};

export const PRODUCTOS: Record<ProductoCodigo, Producto> = {
  plan_camelleitor: {
    codigo: "plan_camelleitor",
    nombre: "Camelleitor",
    descripcion: "Hoja de vida con IA, versión por vacante, LinkedIn y mayor visibilidad.",
    audiencia: "candidato",
    tipo: "suscripcion",
    concepto: "suscripcion",
    precioCop: 29900,
    periodoDias: 90,
    plan: "camelleitor",
  },
  plan_berraco_pro: {
    codigo: "plan_berraco_pro",
    nombre: "Berraco Pro",
    descripcion: "Todo Camelleitor + versiones ilimitadas, LinkedIn avanzado y visibilidad prioritaria.",
    audiencia: "candidato",
    tipo: "suscripcion",
    concepto: "suscripcion",
    precioCop: 49900,
    periodoDias: 90,
    plan: "berraco_pro",
  },
  plan_empresa_pro: {
    codigo: "plan_empresa_pro",
    nombre: "Empresa Pro",
    descripcion: "Analítica, filtros del pipeline, exportación y acceso ampliado a candidatos.",
    audiencia: "empresa",
    tipo: "suscripcion",
    concepto: "suscripcion",
    precioCop: 99000,
    periodoDias: 30,
    plan: "pro",
  },
  destacada_7d: {
    codigo: "destacada_7d",
    nombre: "Vacante destacada · 7 días",
    descripcion: "Tu vacante aparece primero en el portal y en las recomendaciones durante 7 días.",
    audiencia: "empresa",
    tipo: "compra_unica",
    concepto: "vacante_destacada",
    precioCop: 19900,
    duracionDias: 7,
  },
  destacada_15d: {
    codigo: "destacada_15d",
    nombre: "Vacante destacada · 15 días",
    descripcion: "Tu vacante aparece primero en el portal y en las recomendaciones durante 15 días.",
    audiencia: "empresa",
    tipo: "compra_unica",
    concepto: "vacante_destacada",
    precioCop: 34900,
    duracionDias: 15,
  },
  destacada_30d: {
    codigo: "destacada_30d",
    nombre: "Vacante destacada · 30 días",
    descripcion: "Tu vacante aparece primero en el portal y en las recomendaciones durante 30 días.",
    audiencia: "empresa",
    tipo: "compra_unica",
    concepto: "vacante_destacada",
    precioCop: 59900,
    duracionDias: 30,
  },
};

export const PRODUCTOS_DESTACADA: ProductoCodigo[] = ["destacada_7d", "destacada_15d", "destacada_30d"];

export function esProductoCodigo(v: string): v is ProductoCodigo {
  return v in PRODUCTOS;
}

export function productoDePlan(plan: PlanId | PlanEmpresaId, audiencia: Audiencia): Producto | null {
  return Object.values(PRODUCTOS).find((p) => p.tipo === "suscripcion" && p.plan === plan && p.audiencia === audiencia) ?? null;
}
