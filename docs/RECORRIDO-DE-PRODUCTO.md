# CostaLaboral — Recorrido de producto (evidencia de flujos) 🌴

**Documento de entrega · Fase 1 (MVP) + Admin + Asistente de HV con IA**
Generado el 2 de julio de 2026. Capturas reales tomadas con Playwright sobre la app corriendo (Next.js 16 + Supabase).

CostaLaboral es la plataforma de empleo hiperlocal del **Caribe colombiano**: conecta candidatos con microempresas, emprendedores y negocios informales mediante **matching dirigido** (solo las vacantes que encajan con tu perfil, directo a tu WhatsApp). Las empresas publican **gratis**; la monetización viene del lado candidato (planes) y de la nueva **feature de IA**.

---

## ✅ Estado verificado

| Verificación | Resultado |
|---|---|
| Rutas que compilan (`pnpm build`) | **20/20** |
| Tests automáticos (`pnpm test`) | **31/31 pass** (dominio + integración Supabase + smoke HTTP) |
| Auditoría HTTP de todas las rutas | Sin 500 · públicas 200 · privadas 307→login |
| Typecheck (`tsc --noEmit`) | Limpio |
| Diseño | Sistema "Caribe bravo" (cartoon/editorial), sin gradientes/glass/slop |

**Cuentas demo** (contraseña `costalaboral`): candidato `maria@demo.co` · empresa `corralito@demo.co` · admin + Berraco Pro `gamerpg08@gmail.com`.

## Índice
1. [Landing](#1-landing) · 2. [Buscador de ofertas](#2-buscador-de-ofertas) · 3. [Registro](#3-registro) · 4. [Ficha de vacante y planes](#4-ficha-de-vacante-planes-por-plan) · 5. [Candidato](#5-candidato) · 6. [Empresa](#6-empresa) · 7. [Planes](#7-planes) · 8. [⭐ Hoja de vida con IA](#8--hoja-de-vida-con-ia-feature-destacada) · 9. [Admin](#9-administrador-roles-tracking-y-aprobaciones) · 10. [Privacidad](#10-privacidad)

---

## 1. Landing
Página de entrada con la nueva identidad visual. Hero con propuesta de valor, banda de datos, "cómo funciona" para candidatos y empresas, **sección destacada de la Hoja de Vida con IA**, vacantes recientes reales y CTAs. Todo responsive.

![Landing](capturas/01-landing.png)

---

## 2. Buscador de ofertas
`/ofertas` — la vitrina pública para **leer y filtrar todas las ofertas** (complementa el feed dirigido). Búsqueda por palabra clave + filtros por ciudad, área y modalidad, con paginación y chips de filtros activos.

![Ofertas](capturas/02-ofertas.png)

Filtrado por área **Ventas** + ciudad **Barranquilla** (resultados y chip activo "Ventas ✕"):

![Ofertas filtradas](capturas/03-ofertas-filtro.png)

---

## 3. Registro
Registro de candidato en **1 paso** (fricción mínima: nombre, WhatsApp, ciudad, área, nivel, con consentimiento Ley 1581) y publicación de vacante en **wizard de 3 pasos** para empresas (crea la cuenta en el mismo flujo, sin exigir RUT ni cámara de comercio).

| Candidato | Empresa (wizard) |
|---|---|
| ![Registro candidato](capturas/05-registro-candidato.png) | ![Registro empresa](capturas/06-registro-empresa.png) |

Ingreso: ![Login](capturas/07-login.png)

---

## 4. Ficha de vacante (planes por plan)
El contenido visible **cambia según el plan** del candidato (regla de negocio 4.3).

**Visitante anónimo** — ve cargo, ciudad y salario; empresa y requisitos ocultos; CTA a registrarse:

![Vacante anónimo](capturas/09-vacante-anonimo.png)

**Candidato Berraco Pro** — ve todo: empresa verificada, requisitos completos, **% de match** y etiqueta "⚡ Prioridad 2h":

![Vacante candidato](capturas/13-vacante-candidato.png)

---

## 5. Candidato
**`/mis-vacantes`** — feed **personal y dirigido** (no vitrina): coincidencias ordenadas por % de match, estado del plan (postulaciones restantes) y **banner destacado de la Hoja de Vida con IA**.

![Mis vacantes](capturas/10-mis-vacantes.png)

**`/perfil`** — datos, plan activo, historial de postulaciones con estado.

![Perfil](capturas/11-perfil.png)

---

## 6. Empresa
**`/empresa/panel`** — herramienta de decisión, gratuita. Vacantes en acordeón con candidatos **ordenados por % de match**, contacto directo por WhatsApp y estados de seguimiento (nuevo → contactado → entrevista → contratado).

![Panel de empresa](capturas/14-empresa-panel.png)

---

## 7. Planes
Modelo freemium del lado candidato (empresas siempre gratis). Gratis / **Camelleitor** / **Berraco Pro**, con la Hoja de Vida con IA incluida en los pagos.

![Planes](capturas/04-planes.png)

---

## 8. ⭐ Hoja de vida con IA (feature destacada)
La nueva palanca de valor y conversión: un asistente que, con un flujo de preguntas, **genera una hoja de vida profesional y optimiza el LinkedIn** del candidato. Es beneficio de los planes de pago (membresía) y está posicionada en la **landing**, en el **nav** del candidato y como **banner en `/mis-vacantes`**.

**Muro premium (plan gratis)** — invita a subir de plan:

![HV upsell](capturas/12-hoja-de-vida-upsell.png)

**Panel (plan de pago)** — lista de hojas de vida y acceso al asistente:

![HV panel](capturas/21-hoja-de-vida-panel.png)

**Asistente guiado** — 5 pasos (objetivo, experiencia, habilidades, educación, generar) con barra de progreso y campos precargados del perfil:

![HV wizard](capturas/22-hv-wizard.png)

**Resultado generado** — vista previa editable del CV (perfil, habilidades, experiencia, educación, logros) **+ bloque de LinkedIn** (titular y "Acerca de") con botones Copiar y Guardar. Funciona con la API de Anthropic si hay `ANTHROPIC_API_KEY`, y con un **fallback determinista** si no la hay (como en esta captura, "Redactada con plantilla inteligente"):

![HV resultado](capturas/23-hv-resultado.png)

---

## 9. Administrador (roles, tracking y aprobaciones)
Panel interno completo con **3 roles** (super_admin / admin / moderador) y control de acceso.

**Resumen** — métricas vs. metas de Fase 1 con barras de progreso, eventos por día y actividad reciente:

![Admin resumen](capturas/15-admin-resumen.png)

**Gestión de candidatos** (búsqueda, paginación, activar/desactivar) y **cola de verificación de empresas**:

| Candidatos | Empresas |
|---|---|
| ![Admin candidatos](capturas/16-admin-candidatos.png) | ![Admin empresas](capturas/17-admin-empresas.png) |

**Moderación de vacantes** (aprobar / rechazar con motivo / reportar) y **registro de actividad** (tracking de uso):

| Vacantes (moderación) | Actividad |
|---|---|
| ![Admin vacantes](capturas/18-admin-vacantes.png) | ![Admin actividad](capturas/19-admin-actividad.png) |

**Gestión de staff** (solo super_admin — cambiar roles):

![Admin staff](capturas/20-admin-staff.png)

---

## 10. Privacidad
Política de tratamiento de datos (Ley 1581 de 2012): consentimiento WhatsApp, qué se comparte con empresas, cifrado y eliminación de cuenta.

![Privacidad](capturas/08-privacidad.png)

---

## Matriz de features (qué funciona)

| Feature | Estado |
|---|---|
| Registro candidato / empresa + login (Supabase Auth) | ✅ |
| Matching dirigido (ciudad + área + nivel + disponibilidad) | ✅ |
| Feed personal `/mis-vacantes` con % de match y límites de plan | ✅ |
| Buscador público `/ofertas` con filtros y paginación | ✅ |
| Ficha de vacante con visibilidad por plan + muro de pago | ✅ |
| Postulación con límites (3 / 15 / ilimitado por 90 días) | ✅ |
| Panel de empresa: candidatos por % match + WhatsApp + seguimiento | ✅ |
| Planes (activación de prueba; Wompi en Fase 2) | ✅ |
| **Hoja de vida + LinkedIn con IA** (premium, con fallback) | ✅ |
| Admin con roles, métricas, tracking de eventos | ✅ |
| Aprobaciones: verificación de empresas + moderación de vacantes | ✅ |
| Notificaciones WhatsApp (registro + envío manual desde admin) | ✅ |

## Notas técnicas
- **Supabase** corre local; para producción: `supabase link` + `supabase db push` + variables en Vercel.
- La feature de IA usa `ANTHROPIC_API_KEY` cuando está definida; sin clave, un generador determinista produce un resultado presentable (las capturas muestran ese modo).
- **Fase 2 pendiente:** WhatsApp Business API (envío automático), pasarela Wompi, cursos/academia.

## Cómo reproducir este recorrido
```bash
supabase start      # Postgres + Auth local (Docker)
pnpm seed           # datos demo
pnpm dev            # http://localhost:3000
node scripts/capturas.mjs   # regenera las capturas de docs/capturas/
```
