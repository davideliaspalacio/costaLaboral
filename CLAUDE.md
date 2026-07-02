# CostaLaboral — notas para Claude Code

Marketplace de empleo del Caribe colombiano (Next.js 16 + Supabase). Estilo JobToday. Fase 1 MVP.

## Comandos

```bash
supabase start          # Postgres + Auth local (requiere Docker); aplica migraciones
pnpm dev                # servidor de desarrollo (localhost:3000)
pnpm build              # build de producción
pnpm exec tsc --noEmit  # typecheck
pnpm seed               # datos de demo (node --env-file=.env.local scripts/seed.mjs)
pnpm db:reset           # recrea la BD local y reaplica migraciones (BORRA datos)
```

## Arquitectura (lo esencial)

- **Auth:** Supabase Auth (email/password). `candidatos.id` y `empresas.id` == `auth.users.id`. El tipo de usuario vive en `user_metadata.tipo` (`candidato`|`empresa`). Admin = correo en `ADMIN_EMAILS`.
- **Acceso a datos:** las lecturas/mutaciones cruzadas se hacen en el servidor con el **cliente service-role** (`lib/supabase/admin.ts`), autorizando en código. RLS protege el acceso directo del navegador. El service key es solo servidor (`import "server-only"`).
- **Dominio puro** en `lib/matching.ts` (score) y `lib/plan.ts` (límites). No dupliques esta lógica en las páginas: úsalas.
- **Server Components por defecto.** `"use client"` solo en formularios/interacción. Nunca pases handlers inline (`onClick`) desde un Server Component: extrae un componente cliente.
- Rutas privadas protegidas en `proxy.ts` (Next 16 renombró `middleware` → `proxy`).

## Convenciones

- Todo en español; moneda con `formatSalario`/`formatCOP`.
- Colores solo por tokens Tailwind (`brand-*`, `accent-*`, `ink`, `muted`, `line`, `canvas`, `surface`). Sin hex.
- Reutiliza `components/ui/*`, `components/vacante/*`, `components/site/*`.

## Estado / pendientes

- Supabase corre **local**. Para producción: `supabase link` + `supabase db push` + env en Vercel.
- Fase 2 (no implementado): WhatsApp Business API, Wompi, IA Anthropic, academia de cursos.
