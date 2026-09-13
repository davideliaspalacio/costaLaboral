# Plan — Notificaciones por WhatsApp (sección 9)

Estado: **plan, no implementado**. Proveedor por decidir. Hoy los mensajes se generan en `notificaciones_wsp` y se envían a mano desde `/admin` (wa.me).

## 1. Objetivo y costos

- **Objetivo:** que cada candidato con autorización reciba un **resumen diario** con las 3–5 vacantes con mejor match (≥ umbral), sin repetir vacantes, en horario permitido, y que pueda darse de baja al instante.
- **KPIs:** tasa de entrega, tasa de lectura del digest, clic → ficha (`?src=whatsapp`), postulaciones atribuidas, costo por postulación.
- **Costo:** Meta cobra **por mensaje de plantilla entregado**, con tarifa distinta según **categoría** (marketing > utility > authentication) y país del destinatario. Los mensajes dentro de una ventana de servicio de 24 h abierta por el usuario pueden ser gratis o más baratos. Los BSP suman un recargo por mensaje o una mensualidad. **Tarifas por validar al contratar** (cambian con frecuencia).
- Orden de magnitud a validar: 1.000 candidatos activos × 1 digest/día × 30 días = 30.000 plantillas/mes. Ese volumen define el presupuesto.

## 2. Arquitectura

```
Vercel Cron (cada hora) ──► /api/cron/whatsapp/digest
     │  1. segmenta por ventana horaria + ciudad/área
     │  2. arma el digest por candidato (lib/matching.ts)
     │  3. encola en wsp_envios (estado=pendiente)
     ▼
Vercel Cron (cada 5 min, o Vercel Queues) ──► /api/cron/whatsapp/enviar
     │  toma lote con FOR UPDATE SKIP LOCKED, respeta presupuesto y horario
     │  llama al proveedor (adaptador) → estado=enviado | reintento | fallido
     ▼
/api/whatsapp/webhook  ◄── estados (sent/delivered/read/failed) y mensajes entrantes (BAJA/STOP)
```

- **Preferencias por candidato** (`wsp_preferencias`): frecuencia (`diaria` | `semanal` | `pausada`), ventana preferida (mañana/mediodía/tarde), umbral personal opcional.
- **Generación del digest:** vacantes publicadas en las últimas 24–72 h, `evaluarMatch(c, v).score ≥ UMBRAL_RECOMENDACION` (o el umbral del candidato), orden score → destacada → recencia, tope 5, mínimo 3 (si hay menos de 3 no se envía; se acumula para el siguiente).
- **Batching:** ventanas horarias fijas (p. ej. 07:30, 12:00, 18:00 hora Bogotá) × segmento ciudad/área. Así el match se calcula una vez por segmento de vacantes y se reparte a sus candidatos.
- **Deduplicación:** `wsp_vacantes_enviadas (candidato_id, vacante_id)` con ventana configurable (`WSP_DEDUP_DIAS`, por defecto 30). Clave de idempotencia por envío: `candidato_id + fecha + ventana`.
- **Horarios de descanso:** los mensajes **no transaccionales** (digest = marketing) solo salen dentro de la franja permitida. La Ley 2300 de 2023 ("Dejen de fregar") restringe el contacto con consumidores en días y horas específicos (lunes a viernes y sábados en franjas, no domingos ni festivos). **Validar horarios exactos y aplicabilidad con abogado.** Implementación: tabla de franjas en configuración y `esDiaHabil` / festivos de `lib/legal/dias-habiles.ts`. Los transaccionales (confirmación de postulación, cambio de estado) pueden tener reglas distintas: validar.
- **Cola en Postgres:** `wsp_envios` con `estado`, `intentos`, `proximo_intento_en`. Sin Redis. Migrar a Vercel Queues o a un worker dedicado si se superan ~50k envíos/día o el cron no alcanza a vaciar la cola.
- **Reintentos:** backoff exponencial con jitter (1 min, 5 min, 30 min, 2 h), máximo 4. Errores permanentes (número inválido, usuario bloqueó) → `fallido` sin reintento y desactivar el número tras N fallos.

## 3. Opt-in / opt-out

- **Opt-in:** casilla separada en el registro y en `/cuenta` (ya existe: `candidatos.wsp_opt_in` + fila en `consentimientos` con finalidad `whatsapp`, versión del documento, canal, IP). Meta además exige opt-in registrado por el negocio.
- **Opt-out:** palabras clave entrantes `BAJA`, `STOP`, `PARAR`, `CANCELAR` (sin tildes, sin mayúsculas) vía webhook → **efecto inmediato**: `wsp_opt_in=false`, `wsp_opt_out_en=now()`, nueva fila en `consentimientos (otorgado=false, canal='whatsapp_keyword')`, cancelar envíos pendientes, responder una confirmación (dentro de la ventana de 24 h abierta por el usuario).
- Todo digest incluye al final: "Responde BAJA para no recibir más mensajes".
- Antes de encolar y **antes de enviar** se revalida `wsp_opt_in` (un opt-out entre la generación y el envío debe respetarse).

## 4. Plantillas y categorías de Meta

| Plantilla | Categoría probable | Uso |
|---|---|---|
| `digest_vacantes_v1` | Marketing | Resumen diario de vacantes |
| `postulacion_recibida_v1` | Utility | Confirmación al candidato |
| `postulacion_estado_v1` | Utility | Cambio de estado por la empresa |
| `pago_estado_v1` | Utility | Pago aprobado, fallido, renovación |

- Meta decide la categoría al aprobar la plantilla y puede reclasificarla. Una plantilla "utility" con contenido promocional se recategoriza a marketing (más cara).
- Versionar plantillas (`_v1`, `_v2`), guardar la versión en cada envío.
- Enlaces con `?src=whatsapp&e=<envio_id>` para atribución.

## 5. Control de costo

- Cada envío registra: `plantilla`, `categoria`, `proveedor`, `intentos`, `costo_estimado_usd` (tarifa vigente por categoría/país en `wsp_tarifas`), `costo_real_usd` (si el proveedor lo reporta).
- **Presupuesto diario** (`WSP_PRESUPUESTO_DIARIO_USD`): el enviador suma el costo estimado del día; al llegar al 80 % alerta (`log.warn`) y al 100 % **corta** los envíos de marketing (los utility siguen).
- Priorización cuando hay corte: mayor score medio del digest primero.
- Panel en `/admin`: envíos, costo por día, costo por postulación atribuida.

## 6. Proveedores (comparación por criterios)

| Criterio | Meta Cloud API directo | 360dialog | Twilio | Gupshup |
|---|---|---|---|---|
| Recargo sobre tarifa Meta | Ninguno | Mensualidad por número, sin recargo por mensaje (validar) | Recargo por mensaje | Recargo por mensaje (validar) |
| Esfuerzo de integración | Medio (verificación del negocio, webhooks propios) | Bajo–medio | Bajo (SDK maduro) | Medio |
| Soporte / SLA | Comunidad, limitado | Soporte de BSP | Soporte comercial fuerte | Soporte de BSP, presencia en LatAm |
| Multicanal (SMS fallback) | No | No | Sí | Sí |
| Facturación en COP / local | No | Validar | No | Validar |
| Lock-in | Bajo | Bajo | Medio | Medio |

Recomendación inicial: **Meta Cloud API directo** o **360dialog** por costo; Twilio si se necesita SMS de respaldo. **Todas las tarifas por validar al contratar.** El adaptador (`lib/whatsapp/proveedor.ts`, misma idea que `lib/billing`) permite cambiar sin tocar la lógica.

## 7. Modelo de datos propuesto

```sql
wsp_preferencias (candidato_id pk → candidatos, frecuencia text, ventana text, umbral int null, actualizado_en)
wsp_envios (
  id uuid pk, candidato_id uuid, tipo text,              -- digest | transaccional
  plantilla text, plantilla_version text, categoria text,  -- marketing | utility
  proveedor text, mensaje_externo_id text unique,
  vacante_ids uuid[], clave_idempotencia text unique,
  estado text,                                             -- pendiente|enviado|entregado|leido|fallido|cancelado
  intentos int default 0, proximo_intento_en timestamptz,
  error_codigo text, costo_estimado_usd numeric(10,6), costo_real_usd numeric(10,6),
  programado_para timestamptz, enviado_en, entregado_en, leido_en, creado_en
)
wsp_vacantes_enviadas (candidato_id, vacante_id, enviado_en, primary key (candidato_id, vacante_id))
wsp_tarifas (proveedor, categoria, pais, costo_usd, vigente_desde)
wsp_entrantes (id, proveedor, mensaje_externo_id unique, telefono_hash, texto_normalizado, accion, creado_en)
```

- Webhooks del proveedor pasan por `webhook_eventos` (ya existe, idempotente por `(proveedor, evento_id)`).
- Retención: `wsp_envios` 24 meses; `wsp_entrantes` 12 meses (agregar a `purgar_datos_retencion`).
- Sin texto del mensaje con datos personales en logs; teléfono solo en `candidatos`.

## 8. Métricas

- **Entregado / leído:** webhooks de estado actualizan `wsp_envios` → KPI *tasa de lectura del digest* = leídos / entregados (con la salvedad de que los usuarios con confirmación de lectura desactivada no reportan "read").
- **Clic:** evento `vacante_vista` con `fuente=whatsapp` (ya se registra por `?src=`). Tasa de clic = vistas únicas con `src=whatsapp` / digests entregados.
- **Conversión:** `postulacion` con `fuente=whatsapp`.
- **Salud:** % fallidos, opt-outs por cada 1.000 envíos (si sube, revisar frecuencia y relevancia), costo por postulación.

## 9. Fases y estimación

| Fase | Alcance | Estimación |
|---|---|---|
| 0. Decisiones | Proveedor, verificación del negocio en Meta, número, validación legal de horarios | 1–2 semanas (calendario) |
| 1. Transaccionales | Adaptador, webhook de estados, plantillas utility, opt-out por palabra clave | 1 semana dev |
| 2. Digest | Preferencias, generación, deduplicación, cola, horarios, presupuesto | 1,5–2 semanas dev |
| 3. Medición | Panel en admin, alertas de costo, ajustes de umbral | 0,5–1 semana dev |

## 10. Decisiones abiertas

1. Proveedor (Meta directo vs 360dialog vs Twilio).
2. Franjas horarias exactas y si el digest cuenta como contacto comercial bajo la Ley 2300 de 2023 (abogado).
3. Umbral por defecto del digest (¿`UMBRAL_RECOMENDACION` o más alto?).
4. ¿Frecuencia semanal para usuarios inactivos? ¿Pausa automática tras N digests sin leer?
5. ¿Transaccionales para empresas (nueva postulación) en la misma fase?
6. Presupuesto diario inicial.
