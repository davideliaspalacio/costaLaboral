# Arquitectura de CostaLaboral

## 1. Forma general: monolito modular

Una sola aplicación **Next.js 16** (App Router, React 19, Server Components) desplegada en **Vercel**, sobre **Supabase** (Postgres + Auth). Los módulos viven como carpetas con responsabilidades claras y se comunican por funciones, no por red.

```
Navegador ──HTTPS──► Vercel (Next.js)
                       ├─ Server Components / Server Actions (autorizan en código)
                       ├─ Route Handlers: /api/health, /api/cron/*, /api/pagos/webhook
                       └─ proxy.ts (sesión + rutas protegidas)
                              │ service role (solo servidor)
                              ▼
                     Supabase Postgres + Auth
                       ├─ RLS: lectura mínima desde el navegador, sin escrituras
                       ├─ Funciones: rate_limit_hit, cerrar_vacantes_expiradas, purgar_datos_retencion
                       └─ audit_log / consentimientos append-only
Externos: Anthropic (IA), pasarela de pagos (sandbox → Wompi), WhatsApp (plan)
```

### Por qué no Redis ni workers dedicados todavía

- Tráfico de piloto (3 ciudades). Postgres aguanta con holgura el rate limiting (`rate_limits`, tabla *unlogged* con upsert atómico) y las tareas programadas.
- **Vercel Cron** cubre las tareas diarias o semanales sin otro servicio que operar, pagar y asegurar.
- Menos piezas = menos secretos, menos puntos de falla y un solo lugar para respaldos.

**Cuándo migrar:**
- Rate limiting → **Upstash Redis o Vercel Firewall** si `rate_limit_hit` aparece en el top de latencia o se superan ~100 req/s sostenidas. `lib/rate-limit.ts` aísla a los llamadores.
- Tareas → **Vercel Queues o un worker** cuando el digest de WhatsApp supere lo que un cron procesa dentro del `maxDuration` o haga falta paralelismo y reintentos finos.
- Búsqueda → índice dedicado (Postgres FTS o Typesense) si los filtros de `/ofertas` dejan de ser suficientes.

## 2. Mapa de módulos

| Módulo | Dónde | Qué hace |
|---|---|---|
| Portal | `app/page.tsx`, `app/ofertas`, `app/v/[id]`, `lib/data/ofertas.ts`, `lib/vacante.ts` | Vacantes públicas, filtros, ficha, reportes |
| Candidato | `app/perfil`, `app/mis-vacantes`, `app/cuenta`, `lib/actions/candidato.ts`, `postulacion.ts` | Registro, perfil, postulaciones, preferencias y autorizaciones |
| Empresa | `app/empresa`, `app/registro-empresa`, `lib/actions/empresa.ts`, `lib/moderacion.ts` | Vacantes, pipeline, verificación |
| Match | `lib/matching.ts` | Score puro y explicable (ciudad 40, área 30, nivel 20, disponibilidad 10) |
| IA | `app/hoja-de-vida`, `app/linkedin`, `lib/ia/**` | HV y LinkedIn con prompts versionados |
| Pagos | `lib/billing/**`, `app/planes`, `app/pagos`, `app/api/pagos` | Catálogo, suscripciones, adaptador de pasarela, webhooks |
| Admin | `app/admin`, `lib/data/admin.ts`, `lib/data/kpis.ts`, `lib/roles.ts` | Moderación, verificación, auditoría, KPIs |
| Legal | `lib/legal/**`, `app/terminos`, `app/privacidad`, `app/datos-personales` | Versiones, consentimientos, solicitudes de titulares, días hábiles |
| Plataforma | `next.config.ts`, `instrumentation.ts`, `lib/env.ts`, `lib/log.ts`, `lib/cron.ts`, `app/api/health` | Headers, entorno, logs, salud, crons |

### Datos principales

`candidatos`, `empresas` (id = `auth.users.id`) · `vacantes` (`estado`, `estado_moderacion`, `es_publica` generada, `destacada_hasta`) · `postulaciones` + `postulacion_historial` · `reportes_vacante` · `hojas_de_vida`, `linkedin_perfiles`, `ia_uso` · `suscripciones`, `pagos`, `webhook_eventos` · `consentimientos`, `solicitudes_titular` · `audit_log`, `eventos` · `staff`, `rate_limits`.

Esquema v2: `supabase/migrations/20260914000000_spec_v2.sql`.

## 3. Autorización

- **Servidor con service role.** Lecturas cruzadas y **todas las escrituras** pasan por Server Actions o Route Handlers con `createAdminClient()` (`import "server-only"`), después de verificar sesión, dueño o rol en código.
- **Navegador sin escritura.** La migración v2 revoca `insert/update/delete` a `anon` y `authenticated`. RLS deja solo lecturas mínimas (vacantes públicas, filas propias).
- **Roles de staff** en `staff` (`super_admin` vía `ADMIN_EMAILS`, `admin`, `moderador`) con `puede(rol, permiso)`.
- **Rutas protegidas** en `lib/supabase/middleware.ts`. Las páginas vuelven a verificar: el proxy no es la única barrera.

## 4. Auditoría vs eventos

| | `audit_log` (`lib/audit.ts`) | `eventos` (`lib/eventos.ts`) |
|---|---|---|
| Para qué | Trazabilidad y evidencia: quién hizo qué, antes/después | Analítica de producto y KPIs |
| Mutabilidad | **Append-only**: sin UPDATE/DELETE, ni para el servicio | Normal |
| Retención | 5 años | 24 meses |
| Datos personales | Solo ids y campos cambiados (`diffCampos`), sin correos de usuarios finales | Ids y metadatos agregables |
| Falla | Nunca rompe el flujo; deja `log.error` para alertar | Nunca rompe el flujo; `log.warn` |

## 5. Pagos

- **Adaptador** de pasarela (`lib/billing`): hoy `sandbox`, mañana Wompi con la misma interfaz (`PAGOS_PROVEEDOR`).
- Flujo: `iniciarCompra` → `pagos (pendiente)` → redirección → **webhook** → `webhook_eventos` (único por `(proveedor, evento_id)`: **idempotente**) → verificación de firma → `pagos.aprobado` → `suscripciones` → `sincronizarPlanCache`.
- El webhook es la fuente de verdad; la página de retorno solo muestra estado.
- `procesarVencimientos` (cron `/api/cron/suscripciones`) mueve `active → past_due → expired` y aplica renovaciones.
- Soportes de pago sin FK a la cuenta: se conservan 10 años aunque se borre el usuario.

## 6. IA desacoplada

- Proveedor detrás de `lib/ia/**`. **Prompts versionados** (`prompt_version` en cada HV y en `ia_uso`).
- **Validación** del resultado (esquema, no inventar datos ausentes en `datos_fuente`) antes de guardar. El resultado queda en `borrador` hasta que el candidato lo **aprueba**.
- **Costos** por llamada en `ia_uso` (tokens, `costo_usd`, latencia, estado). Rate limit `ia_generar`.
- Sin `ANTHROPIC_API_KEY` la función degrada (`sin_credenciales` / `fallback_local`) sin romper la página.

## 7. Observabilidad

- **Logs JSON** por línea (`lib/log.ts`) con redacción de campos sensibles. Vercel los indexa.
- **`instrumentation.ts`:** `register()` valida el entorno (`lib/env.ts`) y `onRequestError` registra errores de render, route handlers, actions y proxy con ruta, método, tipo de ruta y `digest` (sin cuerpo, headers ni cookies). El `digest` que ve el usuario en `app/error.tsx` permite encontrar el log.
- **`/api/health`:** estado, BD (`ok|error`), latencia, versión (commit corto). 503 si la BD falla.
- **Recomendado para producción:**
  1. **Log drain** de Vercel hacia Axiom, Better Stack o Datadog, con alertas sobre `nivel=error` y mensajes clave (`audit_log_fallo`, `cron_fallo`, `webhook_*`, `rate_limit_fallo`, `entorno_invalido`).
  2. **Monitor de uptime** (Better Stack, UptimeRobot) contra `/api/health` cada 1–5 min.
  3. Alertas de **costo IA** (suma diaria de `ia_uso.costo_usd`) y de **crons** que no corrieron (ausencia de `sistema.tarea_programada` del día).

## 8. Seguridad

- **Headers** en `next.config.ts`: CSP, HSTS con preload, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, sin `X-Powered-By`.
  - La CSP usa `'unsafe-inline'` en scripts (sin nonces) para no forzar render dinámico en todas las páginas. Camino a endurecerla: nonce por request en `proxy.ts` + `'strict-dynamic'`.
- **Secretos** solo en variables de entorno de Vercel (Production/Preview separados). El service role nunca llega al navegador (`server-only`). `CRON_SECRET` obligatorio en producción.
- **Mínimo privilegio:** navegador sin escrituras, funciones internas revocadas a `anon/authenticated`, append-only para evidencia.
- **Rate limiting** en login, registro, postulación, IA, reportes, solicitudes de titulares, checkout y webhooks.
- **Cifrado:** TLS en tránsito (Vercel y Supabase) y cifrado en reposo del almacenamiento de Supabase.
- Datos personales fuera de logs y de la auditoría.

## 9. Respaldos

- Supabase gestionado hace respaldos diarios. **PITR** (point-in-time recovery) requiere plan pago: activarlo antes de recibir pagos reales.
- **Prueba de restauración** trimestral: restaurar en un proyecto temporal, correr `pnpm test:integracion` apuntando a él y registrar el resultado.
- Las migraciones en `supabase/migrations` son la fuente de verdad del esquema.

## 10. Retención

Función `purgar_datos_retencion()` (cron semanal `/api/cron/retencion`, domingos 08:00 UTC):

| Dato | Plazo | Implementación |
|---|---|---|
| Perfil y cuenta | Hasta eliminar la cuenta | Borrado por el usuario (`/cuenta`) |
| `consentimientos`, `audit_log` | 5 años | `audit_log` purgado por la función; consentimientos sin purga automática aún (pendiente) |
| `pagos`, `suscripciones` | 10 años | Sin purga automática (volumen bajo) |
| `eventos` | 24 meses | Función |
| `webhook_eventos` procesados | 18 meses | Función |
| `rate_limits` | 1 día | Función |

Cada ejecución deja `sistema.tarea_programada` con los conteos en la auditoría.

## 11. Runbook breve

**Webhook de pagos caído o fallando**
1. Revisar logs `webhook_*` y `/api/health`.
2. Consultar `webhook_eventos` con `procesado_en is null` o `error is not null`.
3. Corregir y reprocesar: la idempotencia por `(proveedor, evento_id)` permite reenviar desde el panel del proveedor sin duplicar.
4. Si hubo pagos aprobados sin activar, conciliar `pagos` contra el reporte del proveedor.

**Cron que no corre o falla**
1. Vercel → Settings → Cron Jobs: ver última ejecución y respuesta.
2. `401` → `CRON_SECRET` no coincide. `500` → buscar `cron_fallo` en logs.
3. Ejecutar a mano: `curl -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/vacantes`.
4. Las funciones SQL son idempotentes: se pueden correr más de una vez.

**Costo de IA disparado**
1. `select feature, actor_id, count(*), sum(costo_usd) from ia_uso where creado_en > now() - interval '1 day' group by 1, 2 order by 4 desc`.
2. Si es abuso de un actor: bajar `LIMITES.ia_generar`, suspender la cuenta.
3. Si es general: cambiar `ANTHROPIC_MODEL` a uno más barato o quitar `ANTHROPIC_API_KEY` (degrada sin romper).

**BD lenta o caída**
1. `/api/health` en 503 → estado de Supabase (status.supabase.com) y métricas del proyecto.
2. Revisar consultas lentas en Supabase → Reports y los índices de la migración v2.
