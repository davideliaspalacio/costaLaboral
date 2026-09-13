# Implementación Spec MVP v2 — contrato de trabajo

Spec: `CostaLaboral_Especificacion_MVP_v2_Intermediacion`. Brechas: `docs/PENDIENTES-SPEC-V2.md`.

## Decisiones del dueño del producto

1. **Todo abierto:** vacante completa (empresa, salario, requisitos, descripción), postulación y match son gratis para todos. Sin límites de postulaciones. Registro solo para postular/personalizar.
2. **Login:** se mantiene email + contraseña (sin OTP).
3. **Moderación:** solo las vacantes de **empresas sin verificar** quedan `pendiente`. Excepción: contenido sospechoso (discriminación, cobros al candidato) va a `pendiente` aunque la empresa esté verificada.
4. **Pagos:** pasarela **sandbox** (de prueba) detrás de un adaptador; Wompi se conecta después con la misma interfaz.
5. **WhatsApp:** proveedor después. Sección 9 = solo plan (`docs/PLAN-WHATSAPP.md`).
6. **Monetización de empresas y pagos entran al MVP.**
7. Ciudades del piloto: Barranquilla, Cartagena, Santa Marta.

## Base ya construida (NO reescribir; importar)

| Archivo | Qué da |
|---|---|
| `supabase/migrations/20260914000000_spec_v2.sql` | Esquema v2 (ya aplicado en local). Léelo antes de consultar tablas. |
| `lib/constants.ts` | Ciudades, áreas, `TIPOS_EMPLEO`, `MODALIDADES` (presencial/remoto/hibrido), `DISPONIBILIDAD`, `ESTADOS_VACANTE`, `ESTADOS_POSTULACION` (un solo estado, con `label`, `labelCandidato`, `tono`), `ESTADOS_PIPELINE_EMPRESA`, `MOTIVOS_REPORTE`, `REPORTES_PARA_OCULTAR`, `FUENTES`/`normalizarFuente`, `PLAN_NOMBRE`, `PESO_MATCH`, `UMBRAL_RECOMENDACION`. |
| `lib/types.ts` | `Candidato`, `Empresa`, `Vacante`, `VacanteConEmpresa`, `Postulacion`, `PostulacionHistorial`, `CandidatoMatch`. Columnas derivadas (`es_publica`, `empresas.verificada`) **nunca se escriben**. |
| `lib/matching.ts` | `evaluarMatch(c, v) → DetalleMatch {version, score, factores[]}`, `calcularScore`, `esRecomendable`, `resumenMatch`, `perfilDe`, `colorScore`. |
| `lib/vacante.ts` | `esVisibleEnPortal`, `estaDestacada`, `compararPortal`. |
| `lib/entitlements.ts` | `BENEFICIOS_CANDIDATO`, `BENEFICIOS_EMPRESA`, `planCandidatoEfectivo`, `planEmpresaEfectivo`, `DIAS_GRACIA_PAST_DUE`. |
| `lib/billing/catalogo.ts` | `PRODUCTOS`, `ProductoCodigo`, `PRODUCTOS_DESTACADA`, `productoDePlan`. |
| `lib/billing/suscripciones.ts` | `getSuscripcionVigente`, `getBeneficiosCandidato(id)`, `getBeneficiosEmpresa(id)`, `sincronizarPlanCache(id, tipo)`. |
| `lib/audit.ts` | `registrarAuditoria({actor, accion, entidad, entidadId, antes, despues, metadata})`, `diffCampos`, `ACCIONES`, `ACTOR_SISTEMA`. |
| `lib/eventos.ts` | `registrarEvento` (analítica/KPIs). |
| `lib/rate-limit.ts` | `limitar(nombre, identificador?)`, `mensajeLimite`, `LIMITES`. |
| `lib/log.ts` | `log.info/warn/error(msg, ctx)` JSON estructurado. |
| `lib/request.ts` | `infoRequest()` → ip, userAgent, requestId. |
| `lib/legal/documentos.ts` | `VERSION_TERMINOS`, `VERSION_PRIVACIDAD`, `RESPONSABLE` (datos del responsable, por env). |
| `lib/legal/consentimientos.ts` | `registrarConsentimientos(titular, items, canal)`, `getHistorialConsentimientos`. |
| `lib/legal/dias-habiles.ts` | `sumarDiasHabiles`, `esDiaHabil`, `PLAZOS_HABEAS_DATA`, `claseSolicitud`. |
| `lib/cron.ts` | `autorizarCron(req)` para rutas `/api/cron/*`. |
| `lib/data/vacantes.ts` | `getVacantesRecientes`, `getVacanteSinContar`, `getVacantePublica`, `getRecomendaciones(candidato)`, `getVacantesDeEmpresa`, `getCandidatosDeVacante` (orden score → prioridad de plan → antigüedad). |
| `vitest.config.mts`, `test/unit/*` | `pnpm test` (vitest). Tests de lógica pura en `test/unit/<area>.test.ts`. |

Si necesitas algo nuevo en un archivo base, **no lo edites**: crea un helper en tu área y menciónalo en tu reporte final.

## Reglas de trabajo

- Lee `CLAUDE.md` y la sección de diseño de `.agent-brief.md` ("Caribe bravo": tokens, `border-2 border-ink`, sombra sticker, sin gradientes). La regla de ese brief de "no modificar lib/" ya no aplica: aplica la tabla de dueños de abajo.
- Todo en español. Server Components por defecto; `"use client"` solo para interacción; nunca handlers inline desde un Server Component.
- Escrituras siempre en el servidor con `createAdminClient()` y **autorización en código** (verifica dueño/rol). El navegador ya no tiene permisos de escritura en la BD.
- Toda mutación de negocio → `registrarAuditoria`. Toda interacción que alimente KPIs → `registrarEvento`.
- Acciones sensibles a abuso → `limitar(...)`.
- Colores solo por tokens (`brand-*`, `accent-*`, `sol-*`, `ink`, `ink-soft`, `muted`, `line`, `canvas`, `surface`, `success-*`, `danger-*`). Revisa `app/globals.css`.
- Dependencias ya instaladas: `@anthropic-ai/sdk`, `zod`, `vitest`. **No instales más** sin justificarlo en el reporte (usa `npx -y pnpm@10.12.4 add` si es imprescindible).
- **No arranques el dev server** (lo usa la integración). Verifica con `npx tsc --noEmit` (filtra tus archivos), `npx vitest run` y scripts `node --env-file=.env.local -e '…'` contra Supabase local (URL y llaves en `.env.local`).
- Migraciones nuevas solo si son imprescindibles, con tu prefijo de timestamp (abajo), y aplícalas con `supabase migration up`.
- No hagas commits.

## Dueños de archivos

| Agente | Secciones | Archivos (solo estos) | Prefijo migración |
|---|---|---|---|
| **A1 Portal** | 1, 2, 5 (reportes) | `app/page.tsx`, `app/ofertas/**`, `app/v/**`, `app/sitemap.ts`, `lib/seo.ts`, `lib/data/ofertas.ts`, `lib/actions/reportes.ts` (nuevo), `components/vacante/**`, `components/seo/**`, `components/site/header.tsx`, `components/site/user-menu.tsx` | `20260914000100` |
| **A2 Candidato** | 1, 3, 6, 7 | `app/mis-vacantes/**`, `app/perfil/**`, `app/registro-candidato/**`, `app/cuenta/**`, `app/login/**`, `lib/actions/candidato.ts`, `lib/actions/postulacion.ts`, `lib/actions/cuenta.ts`, `lib/actions/auth.ts`, `lib/data/postulaciones.ts`, `lib/notificaciones.ts` | `20260914000200` |
| **B Empresa** | 4, 5, 8, 13 (UI) | `app/registro-empresa/**`, `app/empresa/**`, `lib/actions/empresa.ts`, `lib/moderacion.ts` (nuevo), `lib/data/empresa.ts` (nuevo), `app/api/empresa/**` | `20260914000300` |
| **C IA** | 10, 11 | `app/hoja-de-vida/**`, `app/linkedin/**` (nuevo), `components/hv/**`, `lib/ai.ts` (reemplazar por `lib/ia/**`), `lib/actions/hoja-de-vida.ts`, `lib/actions/linkedin.ts`, `lib/data/hoja-de-vida.ts`, `lib/data/linkedin.ts`, `lib/hv-texto.ts` | `20260914000400` |
| **D Pagos** | 12, 13 (cobro) | `lib/billing/**` (excepto `catalogo.ts`; `suscripciones.ts` solo agregar), `lib/actions/pagos.ts`, `app/planes/**`, `app/pagos/**`, `app/api/pagos/**`, `app/api/cron/suscripciones/**` | `20260914000500` |
| **E Admin** | 14, KPIs de 15 | `app/admin/**`, `components/admin/**`, `lib/actions/admin.ts`, `lib/data/admin.ts`, `lib/data/metrics.ts`, `lib/data/kpis.ts` (nuevo), `lib/roles.ts`, `lib/roles-shared.ts` | `20260914000600` |
| **F Plataforma y legal** | 9 (plan), 15, 16 | `next.config.ts`, `instrumentation.ts`, `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`, `app/api/health/**`, `app/api/cron/vacantes/**`, `app/api/cron/retencion/**`, `vercel.json`, `lib/env.ts`, `lib/supabase/middleware.ts`, `app/terminos/**`, `app/privacidad/**`, `app/datos-personales/**` (nuevo), `lib/actions/solicitudes.ts` (nuevo), `lib/legal/**` (excepto los 3 archivos base), `components/site/footer.tsx`, `docs/**` (excepto este archivo), `README.md`, `CLAUDE.md`, `.env.example`, `test/*.mjs`, `test/unit/legal*.test.ts` | `20260914000700` |

`scripts/seed.mjs` lo actualiza la integración al final.

## Contratos entre agentes (firmas exactas)

**A2 → A1** (`lib/actions/postulacion.ts`)
```ts
postularse(vacanteId: string, opts?: { mensaje?: string; fuente?: Fuente }):
  Promise<{ ok: true; score: number } | { error: "ya_postulado" | "cerrada" | "limite_tasa" | "generico" }>
retirarPostulacion(postulacionId: string): Promise<{ ok: true } | { error: string }>
```
Guarda `score_match`, `match_detalle` (DetalleMatch), `fuente`, fila en `postulacion_historial`, auditoría y evento `postulacion` con `meta: { score, fuente }`.

**A1** (`lib/actions/reportes.ts`)
```ts
reportarVacante(vacanteId: string, motivo: MotivoReporte, detalle?: string): Promise<{ ok: true } | { error: string }>
```
Requiere sesión. Con ≥ `REPORTES_PARA_OCULTAR` reportes abiertos de usuarios distintos → `estado_moderacion = "reportada"` (se oculta hasta revisión).

**KPIs (A1, A2 → E)**
- Ficha: evento `vacante_vista` `{ actor_id?, meta: { fuente } }`; la `fuente` llega por `?src=` (`recomendacion|busqueda|whatsapp|compartido`, por defecto `directo`). A1 lo registra; los enlaces del portal usan `?src=busqueda`.
- Recomendaciones (A2, `/mis-vacantes`): evento `recomendaciones_mostradas` `{ meta: { cantidad, vacante_ids } }` y enlaces con `?src=recomendacion`.
- `registro_candidato`, `registro_empresa`, `postulacion`, `vacante_publicada`, `pago_aprobado`, `vacante_destacada`, `hv_generada`, `linkedin_generado`.

**B** (`lib/actions/empresa.ts`)
```ts
cambiarEstadoPostulacion(postulacionId: string, estado: EstadoPostulacion, nota?: string): Promise<{ ok: true } | { error: string }>
```
Historial + auditoría. Abrir el pipeline marca `enviada → vista`.

**D → B, E** (`lib/actions/pagos.ts`, `lib/billing/servicio.ts`)
```ts
// lib/actions/pagos.ts ("use server")
iniciarCompra(producto: ProductoCodigo, opciones?: { vacanteId?: string }): Promise<{ url: string } | { error: string }>
usarDestacadaIncluida(vacanteId: string, producto: ProductoCodigo): Promise<{ ok: true } | { error: string }>
cancelarSuscripcion(): Promise<{ ok: true } | { error: string }>   // al final del periodo
// lib/billing/servicio.ts (server-only)
contarDestacadasIncluidasUsadasMes(empresaId: string): Promise<number>
reembolsarPago(pagoId: string, actor: ActorAuditoria): Promise<{ ok: true } | { error: string }>
cancelarSuscripcionAdmin(suscripcionId: string, actor: ActorAuditoria, inmediata: boolean): Promise<{ ok: true } | { error: string }>
procesarVencimientos(): Promise<{ past_due: number; expiradas: number; renovadas: number }>
```
Destacar exige: vacante propia, empresa **verificada** y vacante pública. Al aprobarse: `destacada_hasta = max(ahora, destacada_hasta) + duracionDias`.

**Reglas de estado de postulación** (base, `lib/postulaciones-reglas.ts`): `transicionPermitida(actor, desde, hacia)`, `ESTADOS_RETIRABLES`. A2, B y E las usan; no dupliques la lógica.

**C → A1:** en la ficha, un candidato logueado ve el enlace "Adapta tu hoja de vida a esta vacante" → `/hoja-de-vida/adaptar?vacante=<id>` (C implementa la ruta y la regla de plan).

**A2 → D:** al eliminar una cuenta con suscripción vigente, `cancelarSuscripcionAdmin(id, actor, true)` de `lib/billing/servicio.ts`.

**F → todos:** rutas legales `/terminos`, `/privacidad`, `/datos-personales`. F agrega a rutas protegidas del middleware: `/linkedin`, `/pagos`.

**Consentimientos** (`registrarConsentimientos`)
- A2 registro candidato: `tratamiento_datos`, `terminos`, `mayoria_edad` (obligatorios) + `whatsapp` (casilla separada, opcional). Canal `registro_candidato`.
- A2 `/cuenta`: activar/revocar `whatsapp` y `perfil_visible_empresas` (nueva fila cada cambio + columnas del candidato).
- B wizard empresa: `tratamiento_datos`, `terminos`. Canal `registro_empresa`.
