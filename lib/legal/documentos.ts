/* ============================================================
   Datos legales y versiones de documentos. Cada consentimiento
   guarda la versión vigente del documento que el titular aceptó.
   Si cambias el texto de términos o privacidad, SUBE la versión.

   Los datos del responsable se leen de variables de entorno para
   no quemar datos de la sociedad en el código (ver .env.example).
   ============================================================ */

export const VERSION_TERMINOS = "2026-09-14";
export const VERSION_PRIVACIDAD = "2026-09-14";

const pendiente = (campo: string) => `[${campo} POR DEFINIR]`;

/** Responsable del tratamiento (art. 3 Ley 1581/2012; art. 13 Decreto 1377/2013). */
export const RESPONSABLE = {
  razonSocial: process.env.NEXT_PUBLIC_LEGAL_RAZON_SOCIAL || pendiente("RAZÓN SOCIAL"),
  nit: process.env.NEXT_PUBLIC_LEGAL_NIT || pendiente("NIT"),
  domicilio: process.env.NEXT_PUBLIC_LEGAL_DOMICILIO || "Barranquilla, Atlántico, Colombia",
  direccion: process.env.NEXT_PUBLIC_LEGAL_DIRECCION || pendiente("DIRECCIÓN"),
  emailDatos: process.env.NEXT_PUBLIC_LEGAL_EMAIL_DATOS || pendiente("CORREO DE PROTECCIÓN DE DATOS"),
  telefono: process.env.NEXT_PUBLIC_LEGAL_TELEFONO || pendiente("TELÉFONO"),
} as const;

export const MARCA = "CostaLaboral";
