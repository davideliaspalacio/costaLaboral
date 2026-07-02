# CostaLaboral 🌴

Plataforma de empleo hiperlocal del **Caribe colombiano**. Conecta candidatos (bachilleres, técnicos, tecnólogos, universitarios) con microempresas, emprendedores y personas naturales de la región. Estilo visual inspirado en **JobToday**.

> **Modelo clave:** matching *dirigido* (no vitrina abierta). El candidato recibe solo las vacantes que encajan con su perfil. Las **empresas publican gratis**; la monetización viene del lado candidato (planes Gratis / Camelleitor / Berraco Pro).

Este repo implementa la **Fase 1 (MVP)** completa del Documento Técnico.

## Stack

- **Next.js 16** (App Router, React 19, Server Components) + **TypeScript**
- **Tailwind CSS v4** (design system en `app/globals.css`)
- **Supabase** (PostgreSQL + Auth) — local vía CLI
- Deploy objetivo: **Vercel** + Supabase gestionado

## Requisitos

- Node 20+ y **pnpm**
- **Docker** corriendo (para Supabase local)
- **Supabase CLI** (`supabase`)

## Correr en local

```bash
# 1. Levantar Supabase local (Postgres + Auth). Aplica migraciones automáticamente.
supabase start

# 2. Cargar datos de demo (empresas, vacantes, candidatos, postulaciones)
pnpm seed

# 3. Arrancar la app
pnpm dev            # http://localhost:3000
```

Si `supabase start` cambia las llaves, actualiza `.env.local` con la salida de `supabase status`.
Para recrear la base desde cero: `pnpm db:reset && pnpm seed`.

### Cuentas de demo (contraseña: `costalaboral`)

| Rol | Correo |
|-----|--------|
| Candidato | `maria@demo.co` |
| Empresa | `corralito@demo.co` |
| Admin + candidato | `gamerpg08@gmail.com` (definido en `ADMIN_EMAILS`) |

Supabase Studio: http://127.0.0.1:54323 · Correos de prueba (Mailpit): http://127.0.0.1:54324

## Estructura

```
app/                      Rutas (Fase 1)
  page.tsx                Landing
  registro-candidato/     Registro candidato (1 paso)
  registro-empresa/       Publicar vacante (wizard 3 pasos, crea cuenta empresa)
  mis-vacantes/           Feed personal de matches (no vitrina)
  v/[id]/                 Ficha de vacante (contenido según plan)
  perfil/                 Perfil + postulaciones + plan
  empresa/panel/          Panel de empresa (candidatos por % match)
  planes/                 Precios (activar plan de prueba)
  admin/                  Métricas internas (acceso por ADMIN_EMAILS)
  login/  privacidad/
lib/
  supabase/               Clientes (browser, server, admin=service role)
  actions/                Server Actions (candidato, empresa, postulación, auth)
  data/                   Consultas (vacantes, postulaciones, métricas)
  matching.ts             Score Fase 1: Ciudad 40 + Área 30 + Nivel 20 + Disp 10
  plan.ts                 Límites de plan (3 / 15 / ilimitado por 90 días)
  constants.ts  types.ts  utils.ts
components/               ui/ (primitivas), site/ (header, footer), vacante/, admin/, marketing/
supabase/migrations/      Esquema + RLS + grants
scripts/seed.mjs          Datos de demo
proxy.ts                  Middleware de sesión + protección de rutas (Next 16)
```

## Reglas de negocio implementadas

- **Matching dirigido:** el feed y las notificaciones solo incluyen vacantes elegibles (misma área, misma ciudad o remota, nivel educativo cumplido), ordenadas por score.
- **Planes y límites (4.4):** Gratis 3 / Camelleitor 15 / Berraco Pro ilimitado, por ventana de 90 días. Al vencer un plan pago se vuelve a Gratis.
- **Visibilidad por plan en la ficha (4.3):** el plan gratis oculta empresa y requisitos; sin cupo aparece el muro de pago; Berraco Pro ve el % de match y la etiqueta *Prioridad 2h*.
- **Panel de empresa (5.5):** candidatos ordenados por % de match, contacto por WhatsApp, estados de seguimiento. Siempre **gratis** para la empresa.
- **Notificaciones WhatsApp (6):** al publicar una vacante se generan los mensajes (plantillas aprobadas) en `notificaciones_wsp`. En Fase 1 el envío es **manual** desde `/admin` (botón *Enviar por WhatsApp* → wa.me).
- **Ley 1581:** consentimiento en el registro, `/privacidad`, datos de candidato ocultos a la empresa hasta postularse.

## Pasar a producción (Supabase gestionado + Vercel)

```bash
# 1. Crea un proyecto en supabase.com y enlázalo
supabase link --project-ref <TU_REF>
supabase db push                 # aplica las migraciones al proyecto remoto

# 2. En Vercel, define las variables de entorno (ver .env.example):
#    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#    SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS, NEXT_PUBLIC_SITE_URL

# 3. Deploy
vercel --prod
```

## Pendiente para Fase 2 (no incluido)

- API de WhatsApp Business (Meta Cloud) para envío automático de las plantillas
- Pasarela **Wompi** en `/planes` (hoy el botón activa un plan de prueba)
- IA con **Anthropic** (mejora de descripción, resumen de HV, score semántico)
- Academia / cursos con insignias verificables
