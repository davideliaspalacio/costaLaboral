# CostaLaboral — Qué se agregó (Spec MVP v2)

## Lo nuevo

**Portal abierto**
- Cualquiera ve la empresa, el salario, los requisitos y la descripción de cada vacante.
- Postularse es gratis y sin límite.
- Filtros por ciudad, área, tipo de empleo y modalidad.

**Match explicable**
- Pesos: ciudad 40, área 30, educación 20 y disponibilidad 10, con medio punto cuando la coincidencia es parcial.
- Se explica por qué encaja cada candidato. Es una orientación, no una promesa.

**Candidatos**
- Registro rápido con consentimiento guardado como prueba.
- Permiso de WhatsApp separado, que se puede revocar.
- Recomendaciones, historial de postulaciones y opción de retirarse.

**Empresas**
- Publicar es gratis: borrador, publicada, pausada o cerrada.
- Verificación de la empresa: solicitud y aprobación por el admin.
- Revisión previa solo para empresas sin verificar o anuncios sospechosos.
- Postulados ordenados por match, con estados y contacto por WhatsApp.

**Reportes**
- Los usuarios pueden reportar vacantes; con 3 reportes se ocultan hasta revisarlas.

**Hoja de vida con IA**
- Asistente → generación → edición → aprobación → PDF.
- Versión adaptada a cada vacante y controles para que la IA no invente datos.
- Registro del costo de cada uso de IA.

**LinkedIn con IA**
- Titular y "Acerca de"; versión avanzada para el plan Berraco Pro.

**Planes y pagos (modo prueba)**
- Candidatos: Camelleitor y Berraco Pro.
- Empresas: vacante destacada (7, 15 o 30 días) y Empresa Pro (analítica, filtros, exportar a Excel y candidatos sugeridos).
- Sin comisión por contratación.

**Panel admin**
- Moderación, reportes, verificación de empresas y auditoría completa.
- Pagos, costos de IA, KPIs con meta y solicitudes de datos personales.

**Legal (Colombia)**
- Términos y política de datos (Ley 1581).
- Formulario de consultas y reclamos, con plazos en días hábiles.
- Aviso de que no somos agencia de colocación.

**Técnico**
- Seguridad (headers, límite de intentos, permisos cerrados).
- Tareas automáticas (vencimiento de vacantes y planes).
- Monitoreo de salud del sistema y pruebas automáticas.

## Lo que falta
1. **WhatsApp:** elegir proveedor (Meta o 360dialog) y conectar el envío automático. El plan ya está escrito.
2. **Pagos reales:** conectar Wompi. Hoy es una pasarela de prueba.
3. **IA:** poner la clave de Anthropic y probar con uso real.
4. **Datos legales de la empresa:** razón social, NIT, dirección y correo de datos personales.
5. **Revisión con abogado:** si necesitamos autorización del Servicio Público de Empleo, derecho de retracto y horarios de mensajes.
6. **Producción:** subir la base de datos a Supabase y configurar Vercel.
7. **Precios y límites de los planes:** validarlos con el piloto.
8. **V2:** publicación automática en redes sociales.
