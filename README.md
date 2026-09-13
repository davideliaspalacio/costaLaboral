# CostaLaboral

Plataforma de empleo hiperlocal del **Caribe colombiano** (piloto: Barranquilla, Cartagena y Santa Marta). Conecta candidatos con microempresas, emprendedores y empresas de la región.

> **Modelo de negocio (Especificación MVP v2):** todo abierto. Cualquier persona ve la vacante completa (empresa, salario, requisitos y descripción); postularse y ver el % de coincidencia es gratis y sin límite. CostaLaboral **no es agencia de colocación y no cobra comisión por contratación**: la monetización está en **servicios de valor agregado** (hoja de vida y LinkedIn con IA para candidatos; vacantes destacadas y plan Pro para empresas).

## Stack

- **Next.js 16** (App Router, React 19, Server Components) + **TypeScript**
- **Tailwind CSS v4** (sistema de diseño "Caribe bravo" en `app/globals.css`)
- **Supabase** (Postgres + Auth), local vía CLI
- **Anthropic** (IA para hoja de vida y LinkedIn)
- Deploy objetivo: **Vercel** + Supabase gestionado

## Requisitos

- Node 20+ y **pnpm**
- **Docker** corriendo (para Supabase local)
- **Supabase CLI** (`supabase`)

## Correr en local

```bash
supabase start          # Postgres + Auth local; aplica migraciones
cp .env.example .env.local   # completa con la salida de `supabase status`
pnpm seed               # datos de demo
pnpm dev                # http://localhost:3000
```

Para recrear la base desde cero: `pnpm db:reset && pnpm seed`.

### Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm start` | Desarrollo, build y servidor de producción |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Pruebas unitarias con **vitest** (`test/unit/**`) |
| `pnpm test:integracion` | `node --test` contra Supabase local y el servidor (`test/*.test.mjs`; se saltan si no hay entorno o servidor) |
| `pnpm seed` | Datos de demo |
| `pnpm db:reset` | Recrea la BD local (**borra datos**) |

### Cuentas de demo (contraseña: `costalaboral`)

| Rol | Correo |
|-----|--------|
| Candidato | `maria@demo.co` |
| Empresa | `corralito@demo.co` |
| Admin + candidato | `gamerpg08@gmail.com` (definido en `ADMIN_EMAILS`) |

Supabase Studio: http://127.0.0.1:54323 · Correos de prueba (Mailpit): http://127.0.0.1:54324

## Estado

| Área | Estado |
|---|---|
| Portal abierto (`/ofertas`, ficha, reportes de vacantes) | Implementado |
| Candidato: registro, perfil, postulaciones con historial, autorizaciones separadas (datos, WhatsApp, perfil visible) | Implementado |
| Empresa: vacantes con ciclo de vida (borrador/publicada/pausada/cerrada), moderación, verificación, pipeline | Implementado |
| Match explicable (ciudad 40, área 30, nivel 20, disponibilidad 10) | Implementado |
| **IA**: hoja de vida y LinkedIn con aprobación del candidato, costos en `ia_uso` | Implementado |
| **Pagos**: suscripciones, vacante destacada, webhooks idempotentes | Implementado con pasarela **sandbox** (sin cobros reales); Wompi pendiente |
| Admin: moderación, auditoría, KPIs | Implementado |
| Legal: términos, política de datos, `/datos-personales` (consultas y reclamos con radicado y plazos en días hábiles) | Implementado; faltan datos de la sociedad |
| Plataforma: headers de seguridad, validación de entorno, `/api/health`, crons, logs JSON | Implementado |
| **WhatsApp** automático (digest diario) | Solo plan: [`docs/PLAN-WHATSAPP.md`](docs/PLAN-WHATSAPP.md). Hoy el envío es manual desde `/admin` |

## Estructura

```
app/                      Rutas (App Router)
  ofertas/ v/[id]/        Portal público y ficha
  registro-candidato/ perfil/ mis-vacantes/ cuenta/
  registro-empresa/ empresa/
  hoja-de-vida/ linkedin/ IA (con sesión)
  planes/ pagos/          Planes y checkout
  admin/                  Panel interno (staff)
  terminos/ privacidad/ datos-personales/
  api/health              Salud (BD, latencia, versión)
  api/cron/*              Tareas programadas (Vercel Cron)
lib/
  supabase/               Clientes (browser, server, admin = service role) + middleware
  actions/                Server Actions
  data/                   Consultas
  billing/                Catálogo, suscripciones, adaptador de pasarela
  ia/                     Cliente IA, prompts versionados, validación
  legal/                  Versiones, consentimientos, días hábiles, radicados, solicitudes
  matching.ts audit.ts eventos.ts rate-limit.ts log.ts env.ts cron.ts
supabase/migrations/      Esquema, RLS y privilegios
instrumentation.ts        Validación de entorno + onRequestError
proxy.ts                  Sesión y rutas protegidas (Next 16)
vercel.json               Crons
docs/                     Arquitectura, plan de WhatsApp, recorrido de producto
```

Más detalle en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Variables de entorno

Todas documentadas en [`.env.example`](.env.example). Resumen:

- **Obligatorias:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`. En producción también `CRON_SECRET`.
- **IA:** `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `TRM_COP_USD`.
- **Pagos:** `PAGOS_PROVEEDOR` (`sandbox`), `PAGOS_SANDBOX_SECRET`.
- **Legal:** `NEXT_PUBLIC_LEGAL_RAZON_SOCIAL`, `_NIT`, `_DOMICILIO`, `_DIRECCION`, `_EMAIL_DATOS`, `_TELEFONO`. Si faltan, las políticas muestran "[… POR DEFINIR]".
- **Admin:** `ADMIN_EMAILS`.

`instrumentation.ts` valida el entorno al arrancar y registra qué falta (sin imprimir valores).

## Pasar a producción (Supabase gestionado + Vercel)

```bash
supabase link --project-ref <TU_REF>
supabase db push                 # aplica las migraciones
# Vercel → Settings → Environment Variables: ver .env.example (incluye CRON_SECRET)
vercel --prod
```

Después del primer deploy:

1. Verifica `https://<dominio>/api/health` (debe responder `db: "ok"`).
2. Revisa Vercel → Cron Jobs (`/api/cron/vacantes`, `/api/cron/suscripciones`, `/api/cron/retencion`).
3. Configura un monitor de uptime contra `/api/health` y un log drain con alertas (ver `docs/ARQUITECTURA.md`).
4. Completa los datos legales `NEXT_PUBLIC_LEGAL_*` y valida los textos con un abogado.
5. Activa PITR en Supabase antes de recibir pagos reales.

## Pendiente

- Pasarela real (Wompi) con la interfaz del adaptador.
- WhatsApp automático (ver plan).
- Login con código OTP (se mantiene email + contraseña por decisión del producto).
- Academia / cursos.
