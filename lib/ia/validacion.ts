import { bulletsDesdeDescripcion, habilidadesDeFuente, linkedinRespaldo, resumenRespaldo } from "./respaldo";
import { cobertura, coincideTexto, mismoPeriodo, normalizar, numerosEn, tokens } from "./normalizar";
import type {
  ContenidoHV,
  ContenidoLinkedIn,
  DatosFuenteHV,
  ExperienciaHV,
  ExperienciaLinkedIn,
  FuenteLinkedIn,
  NivelLinkedIn,
  ProblemaValidacion,
  ResultadoValidacion,
} from "./tipos";

/* ============================================================
   Validación ANTI-INVENCIÓN (pura). Compara la salida de la IA con
   lo que aportó el candidato:
   - cada experiencia debe corresponder a una de la entrada (empresa
     y cargo normalizados); cargo, empresa y periodo se restauran
     exactamente como los escribió el candidato;
   - la educación debe derivarse de la entrada;
   - toda cifra (números, porcentajes, años) debe aparecer en la entrada;
   - no puede haber títulos/certificaciones que la entrada no mencione.
   Devuelve problemas (sin texto del candidato) y una versión saneada.
   ============================================================ */

export const VALIDACION_VERSION = "anti-invencion-2026-09-v1";

/** Menciones de credenciales: si aparecen en la salida, deben aparecer en la entrada. */
const CREDENCIALES: RegExp[] = [
  /\bcertific\w*/,
  /\bdiplomad\w*/,
  /\btitul(o|os|ado|ada|ados|adas)\b/,
  /\blicenciad\w*/,
  /\blicenciatura\b/,
  /\bingenier\w*/,
  /\bmagister\b/,
  /\bmaestria\w*/,
  /\bespecializacion\w*/,
  /\bespecialista\b/,
  /\bdoctorado\b/,
  /\bposgrado\w*/,
  /\bpregrado\b/,
  /\btecnic[oa]s? en\b/,
  /\btecnolog[oa]s? en\b/,
  /\bcursos? (de|en)\b/,
  /\blicencia de conduccion\b/,
  /\biso \d+/,
  /\bsena\b/,
  /\buniversi(dad|tari\w*)\b/,
  /\bbachiller\w*/,
];

type Contexto = {
  numeros: Set<string>;
  corpusNormalizado: string;
  corpusTokens: Set<string>;
};

function contexto(textos: (string | number | null | undefined)[]): Contexto {
  const corpus = textos.filter((t) => t !== null && t !== undefined && t !== "").join(" \n ");
  return {
    numeros: new Set(numerosEn(corpus)),
    corpusNormalizado: ` ${normalizar(corpus)} `,
    corpusTokens: new Set(tokens(corpus)),
  };
}

export function tieneCifraInventada(texto: string, ctx: Contexto): boolean {
  return numerosEn(texto).some((n) => !ctx.numeros.has(n));
}

export function tieneCredencialInventada(texto: string, ctx: Contexto): boolean {
  const n = ` ${normalizar(texto)} `;
  return CREDENCIALES.some((re) => {
    const m = n.match(re);
    if (!m) return false;
    return !re.test(ctx.corpusNormalizado);
  });
}

/** Revisa un texto libre y devuelve el código del problema grave, si hay. */
function problemaDeTexto(texto: string, ctx: Contexto): "cifra_inventada" | "credencial_inventada" | null {
  if (tieneCifraInventada(texto, ctx)) return "cifra_inventada";
  if (tieneCredencialInventada(texto, ctx)) return "credencial_inventada";
  return null;
}

class Registro {
  problemas: ProblemaValidacion[] = [];
  grave(codigo: ProblemaValidacion["codigo"], seccion: string, ref?: string) {
    this.problemas.push({ codigo, severidad: "grave", seccion, ...(ref ? { ref } : {}) });
  }
  leve(codigo: ProblemaValidacion["codigo"], seccion: string, ref?: string) {
    this.problemas.push({ codigo, severidad: "leve", seccion, ...(ref ? { ref } : {}) });
  }
  resultado<T>(saneado: T): ResultadoValidacion<T> {
    const graves = this.problemas.filter((p) => p.severidad === "grave").length;
    return { ok: graves === 0, graves, problemas: this.problemas, saneado };
  }
}

/** Filtra una lista de textos quitando los que inventan cifras o credenciales. */
function filtrarTextos(items: string[], ctx: Contexto, reg: Registro, seccion: string): string[] {
  return items.filter((t, i) => {
    const p = problemaDeTexto(t, ctx);
    if (p) reg.grave(p, seccion, `#${i + 1}`);
    return !p;
  });
}

/** Habilidades: se conservan las aportadas o las que se sustentan en lo que escribió el candidato. */
function filtrarHabilidades(items: string[], aportadas: string[], ctx: Contexto, reg: Registro, seccion: string): string[] {
  const vistas = new Set<string>();
  const salida = items.filter((h, i) => {
    const clave = normalizar(h);
    if (!clave || vistas.has(clave)) return false;
    const sustentada = aportadas.some((a) => coincideTexto(h, a)) || cobertura(h, ctx.corpusTokens) >= 0.5;
    if (!sustentada || problemaDeTexto(h, ctx)) {
      reg.leve("habilidad_no_aportada", seccion, `#${i + 1}`);
      return false;
    }
    vistas.add(clave);
    return true;
  });
  return salida.length === 0 && aportadas.length > 0 ? [...aportadas] : salida;
}

/* ============================ Hoja de vida ============================ */

function contextoHV(f: DatosFuenteHV): Contexto {
  const e = f.entrada;
  return contexto([
    e.cargoObjetivo,
    e.aniosExperiencia,
    ...e.experiencia.flatMap((x) => [x.cargo, x.empresa, x.periodo, x.descripcion]),
    ...e.habilidades,
    ...e.educacion,
    f.perfil.ciudad,
    f.perfil.area,
    f.perfil.nivelEducativo,
  ]);
}

export function validarHV(salida: ContenidoHV, fuente: DatosFuenteHV): ResultadoValidacion<ContenidoHV> {
  const reg = new Registro();
  const ctx = contextoHV(fuente);
  const entradaExp = fuente.entrada.experiencia;

  // --- Resumen
  let resumen = (salida.resumen ?? "").trim();
  const pResumen = problemaDeTexto(resumen, ctx);
  if (pResumen) {
    reg.grave(pResumen, "resumen");
    resumen = resumenRespaldo(fuente);
  }
  if (!resumen) resumen = resumenRespaldo(fuente);

  // --- Experiencia
  const usadas = new Set<number>();
  const experiencia: ExperienciaHV[] = [];
  (salida.experiencia ?? []).forEach((e, i) => {
    const ref = `#${i + 1}`;
    const idx = entradaExp.findIndex(
      (x, j) => !usadas.has(j) && coincideTexto(e.empresa, x.empresa) && coincideTexto(e.cargo, x.cargo),
    );
    if (idx < 0) {
      reg.grave("experiencia_inventada", "experiencia", ref);
      return;
    }
    usadas.add(idx);
    const x = entradaExp[idx];
    if (!mismoPeriodo(e.periodo, x.periodo)) reg.grave("periodo_alterado", "experiencia", ref);
    if (normalizar(e.cargo) !== normalizar(x.cargo) || normalizar(e.empresa) !== normalizar(x.empresa)) {
      reg.leve("campo_restaurado", "experiencia", ref);
    }
    let logros = filtrarTextos(e.logros ?? [], ctx, reg, `experiencia${ref}.logros`);
    if (logros.length === 0) logros = bulletsDesdeDescripcion(x.descripcion);
    experiencia.push({ cargo: x.cargo, empresa: x.empresa, periodo: x.periodo, logros });
  });
  entradaExp.forEach((x, j) => {
    if (usadas.has(j)) return;
    reg.leve("experiencia_omitida", "experiencia", `entrada#${j + 1}`);
    experiencia.push({ cargo: x.cargo, empresa: x.empresa, periodo: x.periodo, logros: bulletsDesdeDescripcion(x.descripcion) });
  });

  // --- Educación
  const permitidas = fuente.entrada.educacion.length
    ? fuente.entrada.educacion
    : fuente.perfil.nivelEducativo
      ? [fuente.perfil.nivelEducativo]
      : [];
  let educacion = (salida.educacion ?? []).map((t) => t.trim()).filter(Boolean);
  const eduInvalida = educacion.some((item, i) => {
    const derivada = permitidas.some((p) => coincideTexto(item, p) || cobertura(item, new Set(tokens(p))) >= 0.6);
    const invalida = !derivada || problemaDeTexto(item, ctx) !== null;
    if (invalida) reg.grave("educacion_inventada", "educacion", `#${i + 1}`);
    return invalida;
  });
  if (eduInvalida || educacion.length === 0) educacion = [...permitidas];

  // --- Habilidades y logros generales
  const habilidades = filtrarHabilidades(salida.habilidades ?? [], fuente.entrada.habilidades, ctx, reg, "habilidades");
  const logros = filtrarTextos(salida.logros ?? [], ctx, reg, "logros");

  return reg.resultado<ContenidoHV>({ resumen, habilidades, experiencia, educacion, logros });
}

/* ============================ LinkedIn ============================ */

function contextoLinkedIn(f: FuenteLinkedIn): Contexto {
  const e = f.entrada;
  const c = f.contenidoHV;
  return contexto([
    f.perfil.cargoObjetivo,
    f.perfil.area,
    f.perfil.ciudad,
    f.perfil.nivelEducativo,
    f.perfil.experienciaLibre,
    e?.cargoObjetivo,
    e?.aniosExperiencia,
    ...(e?.experiencia.flatMap((x) => [x.cargo, x.empresa, x.periodo, x.descripcion]) ?? []),
    ...(e?.habilidades ?? []),
    ...(e?.educacion ?? []),
    c?.resumen,
    ...(c?.habilidades ?? []),
    ...(c?.experiencia.flatMap((x) => [x.cargo, x.empresa, x.periodo, ...x.logros]) ?? []),
    ...(c?.educacion ?? []),
    ...(c?.logros ?? []),
  ]);
}

function experienciasFuente(f: FuenteLinkedIn): { cargo: string; empresa: string; descripcion: string }[] {
  if (f.contenidoHV?.experiencia.length) {
    return f.contenidoHV.experiencia.map((e) => ({ cargo: e.cargo, empresa: e.empresa, descripcion: e.logros.join(" ") }));
  }
  return (f.entrada?.experiencia ?? []).map((e) => ({ cargo: e.cargo, empresa: e.empresa, descripcion: e.descripcion }));
}

export function validarLinkedIn(
  salida: ContenidoLinkedIn,
  fuente: FuenteLinkedIn,
  nivel: NivelLinkedIn,
): ResultadoValidacion<ContenidoLinkedIn> {
  const reg = new Registro();
  const ctx = contextoLinkedIn(fuente);
  const respaldo = linkedinRespaldo(fuente, nivel);

  let titular = (salida.titular ?? "").trim();
  const pTit = problemaDeTexto(titular, ctx);
  if (pTit) reg.grave(pTit, "titular");
  if (pTit || !titular) titular = respaldo.titular;

  let acerca = (salida.acerca ?? "").trim();
  const pAcerca = problemaDeTexto(acerca, ctx);
  if (pAcerca) reg.grave(pAcerca, "acerca");
  if (pAcerca || !acerca) acerca = respaldo.acerca;

  if (nivel === "basico") return reg.resultado<ContenidoLinkedIn>({ titular, acerca });

  const titulares_alternativos = filtrarTextos(salida.titulares_alternativos ?? [], ctx, reg, "titulares_alternativos").slice(0, 3);

  const habilidades = filtrarHabilidades(salida.habilidades ?? [], habilidadesDeFuente(fuente), ctx, reg, "habilidades").slice(0, 10);

  const fuenteExp = experienciasFuente(fuente);
  const usadas = new Set<number>();
  const experiencias: ExperienciaLinkedIn[] = [];
  (salida.experiencias ?? []).forEach((e, i) => {
    const ref = `#${i + 1}`;
    const idx = fuenteExp.findIndex((x, j) => !usadas.has(j) && coincideTexto(e.empresa, x.empresa) && coincideTexto(e.cargo, x.cargo));
    if (idx < 0) {
      reg.grave("experiencia_inventada", "experiencias", ref);
      return;
    }
    usadas.add(idx);
    const x = fuenteExp[idx];
    if (normalizar(e.cargo) !== normalizar(x.cargo) || normalizar(e.empresa) !== normalizar(x.empresa)) {
      reg.leve("campo_restaurado", "experiencias", ref);
    }
    let descripcion = (e.descripcion ?? "").trim();
    const p = problemaDeTexto(descripcion, ctx);
    if (p) reg.grave(p, `experiencias${ref}`);
    if (p || !descripcion) descripcion = bulletsDesdeDescripcion(x.descripcion).join(" ");
    experiencias.push({ cargo: x.cargo, empresa: x.empresa, descripcion });
  });
  fuenteExp.forEach((x, j) => {
    if (usadas.has(j)) return;
    reg.leve("experiencia_omitida", "experiencias", `fuente#${j + 1}`);
    experiencias.push({ cargo: x.cargo, empresa: x.empresa, descripcion: bulletsDesdeDescripcion(x.descripcion).join(" ") });
  });

  // Palabras clave: son sugerencias de búsqueda para el área, no afirmaciones sobre el candidato.
  const palabras_clave = (salida.palabras_clave ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 15);

  return reg.resultado<ContenidoLinkedIn>({
    titular,
    acerca,
    titulares_alternativos: titulares_alternativos.length ? titulares_alternativos : respaldo.titulares_alternativos,
    habilidades,
    experiencias,
    palabras_clave: palabras_clave.length ? palabras_clave : respaldo.palabras_clave,
  });
}
