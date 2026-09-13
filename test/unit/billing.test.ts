import { describe, expect, test } from "vitest";
import {
  accionCompraSuscripcion,
  calcularPeriodo,
  decidirVencimiento,
  estadoPagoDeEvento,
  extenderDestacada,
  fechaBogota,
  generarReferencia,
  inicioMesBogota,
  montoCoincide,
  puedeRecomprarMismoPlan,
  puedeTransicionarPago,
  puedeTransicionarSuscripcion,
  REGEX_REFERENCIA,
  TIPOS_EVENTO_PASARELA,
  type EstadoPago,
} from "@/lib/billing/estados";
import { firmaValida, firmarHmac } from "@/lib/billing/firma";
import {
  checkoutSandboxValido,
  firmarCheckoutSandbox,
  firmarEventoSandbox,
  verificarEventoSandbox,
} from "@/lib/billing/proveedores/sandbox";
import { DIAS_GRACIA_PAST_DUE } from "@/lib/entitlements";

const DIA = 86_400_000;
const AHORA = new Date("2026-09-13T15:00:00Z");

describe("transiciones de pago", () => {
  const todos: EstadoPago[] = ["pendiente", "aprobado", "fallido", "reembolsado", "anulado"];

  test("pendiente → aprobado | fallido | anulado", () => {
    expect(puedeTransicionarPago("pendiente", "aprobado")).toBe(true);
    expect(puedeTransicionarPago("pendiente", "fallido")).toBe(true);
    expect(puedeTransicionarPago("pendiente", "anulado")).toBe(true);
    expect(puedeTransicionarPago("pendiente", "reembolsado")).toBe(false);
  });

  test("aprobado solo → reembolsado", () => {
    expect(todos.filter((h) => puedeTransicionarPago("aprobado", h))).toEqual(["reembolsado"]);
  });

  test("nada sale de fallido, anulado ni reembolsado", () => {
    for (const desde of ["fallido", "anulado", "reembolsado"] as const) {
      for (const hacia of todos) expect(puedeTransicionarPago(desde, hacia)).toBe(false);
    }
  });

  test("cada evento normalizado lleva a un estado", () => {
    expect(TIPOS_EVENTO_PASARELA.map(estadoPagoDeEvento)).toEqual(["aprobado", "fallido", "anulado", "reembolsado"]);
  });

  test("monto y moneda deben coincidir", () => {
    expect(montoCoincide({ monto: 29900, moneda: "COP" }, { montoCop: 29900, moneda: "cop" })).toBe(true);
    expect(montoCoincide({ monto: 29900, moneda: "COP" }, { montoCop: 100, moneda: "COP" })).toBe(false);
    expect(montoCoincide({ monto: 29900, moneda: "COP" }, { montoCop: 29900, moneda: "USD" })).toBe(false);
  });
});

describe("transiciones de suscripción", () => {
  test("canceled y expired son finales", () => {
    expect(puedeTransicionarSuscripcion("canceled", "active")).toBe(false);
    expect(puedeTransicionarSuscripcion("expired", "active")).toBe(false);
  });
  test("past_due puede volver a active al pagar", () => {
    expect(puedeTransicionarSuscripcion("past_due", "active")).toBe(true);
  });

  test("acción al comprar", () => {
    expect(accionCompraSuscripcion(null, "camelleitor")).toBe("crear");
    expect(accionCompraSuscripcion({ plan: "camelleitor", estado: "active" }, "camelleitor")).toBe("renovar");
    expect(accionCompraSuscripcion({ plan: "camelleitor", estado: "past_due" }, "camelleitor")).toBe("renovar");
    expect(accionCompraSuscripcion({ plan: "camelleitor", estado: "active" }, "berraco_pro")).toBe("cambiar");
    expect(accionCompraSuscripcion({ plan: "camelleitor", estado: "expired" }, "camelleitor")).toBe("crear");
  });

  test("recompra del mismo plan solo a ≤ 7 días del fin o en past_due", () => {
    const en = (dias: number) => new Date(AHORA.getTime() + dias * DIA).toISOString();
    expect(puedeRecomprarMismoPlan({ estado: "active", periodo_fin: en(30) }, AHORA)).toBe(false);
    expect(puedeRecomprarMismoPlan({ estado: "active", periodo_fin: en(7) }, AHORA)).toBe(true);
    expect(puedeRecomprarMismoPlan({ estado: "past_due", periodo_fin: en(-1) }, AHORA)).toBe(true);
  });
});

describe("cálculo de periodos", () => {
  test("suscripción nueva: ahora + periodoDias", () => {
    const { inicio, fin } = calcularPeriodo(AHORA, 90);
    expect(inicio).toEqual(AHORA);
    expect(fin.getTime() - AHORA.getTime()).toBe(90 * DIA);
  });

  test("renovación anticipada: corre desde el fin actual", () => {
    const finActual = new Date(AHORA.getTime() + 5 * DIA);
    expect(calcularPeriodo(AHORA, 90, finActual).fin.getTime()).toBe(finActual.getTime() + 90 * DIA);
  });

  test("renovación tardía (past_due): corre desde ahora", () => {
    const finActual = new Date(AHORA.getTime() - 2 * DIA);
    expect(calcularPeriodo(AHORA, 30, finActual).fin.getTime()).toBe(AHORA.getTime() + 30 * DIA);
  });

  test("destacada: max(ahora, destacada_hasta) + días", () => {
    expect(extenderDestacada(AHORA, null, 7).getTime()).toBe(AHORA.getTime() + 7 * DIA);
    const vencida = new Date(AHORA.getTime() - DIA).toISOString();
    expect(extenderDestacada(AHORA, vencida, 7).getTime()).toBe(AHORA.getTime() + 7 * DIA);
    const vigente = new Date(AHORA.getTime() + 3 * DIA).toISOString();
    expect(extenderDestacada(AHORA, vigente, 15).getTime()).toBe(AHORA.getTime() + 18 * DIA);
  });
});

describe("vencimientos", () => {
  const fin = (dias: number) => new Date(AHORA.getTime() + dias * DIA).toISOString();

  test("active vigente no cambia", () => {
    expect(decidirVencimiento({ estado: "active", periodo_fin: fin(1), cancelar_al_final: false }, AHORA)).toBe("nada");
  });
  test("active vencida → past_due, o expirar si canceló la renovación", () => {
    expect(decidirVencimiento({ estado: "active", periodo_fin: fin(-0.1), cancelar_al_final: false }, AHORA)).toBe("past_due");
    expect(decidirVencimiento({ estado: "active", periodo_fin: fin(-0.1), cancelar_al_final: true }, AHORA)).toBe("expirar");
  });
  test("past_due expira después de la gracia", () => {
    const dentro = fin(-(DIAS_GRACIA_PAST_DUE - 1));
    const fuera = fin(-(DIAS_GRACIA_PAST_DUE + 1));
    expect(decidirVencimiento({ estado: "past_due", periodo_fin: dentro, cancelar_al_final: false }, AHORA)).toBe("nada");
    expect(decidirVencimiento({ estado: "past_due", periodo_fin: fuera, cancelar_al_final: false }, AHORA)).toBe("expirar");
    expect(decidirVencimiento({ estado: "past_due", periodo_fin: dentro, cancelar_al_final: true }, AHORA)).toBe("expirar");
  });
});

describe("referencias y fechas", () => {
  test("formato CL-AAAAMMDD-XXXXXX en hora de Colombia", () => {
    // 2026-09-14 02:00 UTC = 13 sep 21:00 en Bogotá
    const ref = generarReferencia(new Date("2026-09-14T02:00:00Z"), (n) => new Uint8Array(n).fill(0));
    expect(ref).toBe("CL-20260913-AAAAAA");
    expect(REGEX_REFERENCIA.test(generarReferencia())).toBe(true);
  });
  test("referencias aleatorias distintas", () => {
    const refs = new Set(Array.from({ length: 200 }, () => generarReferencia(AHORA)));
    expect(refs.size).toBe(200);
  });
  test("inicio de mes en Bogotá", () => {
    expect(fechaBogota(new Date("2026-10-01T03:00:00Z"))).toBe("20260930");
    expect(inicioMesBogota(new Date("2026-10-01T03:00:00Z")).toISOString()).toBe("2026-09-01T05:00:00.000Z");
  });
});

describe("firmas HMAC", () => {
  const S = "secreto-de-prueba";

  test("firma válida y comparación estricta", () => {
    const f = firmarHmac(S, "hola");
    expect(firmaValida(S, "hola", f)).toBe(true);
    expect(firmaValida(S, "hola!", f)).toBe(false);
    expect(firmaValida("otro", "hola", f)).toBe(false);
    expect(firmaValida(S, "hola", f.slice(0, -2))).toBe(false);
    expect(firmaValida(S, "hola", null)).toBe(false);
    expect(firmaValida(S, "hola", "no-hex")).toBe(false);
  });

  test("checkout sandbox: el monto no se puede alterar en la URL", () => {
    const firma = firmarCheckoutSandbox("CL-20260913-ABCDEF", 29900, S);
    expect(checkoutSandboxValido("CL-20260913-ABCDEF", 29900, firma, S)).toBe(true);
    expect(checkoutSandboxValido("CL-20260913-ABCDEF", 100, firma, S)).toBe(false);
    expect(checkoutSandboxValido("CL-20260913-ZZZZZZ", 29900, firma, S)).toBe(false);
  });

  test("webhook sandbox: firma sobre el cuerpo crudo", () => {
    const evento = {
      id: "evt_1",
      tipo: "transaccion.aprobada" as const,
      referencia: "CL-20260913-ABCDEF",
      externalId: "txn_1",
      montoCop: 29900,
      moneda: "COP",
      ocurridoEn: AHORA.toISOString(),
    };
    const { cuerpo, firma } = firmarEventoSandbox(evento, S);
    expect(verificarEventoSandbox(firma, cuerpo, S)).toEqual({ valida: true, evento });
    expect(verificarEventoSandbox(firma, cuerpo.replace("29900", "100"), S).valida).toBe(false);
    expect(verificarEventoSandbox(null, cuerpo, S)).toEqual({ valida: false, evento: null });
    const raro = JSON.stringify({ ...evento, tipo: "otra.cosa" });
    expect(verificarEventoSandbox(firmarHmac(S, raro), raro, S)).toEqual({ valida: true, evento: null });
  });
});
