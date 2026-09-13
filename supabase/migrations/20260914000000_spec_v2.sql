-- ============================================================
-- CostaLaboral — Especificación MVP v2 (intermediación abierta)
--
--  * Vacantes: tipo de empleo, modalidad limpia, ciclo de vida real
--    (borrador/publicada/pausada/cerrada), disponibilidad requerida,
--    destacada, reportes. Visibilidad pública = columna generada.
--  * Empresas: verificación progresiva + perfil.
--  * Candidatos: opt-in WhatsApp separado, visibilidad de perfil.
--  * Postulaciones: un solo estado + historial + detalle del match.
--  * Consentimientos (Ley 1581/2012, Decreto 1377/2013) y solicitudes
--    de titulares (consultas / reclamos).
--  * audit_log append-only, ia_uso (costos IA), pagos/suscripciones,
--    webhooks idempotentes, rate limiting en Postgres.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Vacantes
-- ------------------------------------------------------------
create type tipo_empleo as enum ('tiempo_completo', 'medio_tiempo', 'por_dias', 'temporal', 'practicas');
create type modalidad_trabajo as enum ('presencial', 'remoto', 'hibrido');
create type estado_vacante as enum ('borrador', 'publicada', 'pausada', 'cerrada');
create type motivo_cierre as enum ('contratado', 'cerrada', 'expirada');

-- tipo: sale de la vieja "modalidad" que mezclaba jornada y lugar.
alter table vacantes add column tipo tipo_empleo not null default 'tiempo_completo';
update vacantes set tipo = case modalidad::text
  when 'medio_tiempo' then 'medio_tiempo'::tipo_empleo
  when 'por_dias' then 'por_dias'::tipo_empleo
  else 'tiempo_completo'::tipo_empleo
end;

alter table vacantes alter column modalidad drop default;
alter table vacantes alter column modalidad type modalidad_trabajo using (
  case modalidad::text when 'remoto' then 'remoto' when 'hibrido' then 'hibrido' else 'presencial' end
)::modalidad_trabajo;
alter table vacantes alter column modalidad set default 'presencial';
drop type modalidad;

-- Disponibilidad requerida: "en_1_mes" es la más permisiva (todos compatibles).
alter table vacantes add column disponibilidad_requerida disponibilidad not null default 'en_1_mes';

-- Ciclo de vida
alter table vacantes add column estado estado_vacante not null default 'borrador';
alter table vacantes add column motivo_cierre motivo_cierre;
alter table vacantes add column publicada_en timestamptz;
alter table vacantes add column cerrada_en timestamptz;
alter table vacantes add column actualizada_en timestamptz not null default now();
alter table vacantes add column destacada_hasta timestamptz;

update vacantes set
  estado = case when activa then 'publicada'::estado_vacante else 'pausada'::estado_vacante end,
  publicada_en = creado_en;

-- Cierres que antes se inferían de eventos.
update vacantes v set
  estado = 'cerrada',
  motivo_cierre = case ult.meta->>'motivo' when 'contratado' then 'contratado'::motivo_cierre else 'cerrada'::motivo_cierre end,
  cerrada_en = ult.creado_en
from (
  select distinct on (entidad_id) entidad_id, meta, creado_en
  from eventos
  where tipo = 'vacante_moderada' and entidad = 'vacantes' and meta->>'accion' in ('cerrada', 'reabierta')
  order by entidad_id, creado_en desc
) ult
where ult.entidad_id = v.id and ult.meta->>'accion' = 'cerrada' and v.activa = false;

-- "activa" (booleano escrito a mano) pasa a ser derivada: es_publica.
drop policy vacantes_select_publicas on vacantes;
drop index idx_vacantes_filtro;
alter table vacantes drop column activa;
alter table vacantes add column es_publica boolean
  generated always as (estado = 'publicada' and estado_moderacion = 'aprobada') stored;

alter table vacantes add constraint vacantes_salario_rango
  check (salario_min is null or salario_max is null or salario_max >= salario_min);

create index idx_vacantes_publicas on vacantes (es_publica, ciudad, area, tipo);
create index idx_vacantes_destacadas on vacantes (destacada_hasta) where destacada_hasta is not null;
create index idx_vacantes_expira on vacantes (estado, expira_en);

create policy vacantes_select_publicas on vacantes for select
  using (es_publica = true or auth.uid() = empresa_id);

-- Reportes de vacantes hechos por usuarios.
create type motivo_reporte as enum ('fraude', 'discriminatoria', 'cobro_al_candidato', 'datos_falsos', 'ya_no_existe', 'otro');
create type estado_reporte as enum ('abierto', 'resuelto', 'descartado');

create table reportes_vacante (
  id uuid primary key default gen_random_uuid(),
  vacante_id uuid not null references vacantes(id) on delete cascade,
  reportante_id uuid not null,
  motivo motivo_reporte not null,
  detalle text,
  estado estado_reporte not null default 'abierto',
  resuelto_por uuid,
  resuelto_en timestamptz,
  resolucion text,
  creado_en timestamptz not null default now(),
  unique (vacante_id, reportante_id)
);
create index idx_reportes_estado on reportes_vacante (estado, creado_en desc);
alter table reportes_vacante enable row level security;

-- ------------------------------------------------------------
-- 2. Empresas: verificación progresiva + perfil + plan
-- ------------------------------------------------------------
create type verificacion_estado as enum ('sin_verificar', 'en_revision', 'verificada', 'rechazada');
create type plan_empresa as enum ('gratis', 'pro');

alter table empresas add column verificacion verificacion_estado not null default 'sin_verificar';
update empresas set verificacion = case when verificada then 'verificada'::verificacion_estado else 'sin_verificar'::verificacion_estado end;
alter table empresas drop column verificada;
alter table empresas add column verificada boolean generated always as (verificacion = 'verificada') stored;

alter table empresas
  add column razon_social text,
  add column nit text,
  add column descripcion text,
  add column sitio_web text,
  add column direccion text,
  add column verificacion_solicitada_en timestamptz,
  add column verificada_en timestamptz,
  add column verificada_por uuid,
  add column verificacion_nota text,
  add column plan plan_empresa not null default 'gratis',
  add column actualizado_en timestamptz not null default now();

-- ------------------------------------------------------------
-- 3. Candidatos
-- ------------------------------------------------------------
alter table candidatos
  add column wsp_opt_in boolean not null default false,
  add column wsp_opt_in_en timestamptz,
  add column wsp_opt_out_en timestamptz,
  add column perfil_visible_empresas boolean not null default false,
  add column mayor_de_edad boolean not null default false,
  add column actualizado_en timestamptz not null default now();

-- Los registros previos aceptaron la política que incluía el uso de WhatsApp.
update candidatos set wsp_opt_in = true, wsp_opt_in_en = creado_en, mayor_de_edad = true;

-- ------------------------------------------------------------
-- 4. Postulaciones: un solo estado + historial + detalle del match
-- ------------------------------------------------------------
create type estado_postulacion_v2 as enum
  ('enviada', 'vista', 'contactado', 'en_entrevista', 'contratado', 'descartado', 'retirada');

alter table postulaciones add column estado_v2 estado_postulacion_v2;
update postulaciones set estado_v2 = (case estado_seguimiento::text
  when 'contactado' then 'contactado'
  when 'en_entrevista' then 'en_entrevista'
  when 'contratado' then 'contratado'
  when 'descartado' then 'descartado'
  else case when estado::text = 'vista_empresa' then 'vista' else 'enviada' end
end)::estado_postulacion_v2;

alter table postulaciones drop column estado;
alter table postulaciones drop column estado_seguimiento;
alter table postulaciones drop column match_razon;
drop type estado_postulacion;
drop type estado_seguimiento;
alter type estado_postulacion_v2 rename to estado_postulacion;
alter table postulaciones rename column estado_v2 to estado;
alter table postulaciones alter column estado set not null;
alter table postulaciones alter column estado set default 'enviada';

alter table postulaciones
  add column match_detalle jsonb,
  add column fuente text,
  add column estado_actualizado_en timestamptz not null default now();
update postulaciones set estado_actualizado_en = creado_en;
create index idx_postulaciones_vacante_estado on postulaciones (vacante_id, estado);

create table postulacion_historial (
  id bigint generated always as identity primary key,
  postulacion_id uuid not null references postulaciones(id) on delete cascade,
  estado_anterior estado_postulacion,
  estado_nuevo estado_postulacion not null,
  actor_id uuid,
  actor_tipo text not null check (actor_tipo in ('candidato', 'empresa', 'admin', 'sistema')),
  nota text,
  creado_en timestamptz not null default now()
);
create index idx_historial_postulacion on postulacion_historial (postulacion_id, creado_en);
alter table postulacion_historial enable row level security;

insert into postulacion_historial (postulacion_id, estado_anterior, estado_nuevo, actor_id, actor_tipo, creado_en)
select id, null, 'enviada', candidato_id, 'candidato', creado_en from postulaciones;

-- ------------------------------------------------------------
-- 5. Consentimientos (evidencia Ley 1581) — append-only, sin FK:
--    la prueba de la autorización se conserva aunque se borre la cuenta.
-- ------------------------------------------------------------
create type finalidad_consentimiento as enum
  ('tratamiento_datos', 'terminos', 'whatsapp', 'perfil_visible_empresas', 'mayoria_edad');

create table consentimientos (
  id uuid primary key default gen_random_uuid(),
  titular_id uuid not null,
  titular_tipo text not null check (titular_tipo in ('candidato', 'empresa')),
  finalidad finalidad_consentimiento not null,
  otorgado boolean not null,
  version_documento text not null,
  canal text not null,
  ip inet,
  user_agent text,
  creado_en timestamptz not null default now()
);
create index idx_consentimientos_titular on consentimientos (titular_id, finalidad, creado_en desc);
alter table consentimientos enable row level security;

insert into consentimientos (titular_id, titular_tipo, finalidad, otorgado, version_documento, canal, creado_en)
select e.actor_id, e.actor_tipo, f.finalidad, true, 'v1-2026-07', 'migracion', e.creado_en
from eventos e
cross join (values ('tratamiento_datos'::finalidad_consentimiento), ('terminos'::finalidad_consentimiento), ('whatsapp'::finalidad_consentimiento)) f(finalidad)
where e.tipo = 'consentimiento' and e.actor_id is not null and e.actor_tipo in ('candidato', 'empresa');

-- Solicitudes de titulares (consultas y reclamos, arts. 14 y 15 Ley 1581).
create type solicitud_tipo as enum
  ('consulta', 'actualizacion', 'rectificacion', 'supresion', 'revocatoria', 'prueba_autorizacion');
create type solicitud_estado as enum ('recibida', 'en_tramite', 'respondida', 'cerrada');

create table solicitudes_titular (
  id uuid primary key default gen_random_uuid(),
  radicado text not null unique,
  titular_id uuid,
  nombre text not null,
  tipo_documento text not null,
  numero_documento text not null,
  email text not null,
  telefono text,
  tipo solicitud_tipo not null,
  descripcion text not null,
  estado solicitud_estado not null default 'recibida',
  vence_en timestamptz not null,
  prorrogada boolean not null default false,
  respuesta text,
  respondida_en timestamptz,
  atendida_por uuid,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index idx_solicitudes_estado on solicitudes_titular (estado, vence_en);
alter table solicitudes_titular enable row level security;

-- ------------------------------------------------------------
-- 6. Auditoría (append-only)
-- ------------------------------------------------------------
create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_tipo text not null check (actor_tipo in ('candidato', 'empresa', 'admin', 'sistema')),
  actor_email text,
  accion text not null,
  entidad text not null,
  entidad_id text,
  antes jsonb,
  despues jsonb,
  metadata jsonb not null default '{}',
  ip inet,
  user_agent text,
  request_id text,
  creado_en timestamptz not null default now()
);
create index idx_audit_creado on audit_log (creado_en desc);
create index idx_audit_entidad on audit_log (entidad, entidad_id, creado_en desc);
create index idx_audit_actor on audit_log (actor_id, creado_en desc);
create index idx_audit_accion on audit_log (accion, creado_en desc);
alter table audit_log enable row level security;

-- ------------------------------------------------------------
-- 7. Hojas de vida (versiones) y LinkedIn
-- ------------------------------------------------------------
create type tipo_cv as enum ('base', 'vacante', 'sector');
create type estado_contenido_ia as enum ('borrador', 'aprobada');

alter table hojas_de_vida
  add column tipo tipo_cv not null default 'base',
  add column vacante_id uuid references vacantes(id) on delete set null,
  add column sector text,
  add column padre_id uuid references hojas_de_vida(id) on delete set null,
  add column datos_fuente jsonb not null default '{}',
  add column estado estado_contenido_ia not null default 'borrador',
  add column aprobada_en timestamptz,
  add column prompt_version text,
  add column modelo text,
  add column validacion jsonb;

create table linkedin_perfiles (
  id uuid primary key default gen_random_uuid(),
  candidato_id uuid not null unique references candidatos(id) on delete cascade,
  hoja_de_vida_id uuid references hojas_de_vida(id) on delete set null,
  nivel text not null default 'basico' check (nivel in ('basico', 'avanzado')),
  fuente jsonb not null default '{}',
  contenido jsonb not null default '{}',
  estado estado_contenido_ia not null default 'borrador',
  aprobado_en timestamptz,
  generado_por_ia boolean not null default false,
  prompt_version text,
  modelo text,
  validacion jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
alter table linkedin_perfiles enable row level security;
create policy linkedin_select_own on linkedin_perfiles for select using (auth.uid() = candidato_id);

insert into linkedin_perfiles (candidato_id, hoja_de_vida_id, contenido, generado_por_ia, creado_en, actualizado_en)
select distinct on (candidato_id)
  candidato_id, id,
  jsonb_build_object('titular', coalesce(linkedin_titular, ''), 'acerca', coalesce(linkedin_acerca, '')),
  generada_por_ia, creado_en, actualizado_en
from hojas_de_vida
where coalesce(linkedin_titular, '') <> '' or coalesce(linkedin_acerca, '') <> ''
order by candidato_id, actualizado_en desc;

alter table hojas_de_vida drop column linkedin_titular;
alter table hojas_de_vida drop column linkedin_acerca;

-- ------------------------------------------------------------
-- 8. Uso de IA (tokens y costo por llamada)
-- ------------------------------------------------------------
create table ia_uso (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_tipo text not null default 'candidato',
  feature text not null,
  entidad text,
  entidad_id uuid,
  proveedor text not null default 'anthropic',
  modelo text,
  modelo_servido text,
  prompt_version text,
  plan text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_creation_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  costo_usd numeric(12, 6) not null default 0,
  latencia_ms int,
  estado text not null check (estado in ('ok', 'error', 'validacion_fallida', 'rechazo', 'sin_credenciales', 'fallback_local')),
  error text,
  request_id text,
  creado_en timestamptz not null default now()
);
create index idx_ia_uso_creado on ia_uso (creado_en desc);
create index idx_ia_uso_actor on ia_uso (actor_id, feature, creado_en desc);
alter table ia_uso enable row level security;

-- ------------------------------------------------------------
-- 9. Pagos: suscripción → pago → beneficios
-- ------------------------------------------------------------
create type suscripcion_estado as enum ('active', 'past_due', 'canceled', 'expired');
create type pago_estado as enum ('pendiente', 'aprobado', 'fallido', 'reembolsado', 'anulado');

-- Sin FK a la cuenta: los soportes contables se conservan (art. 28 Ley 962/2005).
create table suscripciones (
  id uuid primary key default gen_random_uuid(),
  propietario_id uuid not null,
  propietario_tipo text not null check (propietario_tipo in ('candidato', 'empresa')),
  plan text not null,
  proveedor text not null,
  customer_externo text,
  suscripcion_externa text,
  estado suscripcion_estado not null default 'active',
  periodo_inicio timestamptz not null,
  periodo_fin timestamptz not null,
  cancelar_al_final boolean not null default false,
  cancelada_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index uq_suscripcion_vigente on suscripciones (propietario_id) where estado in ('active', 'past_due');
create index idx_suscripciones_fin on suscripciones (estado, periodo_fin);
alter table suscripciones enable row level security;

create table pagos (
  id uuid primary key default gen_random_uuid(),
  referencia text not null unique,
  suscripcion_id uuid references suscripciones(id) on delete set null,
  propietario_id uuid not null,
  propietario_tipo text not null check (propietario_tipo in ('candidato', 'empresa')),
  concepto text not null check (concepto in ('suscripcion', 'renovacion', 'vacante_destacada', 'addon')),
  producto text not null,
  proveedor text not null,
  external_id text,
  monto int not null check (monto >= 0),
  moneda text not null default 'COP',
  estado pago_estado not null default 'pendiente',
  metadata jsonb not null default '{}',
  aprobado_en timestamptz,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (proveedor, external_id)
);
create index idx_pagos_propietario on pagos (propietario_id, creado_en desc);
alter table pagos enable row level security;

create table webhook_eventos (
  id uuid primary key default gen_random_uuid(),
  proveedor text not null,
  evento_id text not null,
  tipo text not null,
  payload jsonb not null,
  firma_valida boolean not null,
  procesado_en timestamptz,
  resultado text,
  error text,
  creado_en timestamptz not null default now(),
  unique (proveedor, evento_id)
);
alter table webhook_eventos enable row level security;

-- Planes pagos vigentes pasan a suscripciones (fuente de verdad).
insert into suscripciones (propietario_id, propietario_tipo, plan, proveedor, estado, periodo_inicio, periodo_fin)
select id, 'candidato', plan::text, 'migracion', 'active', plan_vence - interval '90 days', plan_vence
from candidatos
where plan <> 'gratis' and plan_vence > now();

update candidatos set plan = 'gratis' where plan <> 'gratis' and (plan_vence is null or plan_vence <= now());
alter table candidatos drop column plan_vence;
alter table candidatos drop column postulaciones_usadas;

-- ------------------------------------------------------------
-- 10. Rate limiting (ventana fija, atómico)
-- ------------------------------------------------------------
create unlogged table rate_limits (
  clave text primary key,
  ventana_inicio timestamptz not null,
  conteo int not null
);
alter table rate_limits enable row level security;

create or replace function public.rate_limit_hit(p_clave text, p_ventana_seg int, p_max int)
returns table (permitido boolean, restantes int, reinicia_en timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_inicio timestamptz;
  v_conteo int;
begin
  insert into rate_limits as r (clave, ventana_inicio, conteo)
  values (p_clave, now(), 1)
  on conflict (clave) do update set
    conteo = case when r.ventana_inicio + make_interval(secs => p_ventana_seg) <= now() then 1 else r.conteo + 1 end,
    ventana_inicio = case when r.ventana_inicio + make_interval(secs => p_ventana_seg) <= now() then now() else r.ventana_inicio end
  returning r.ventana_inicio, r.conteo into v_inicio, v_conteo;

  return query select v_conteo <= p_max, greatest(p_max - v_conteo, 0), v_inicio + make_interval(secs => p_ventana_seg);
end;
$$;

-- ------------------------------------------------------------
-- 11. Tareas programadas (invocadas por Vercel Cron)
-- ------------------------------------------------------------
create or replace function public.cerrar_vacantes_expiradas()
returns setof uuid
language sql security definer set search_path = public as $$
  update vacantes
  set estado = 'cerrada', motivo_cierre = 'expirada', cerrada_en = now(), actualizada_en = now()
  where estado in ('publicada', 'pausada') and expira_en < now()
  returning id;
$$;

-- Retención: purga datos operativos vencidos. Corre como dueño (puede borrar audit_log antiguo).
create or replace function public.purgar_datos_retencion()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n_rate int; n_webhooks int; n_eventos int; n_audit int;
begin
  delete from rate_limits where ventana_inicio < now() - interval '1 day';
  get diagnostics n_rate = row_count;
  delete from webhook_eventos where creado_en < now() - interval '18 months' and procesado_en is not null;
  get diagnostics n_webhooks = row_count;
  delete from eventos where creado_en < now() - interval '24 months';
  get diagnostics n_eventos = row_count;
  delete from audit_log where creado_en < now() - interval '5 years';
  get diagnostics n_audit = row_count;
  return jsonb_build_object('rate_limits', n_rate, 'webhook_eventos', n_webhooks, 'eventos', n_eventos, 'audit_log', n_audit);
end;
$$;

create index if not exists idx_eventos_tipo_creado on eventos (tipo, creado_en desc);

-- ------------------------------------------------------------
-- 12. Privilegios
--   Todas las escrituras pasan por el servidor (service_role) con
--   autorización en código. Se cierran las escrituras directas desde
--   el navegador y las funciones internas.
-- ------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

revoke insert, update, delete on all tables in schema public from anon, authenticated;
revoke select on audit_log, consentimientos, ia_uso, pagos, suscripciones, webhook_eventos,
  solicitudes_titular, reportes_vacante, rate_limits, postulacion_historial, eventos, staff
  from anon;

-- Append-only: ni siquiera el servidor puede reescribir la evidencia.
revoke update, delete on audit_log, consentimientos from service_role;

revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
revoke all on function public.cerrar_vacantes_expiradas() from public, anon, authenticated;
revoke all on function public.purgar_datos_retencion() from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
grant execute on function public.cerrar_vacantes_expiradas() to service_role;
grant execute on function public.purgar_datos_retencion() to service_role;
