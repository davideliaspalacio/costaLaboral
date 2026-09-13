# CostaLaboral — Estado frente a la Especificación MVP v2

✅ hecho · 🟡 parcial / por decidir · ❌ no hecho · 📋 solo plan

## 1. Modelo abierto ✅
- ✅ Empresa, requisitos y descripción visibles para todos (sin muro de pago).
- ✅ Sin límite de postulaciones.
- ✅ Sin plantilla de WhatsApp "llegaste al límite".
- ✅ El match se muestra como orientación, sin prometer "IA" ni probabilidad de contratación.
- ✅ Recomendadas orientan; el portal muestra todo.

## 2. Portal ✅
- ✅ Filtros por ciudad, área, **tipo de empleo** y modalidad.
- ✅ Destacadas primero.

## 3. Candidato ✅
- ✅ Registro con permiso de WhatsApp **separado**, mayoría de edad y términos.
- ✅ Consentimientos guardados como evidencia (versión, fecha, IP).
- ✅ WhatsApp y perfil visible se activan o revocan en `/cuenta`.
- 🟡 Login con contraseña (decisión: sin OTP por ahora).

## 4. Empresa ✅
- ✅ Consentimiento guardado.
- ✅ Página de perfil (`/empresa/perfil`) con NIT validado.
- ✅ Verificación: solicitar → admin aprueba o rechaza.

## 5. Vacantes ✅
- ✅ Borrador → publicada → pausada → cerrada, con motivo.
- ✅ Moderación previa solo para empresas sin verificar (+ contenido sospechoso).
- ✅ Campos tipo, disponibilidad requerida y destacada.
- ✅ Cierre automático al vencer (cron diario).
- ✅ Reportes de usuarios; 3 reportes ocultan la vacante hasta revisión.

## 6. Match ✅
- ✅ Educación y disponibilidad con 0 / 0.5 / 1.
- ✅ Detalle por factor guardado con cada postulación.

## 7. Postulaciones ✅
- ✅ Un solo estado + historial con fecha y actor.
- ✅ El candidato puede retirarse.

## 8. Panel de empresa ✅
- ✅ Ranking por match con explicación, estados y contacto por WhatsApp.

## 9. WhatsApp 📋
- 📋 Plan en `docs/PLAN-WHATSAPP.md` (digest, batching, opt-out, horarios, costos, proveedores).
- ❌ Envío automático: espera la elección del proveedor.

## 10. Hoja de vida con IA ✅
- ✅ Cuestionario → generación → edición → **aprobación** → PDF / copiar → nuevas versiones.
- ✅ Vista previa limitada en el plan gratis.
- ✅ Adaptar la HV a una vacante (reordenar sin inventar).
- ✅ Validación anti-invención.
- ✅ **Registro de uso y costo de cada llamada** (`ia_uso`, página `/admin/ia`).
- 🟡 Falta probar con una `ANTHROPIC_API_KEY` real.

## 11. LinkedIn con IA ✅
- ✅ Página `/linkedin`: gratis no, Camelleitor básico, Berraco Pro avanzado.

## 12. Planes y pagos ✅ (pasarela de prueba)
- ✅ Suscripciones, pagos y webhooks idempotentes.
- ✅ Estados active / past_due / canceled / expired.
- ✅ Pasarela sandbox detrás de un adaptador.
- ❌ Wompi real: pendiente (misma interfaz).

## 13. Cobro a empresas ✅
- ✅ Vacante destacada (7, 15 y 30 días).
- ✅ Empresa Pro: analítica, filtros, CSV, candidatos sugeridos anonimizados.
- 📋 Publicación en redes: V2.

## 14. Admin ✅
- ✅ Auditoría completa, append-only, con vista y filtros.
- ✅ Pagos, uso de IA, KPIs con meta, reportes y solicitudes de Habeas Data.

## 15. Técnico ✅
- ✅ Crons (vacantes, suscripciones, retención).
- ✅ Rate limiting.
- ✅ Logs estructurados y `/api/health`.
- ✅ Headers de seguridad.
- ✅ Eventos de KPIs.
- 🟡 Pasar Supabase a producción y configurar variables en Vercel.

## 16. Legal (Colombia) ✅
- ✅ Términos (no colocación, sin comisión, retracto, reembolsos).
- ✅ Política de datos (Ley 1581) y formulario de consultas y reclamos con plazos en días hábiles.
- 🟡 Datos del responsable por completar (razón social, NIT, dirección, correo).
- 🟡 Validar con abogado (lista en el reporte).

## Por hacer después
1. Poner `ANTHROPIC_API_KEY` y probar una generación real.
2. Completar `NEXT_PUBLIC_LEGAL_*` y `CRON_SECRET`.
3. Revisión legal.
4. Elegir proveedor de WhatsApp y conectar Wompi.
5. Pequeños ajustes: acción de auditoría `vacante.exportada`, límite de invitaciones en `LIMITES`, valor `invitacion` en notificaciones.
