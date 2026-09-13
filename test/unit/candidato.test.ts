import { describe, expect, test } from "vitest";
import {
  normalizarWhatsapp,
  esquemaRegistro,
  esquemaPerfil,
  leerFormRegistro,
  erroresPorCampo,
  redactarDiff,
  limpiarMensaje,
  MAX_MENSAJE_POSTULACION,
} from "@/lib/candidato-validacion";
import { transicionPermitida } from "@/lib/postulaciones-reglas";

describe("normalizarWhatsapp (E.164 colombiano)", () => {
  test.each([
    ["3001234567", "+573001234567"],
    ["300 123 4567", "+573001234567"],
    ["300-123-4567", "+573001234567"],
    ["(300) 123.4567", "+573001234567"],
    ["+57 300 123 4567", "+573001234567"],
    ["573001234567", "+573001234567"],
    ["00573001234567", "+573001234567"],
  ])("%s → %s", (entrada, esperado) => {
    expect(normalizarWhatsapp(entrada)).toBe(esperado);
  });

  test.each([
    "",
    "6051234567", // fijo
    "30012345", // corto
    "30012345678", // largo
    "+1 300 123 4567", // otro país
    "+3001234567",
    "300abc4567",
    null,
    undefined,
  ])("rechaza %s", (entrada) => {
    expect(normalizarWhatsapp(entrada as string)).toBeNull();
  });
});

function formData(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

const valido = {
  nombre: "María Pérez",
  whatsapp: "300 123 4567",
  email: " Maria@Ejemplo.com ",
  password: "secreta123",
  ciudad: "Barranquilla",
  area_interes: "ventas",
  nivel_educativo: "bachiller",
  disponibilidad: "inmediata",
  barrio: "",
  experiencia: "",
  acepta_terminos: "on",
  mayor_de_edad: "on",
};

describe("esquemaRegistro", () => {
  test("normaliza y acepta un registro válido; WhatsApp opcional apagado", () => {
    const r = esquemaRegistro.safeParse(leerFormRegistro(formData(valido)));
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      whatsapp: "+573001234567",
      email: "maria@ejemplo.com",
      barrio: null,
      experiencia: null,
      wsp_opt_in: false,
      acepta_terminos: true,
      mayor_de_edad: true,
    });
  });

  test("la casilla de WhatsApp es independiente", () => {
    const r = esquemaRegistro.safeParse(leerFormRegistro(formData({ ...valido, wsp_opt_in: "on" })));
    expect(r.data?.wsp_opt_in).toBe(true);
  });

  test("términos y mayoría de edad son obligatorios", () => {
    const { acepta_terminos: _a, mayor_de_edad: _m, ...sinCasillas } = valido;
    const r = esquemaRegistro.safeParse(leerFormRegistro(formData(sinCasillas)));
    expect(r.success).toBe(false);
    const errores = erroresPorCampo(r.error!);
    expect(errores.acepta_terminos).toBeTruthy();
    expect(errores.mayor_de_edad).toBeTruthy();
  });

  test("rechaza correo, ciudad, área y contraseña inválidos", () => {
    const r = esquemaRegistro.safeParse(
      leerFormRegistro(
        formData({ ...valido, email: "no-es-correo", ciudad: "Bogotá", area_interes: "x", password: "123", whatsapp: "123" }),
      ),
    );
    const errores = erroresPorCampo(r.error!);
    expect(Object.keys(errores).sort()).toEqual(["area_interes", "ciudad", "email", "password", "whatsapp"]);
  });
});

describe("esquemaPerfil", () => {
  test("no requiere correo ni casillas", () => {
    const { email: _e, password: _p, acepta_terminos: _a, mayor_de_edad: _m, ...perfil } = valido;
    expect(esquemaPerfil.safeParse(perfil).success).toBe(true);
  });
});

describe("redactarDiff", () => {
  test("registra solo el nombre de los campos sensibles", () => {
    const r = redactarDiff({
      antes: { whatsapp: "+573001111111", ciudad: "Cartagena" },
      despues: { whatsapp: "+573002222222", ciudad: "Barranquilla" },
    });
    expect(r.sensiblesCambiados).toEqual(["whatsapp"]);
    expect(r.antes).toEqual({ ciudad: "Cartagena" });
    expect(r.despues).toEqual({ ciudad: "Barranquilla" });
    expect(JSON.stringify(r)).not.toContain("+57300");
  });
});

describe("postulación", () => {
  test("mensaje recortado y vacío → null", () => {
    expect(limpiarMensaje("   ")).toBeNull();
    expect(limpiarMensaje("x".repeat(900))!.length).toBe(MAX_MENSAJE_POSTULACION);
  });

  test("el candidato solo retira desde estados abiertos", () => {
    expect(transicionPermitida("candidato", "enviada", "retirada")).toBe(true);
    expect(transicionPermitida("candidato", "en_entrevista", "retirada")).toBe(true);
    expect(transicionPermitida("candidato", "contratado", "retirada")).toBe(false);
    expect(transicionPermitida("candidato", "retirada", "retirada")).toBe(false);
  });
});
