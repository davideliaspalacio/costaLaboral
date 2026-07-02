-- ============================================================
-- CostaLaboral — Esquema Fase 1 (MVP)
-- Tablas: candidatos, empresas, vacantes, postulaciones, notificaciones_wsp
-- id de candidato/empresa == auth.users.id
-- ============================================================

-- ---------- Enums ----------
create type nivel_educativo as enum ('bachiller','tecnico','tecnologo','universitario','profesional');
create type disponibilidad as enum ('inmediata','en_2_semanas','en_1_mes');
create type plan_tipo as enum ('gratis','camelleitor','berraco_pro');
create type modalidad as enum ('presencial','remoto','hibrido','medio_tiempo','por_dias');
create type estado_postulacion as enum ('enviada','vista_empresa','en_proceso','seleccionado','rechazado');
create type estado_seguimiento as enum ('nuevo','contactado','en_entrevista','contratado','descartado');
create type tipo_notificacion as enum ('enlace_real','fomo','limite_alcanzado','cierre_mes');

-- ---------- candidatos ----------
create table candidatos (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  email text not null unique,
  whatsapp text not null,
  ciudad text not null,
  barrio text,
  nivel_educativo nivel_educativo not null,
  area_interes text not null,
  experiencia text,
  disponibilidad disponibilidad not null default 'inmediata',
  plan plan_tipo not null default 'gratis',
  plan_vence timestamptz,
  postulaciones_usadas int not null default 0,
  creado_en timestamptz not null default now(),
  activo boolean not null default true
);

-- ---------- empresas ----------
create table empresas (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_negocio text not null,
  nombre_contacto text not null,
  email text not null unique,
  whatsapp text not null,
  ciudad text not null,
  sector text not null,
  verificada boolean not null default false,
  creado_en timestamptz not null default now()
);

-- ---------- vacantes ----------
create table vacantes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  titulo text not null,
  descripcion text not null,
  requisitos text not null default '',
  ciudad text not null,
  modalidad modalidad not null default 'presencial',
  area text not null,
  nivel_educativo_min nivel_educativo not null default 'bachiller',
  salario_min int,
  salario_max int,
  tiene_contrato boolean not null default false,
  activa boolean not null default true,
  expira_en timestamptz not null default (now() + interval '60 days'),
  creado_en timestamptz not null default now(),
  vistas int not null default 0
);
create index idx_vacantes_filtro on vacantes (activa, ciudad, area);
create index idx_vacantes_empresa on vacantes (empresa_id);

-- ---------- postulaciones ----------
create table postulaciones (
  id uuid primary key default gen_random_uuid(),
  candidato_id uuid not null references candidatos(id) on delete cascade,
  vacante_id uuid not null references vacantes(id) on delete cascade,
  estado estado_postulacion not null default 'enviada',
  estado_seguimiento estado_seguimiento not null default 'nuevo',
  score_match numeric(5,2),
  match_razon text,
  mensaje text,
  creado_en timestamptz not null default now(),
  unique (candidato_id, vacante_id)
);
create index idx_postulaciones_candidato on postulaciones (candidato_id);
create index idx_postulaciones_vacante on postulaciones (vacante_id);

-- ---------- notificaciones_wsp ----------
create table notificaciones_wsp (
  id uuid primary key default gen_random_uuid(),
  candidato_id uuid not null references candidatos(id) on delete cascade,
  vacante_id uuid references vacantes(id) on delete set null,
  tipo tipo_notificacion not null,
  mensaje text not null,
  enviado_en timestamptz not null default now(),
  leido boolean not null default false
);
create index idx_notif_candidato on notificaciones_wsp (candidato_id);

-- ---------- RPC: contador de vistas ----------
create or replace function public.increment_vistas(v_id uuid)
returns void language sql security definer set search_path = public as $$
  update vacantes set vistas = vistas + 1 where id = v_id;
$$;
grant execute on function public.increment_vistas(uuid) to anon, authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table candidatos enable row level security;
alter table empresas enable row level security;
alter table vacantes enable row level security;
alter table postulaciones enable row level security;
alter table notificaciones_wsp enable row level security;

-- candidatos: cada quien gestiona su propia fila
create policy candidatos_select_own on candidatos for select using (auth.uid() = id);
create policy candidatos_insert_own on candidatos for insert with check (auth.uid() = id);
create policy candidatos_update_own on candidatos for update using (auth.uid() = id);

-- empresas: cada quien gestiona su propia fila
create policy empresas_select_own on empresas for select using (auth.uid() = id);
create policy empresas_insert_own on empresas for insert with check (auth.uid() = id);
create policy empresas_update_own on empresas for update using (auth.uid() = id);

-- vacantes: lectura pública de las activas; la empresa dueña ve/gestiona las suyas
create policy vacantes_select_publicas on vacantes for select
  using (activa = true or auth.uid() = empresa_id);
create policy vacantes_insert_own on vacantes for insert with check (auth.uid() = empresa_id);
create policy vacantes_update_own on vacantes for update using (auth.uid() = empresa_id);
create policy vacantes_delete_own on vacantes for delete using (auth.uid() = empresa_id);

-- postulaciones: candidato dueño + empresa dueña de la vacante
create policy postulaciones_candidato_select on postulaciones for select
  using (auth.uid() = candidato_id);
create policy postulaciones_candidato_insert on postulaciones for insert
  with check (auth.uid() = candidato_id);
create policy postulaciones_empresa_select on postulaciones for select
  using (exists (select 1 from vacantes v where v.id = vacante_id and v.empresa_id = auth.uid()));
create policy postulaciones_empresa_update on postulaciones for update
  using (exists (select 1 from vacantes v where v.id = vacante_id and v.empresa_id = auth.uid()));

-- notificaciones: el candidato ve las suyas (inserción vía service role en el servidor)
create policy notif_select_own on notificaciones_wsp for select using (auth.uid() = candidato_id);
create policy notif_update_own on notificaciones_wsp for update using (auth.uid() = candidato_id);

-- ============================================================
-- Privilegios de tabla para los roles de PostgREST.
-- La seguridad a nivel de fila (RLS) sigue aplicando a anon/authenticated;
-- service_role la omite (se usa solo en el servidor).
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
