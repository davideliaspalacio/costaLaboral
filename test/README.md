# Pruebas de CostaLaboral

Tests sin dependencias nuevas: solo `node:test` + `node:assert/strict`,
`@supabase/supabase-js` (ya instalado) y `fetch` nativo. Escritos en `.mjs`
para no requerir loaders de TypeScript. Requieren Node 24+ (`node --test`,
`--env-file`).

## Suites

| Archivo | Qué valida | Necesita |
| --- | --- | --- |
| `dominio.test.mjs` | Reglas de dominio PURAS reimplementadas en el test: elegibilidad, score (varios casos) y límites de plan por 90 días. | Nada (offline). |
| `datos.integracion.test.mjs` | Estado real sembrado en Supabase local: tablas/columnas nuevas, conteos mínimos (≥6 empresas, ≥9 vacantes, ≥9 candidatos), perfil de `maria@demo.co`, recomputo del matching (vacantes de ventas de su ciudad con score 100), filas en `eventos` y ≥1 en `staff`. | Supabase local + envs + `pnpm seed`. |
| `http.smoke.test.mjs` | Smoke HTTP: `GET /`, `/planes`, `/login`, `/privacidad` devuelven 200 con textos clave; vigila `/ofertas` (ver nota). | Dev server (`pnpm dev`). |

> Nota: las reglas de dominio se **reimplementan** dentro de los tests
> (no se importa la lib en TypeScript) para evitar loaders. Deben mantenerse
> en sincronía con `lib/matching.ts`, `lib/plan.ts` y `lib/constants.ts`.

## Cómo correr

1. Levanta Supabase local (si no está arriba) y siembra los datos de demo:

   ```bash
   supabase start        # si el stack local no está corriendo
   pnpm seed             # carga empresas, vacantes, candidatos, eventos…
   ```

2. (Opcional, para el smoke HTTP) arranca el dev server en **otra terminal**:

   ```bash
   pnpm dev              # http://localhost:3000
   ```

3. Corre las pruebas:

   ```bash
   pnpm test             # node --test --env-file=.env.local test/
   pnpm test:watch       # modo watch
   ```

### Comportamiento sin servicios

- Sin `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`,
  la suite de datos se **salta** (`test.skip`) en lugar de fallar.
- Sin dev server en `localhost:3000`, el smoke HTTP se **salta**.
- Base URL del smoke configurable con `SMOKE_BASE_URL`.

Correr solo lo que no necesita dev server:

```bash
node --test --env-file=.env.local test/dominio.test.mjs test/datos.integracion.test.mjs
```

## Nota sobre `/ofertas`

La home y el header enlazan a `/ofertas`, pero esa página **aún no existe**
(Next.js responde 404). El smoke test lo documenta: el caso pasa cuando la
ruta devuelva 200 y, mientras siga sin implementarse, se **salta avisando**
para no romper la corrida. Cuando se cree `app/ofertas/page.tsx`, el test
empezará a exigir 200 automáticamente.

## Añadir E2E con Playwright más adelante

Los smoke tests actuales solo verifican status + texto en el HTML servido.
Para flujos reales de navegador (registro, login, postular, panel de empresa)
se puede añadir Playwright **cuando se decida** — no ejecutar ahora:

```bash
pnpm add -D @playwright/test
npx playwright install          # descarga los navegadores
```

Luego crear `playwright.config.ts` (o `.mjs`) con `webServer` apuntando a
`pnpm dev` y specs en `e2e/`, corriéndolos con `npx playwright test`.
Se mantiene aparte de `node --test` para no mezclar runners.
