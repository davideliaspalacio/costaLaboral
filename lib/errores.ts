/** Traduce mensajes de error de Supabase Auth a español amable. */
export function traducirAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ese correo ya está registrado. Intenta ingresar.";
  if (m.includes("password") && m.includes("6"))
    return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("invalid email")) return "El correo no es válido.";
  if (m.includes("rate limit")) return "Demasiados intentos. Espera un momento.";
  return "No se pudo completar el registro. Revisa los datos e intenta de nuevo.";
}
