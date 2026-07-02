import type { ContenidoHV, LinkedInHV } from "@/lib/ai";

/* ============================================================
   Serialización a texto plano de una hoja de vida y del bloque
   de LinkedIn, para el botón "Copiar". Pura (sin server-only) para
   poder usarse tanto en cliente como en servidor.
   ============================================================ */

export function cvATexto(
  nombre: string,
  ciudad: string,
  contacto: { whatsapp?: string | null; email?: string | null },
  contenido: ContenidoHV,
): string {
  const l: string[] = [];
  l.push(nombre.toUpperCase());
  const linea2 = [ciudad, contacto.whatsapp, contacto.email].filter(Boolean).join(" · ");
  if (linea2) l.push(linea2);
  l.push("");

  if (contenido.resumen) {
    l.push("PERFIL PROFESIONAL");
    l.push(contenido.resumen);
    l.push("");
  }

  if (contenido.habilidades?.length) {
    l.push("HABILIDADES");
    l.push(contenido.habilidades.join(" · "));
    l.push("");
  }

  if (contenido.experiencia?.length) {
    l.push("EXPERIENCIA");
    for (const e of contenido.experiencia) {
      const enc = [e.cargo, e.empresa].filter(Boolean).join(" — ");
      l.push(e.periodo ? `${enc} (${e.periodo})` : enc);
      for (const logro of e.logros ?? []) l.push(`  • ${logro}`);
      l.push("");
    }
  }

  if (contenido.educacion?.length) {
    l.push("EDUCACIÓN");
    for (const ed of contenido.educacion) l.push(`  • ${ed}`);
    l.push("");
  }

  if (contenido.logros?.length) {
    l.push("LOGROS Y FORTALEZAS");
    for (const lg of contenido.logros) l.push(`  • ${lg}`);
    l.push("");
  }

  return l.join("\n").trim();
}

export function linkedInATexto(linkedin: LinkedInHV): string {
  return [`TITULAR:\n${linkedin.titular}`, "", `ACERCA DE:\n${linkedin.acerca}`].join("\n").trim();
}
