import { describe, expect, test } from "vitest";
import { semaforoSolicitud, planInfo, tonoAccion, valorLegible } from "@/components/admin/labels";
import { PERMISOS, PERMISOS_TODOS, puede } from "@/lib/roles-shared";
import { PLAZOS_HABEAS_DATA, claseSolicitud, sumarDiasHabiles } from "@/lib/legal/dias-habiles";

describe("semáforo de solicitudes de titulares", () => {
  // Lunes 14 sep 2026, 10:00 Bogotá.
  const ahora = new Date("2026-09-14T15:00:00Z");

  test("atendidas no alertan aunque estén vencidas", () => {
    expect(semaforoSolicitud("2026-01-01T00:00:00Z", "respondida", ahora)).toBe("atendida");
    expect(semaforoSolicitud("2026-01-01T00:00:00Z", "cerrada", ahora)).toBe("atendida");
  });

  test("vencida, por vencer (≤ 3 días hábiles) y en plazo", () => {
    expect(semaforoSolicitud("2026-09-14T14:00:00Z", "recibida", ahora)).toBe("vencida");
    // 3 días hábiles desde el lunes 14 = jueves 17 (fin del día).
    expect(semaforoSolicitud("2026-09-18T04:59:00Z", "en_tramite", ahora)).toBe("por_vencer");
    expect(semaforoSolicitud("2026-09-18T15:00:00Z", "en_tramite", ahora)).toBe("en_plazo");
  });

  test("prórroga: suma los días hábiles de la clase al vencimiento", () => {
    const vence = new Date("2026-09-25T04:59:59.999Z"); // fin del jueves 24 sep
    const consulta = sumarDiasHabiles(vence, PLAZOS_HABEAS_DATA[claseSolicitud("consulta")].prorroga);
    expect(consulta.toISOString()).toBe("2026-10-02T04:59:59.999Z"); // 5 hábiles → jueves 1 oct
    const reclamo = sumarDiasHabiles(vence, PLAZOS_HABEAS_DATA[claseSolicitud("supresion")].prorroga);
    // 8 hábiles desde el 24 sep (lunes 12 oct es festivo) → miércoles 7 oct
    expect(reclamo.toISOString()).toBe("2026-10-07T04:59:59.999Z");
  });
});

describe("roles del panel", () => {
  test("super_admin tiene todo; admin no gestiona staff ni reembolsa; moderador solo ve y modera", () => {
    for (const p of PERMISOS_TODOS) expect(puede("super_admin", p)).toBe(true);
    expect(puede("admin", "gestionar_staff")).toBe(false);
    expect(puede("admin", "reembolsar")).toBe(false);
    for (const p of ["ver", "moderar", "verificar", "gestionar_usuarios", "ver_auditoria", "ver_pagos", "ver_ia", "atender_solicitudes", "ver_kpis"] as const) {
      expect(puede("admin", p)).toBe(true);
    }
    expect([...PERMISOS.moderador]).toEqual(["ver", "moderar"]);
    expect(puede(null, "ver")).toBe(false);
  });
});

describe("etiquetas", () => {
  test("planes, tonos de acción y valores", () => {
    expect(planInfo("berraco_pro")).toEqual({ label: "Berraco Pro", tone: "accent" });
    expect(planInfo("pro").label).toBe("Empresa Pro");
    expect(tonoAccion("empresa.verificacion_rechazada")).toBe("danger");
    expect(tonoAccion("empresa.verificada")).toBe("success");
    expect(tonoAccion("vacante.moderada")).toBe("warn");
    expect(valorLegible(null)).toBe("—");
    expect(valorLegible(true)).toBe("Sí");
    expect(valorLegible({ a: 1 })).toBe('{"a":1}');
  });
});
