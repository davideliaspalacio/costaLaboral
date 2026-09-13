# CostaLaboral — notas para Claude Code

Plataforma de empleo del Caribe colombiano (Next.js 16 + Supabase). Spec MVP v2: todo abierto y gratis para postular; se cobra solo por servicios de valor agregado (IA, destacadas, Pro). No es agencia de colocación ni cobra comisión por contratación.

## Comandos

```bash
supabase start          # Postgres + Auth local (Docker); aplica migraciones
pnpm dev                # localhost:3000
pnpm typecheck          # tsc --noEmit
pnpm test               # vitest (test/unit/**)
pnpm test:integracion   # node --test contra Supabase local / servidor (test/*.test.mjs)
pnpm seed               # datos de demo
pnpm db:reset           # recrea la BD local (BORRA datos)
```

## Arquitectura (lo esencial)

- **Auth:** Supabase email/password. `candidatos.id`/`empresas.id` == `auth.users.id`; tipo en `user_metadata.tipo`. Staff en `staff` + `ADMIN_EMAILS`.
- **Datos:** todas las escrituras en el servidor con `createAdminClient()` y autorización en código. El navegador no escribe en la BD.
- **Dominio puro:** `lib/matching.ts`, `lib/vacante.ts`, `lib/entitlements.ts`, `lib/postulaciones-reglas.ts`, `lib/legal/dias-habiles.ts`. No dupliques esa lógica.
- **Toda mutación** → `registrarAuditoria` (`lib/audit.ts`, append-only). **KPIs** → `registrarEvento`. **Abuso** → `limitar(...)`.
- **Plataforma:** headers/CSP en `next.config.ts`, entorno en `lib/env.ts` + `instrumentation.ts`, logs con `lib/log.ts` (sin datos personales), crons en `vercel.json` protegidos con `autorizarCron`.
- **Legal:** si cambias `/terminos` o `/privacidad`, sube `VERSION_*` en `lib/legal/documentos.ts`.
- Server Components por defecto; `"use client"` solo para interacción. Rutas privadas en `lib/supabase/middleware.ts` (vía `proxy.ts`).

## Convenciones

- Todo en español; moneda con `formatSalario`/`formatCOP`.
- Colores solo por tokens (`brand-*`, `accent-*`, `sol-*`, `ink`, `ink-soft`, `muted`, `line`, `canvas`, `surface`, `success-*`, `danger-*`). Estilo sticker: `border-2 border-ink` + sombra dura; sin gradientes.
- Reutiliza `components/ui/*`, `components/vacante/*`, `components/site/*`.

## Estado

- IA implementada; pagos con pasarela **sandbox** (Wompi pendiente); WhatsApp solo plan (`docs/PLAN-WHATSAPP.md`).
- Supabase corre local. Producción: `supabase link` + `supabase db push` + env en Vercel (ver `.env.example`, `docs/ARQUITECTURA.md`).
