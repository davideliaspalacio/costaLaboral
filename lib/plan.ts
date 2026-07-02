/* ============================================================
   Lógica de límites por plan (sección 4.4).
   - gratis: 3 postulaciones / 90 días desde creado_en
   - camelleitor: 15 / 90 días desde plan_vence-90 (fecha de pago)
   - berraco_pro: ilimitado durante los 90 días del plan
   El contador se reinicia cada 90 días, no mensualmente.
   ============================================================ */
import { PLANES, PLAN_DURACION_DIAS, type PlanId } from "./constants";
import type { Candidato } from "./types";

export type EstadoPlan = {
  plan: PlanId;
  planActivo: boolean; // false si un plan pago venció (vuelve a gratis)
  limite: number | null; // null = ilimitado
  usadas: number;
  restantes: number | null; // null = ilimitado
  puedeAplicar: boolean;
  ventanaInicio: Date; // inicio del periodo de 90 días vigente
  ventanaFin: Date;
};

const DIA_MS = 86_400_000;

/**
 * Calcula el estado del plan a partir del candidato y del número real de
 * postulaciones hechas dentro de la ventana de 90 días vigente.
 */
export function estadoPlan(candidato: Candidato, postulacionesEnVentana: number): EstadoPlan {
  const ahora = Date.now();
  const vencePago = candidato.plan_vence ? new Date(candidato.plan_vence).getTime() : null;
  const pagoVigente =
    candidato.plan !== "gratis" && vencePago != null && vencePago > ahora;

  const planEfectivo: PlanId = pagoVigente ? candidato.plan : "gratis";
  const def = PLANES[planEfectivo];

  // Ventana de 90 días: para pago arranca en la fecha de pago (vence-90);
  // para gratis, en el múltiplo de 90 días desde el registro.
  let ventanaInicio: Date;
  if (pagoVigente && vencePago != null) {
    ventanaInicio = new Date(vencePago - PLAN_DURACION_DIAS * DIA_MS);
  } else {
    const creado = new Date(candidato.creado_en).getTime();
    const ciclos = Math.floor((ahora - creado) / (PLAN_DURACION_DIAS * DIA_MS));
    ventanaInicio = new Date(creado + ciclos * PLAN_DURACION_DIAS * DIA_MS);
  }
  const ventanaFin = new Date(ventanaInicio.getTime() + PLAN_DURACION_DIAS * DIA_MS);

  const limite = def.postulaciones;
  const restantes = limite == null ? null : Math.max(0, limite - postulacionesEnVentana);
  const puedeAplicar = limite == null || postulacionesEnVentana < limite;

  return {
    plan: planEfectivo,
    planActivo: pagoVigente,
    limite,
    usadas: postulacionesEnVentana,
    restantes,
    puedeAplicar,
    ventanaInicio,
    ventanaFin,
  };
}

/** ¿Qué puede VER el candidato en la ficha de vacante según su plan? (sección 4.3) */
export function visibilidadFicha(plan: PlanId, puedeAplicar: boolean) {
  const esPago = plan !== "gratis";
  return {
    verEmpresa: esPago,
    verRequisitosCompletos: esPago,
    verMatchIA: plan === "berraco_pro",
    botonAplicarActivo: puedeAplicar,
    muroPago: !puedeAplicar,
  };
}
