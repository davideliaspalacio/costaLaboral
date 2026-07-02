-- ============================================================
-- CostaLaboral — Roles de staff, tracking de eventos, moderación y HV con IA
-- ============================================================

-- ---------- Roles de staff (admin) ----------
create type staff_rol as enum ('super_admin', 'admin', 'moderador');

create table staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rol staff_rol not null default 'moderador',
  nombre text,
  creado_en timestamptz not null default now()
);
alter table staff enable row level security;
create policy staff_select_self on staff for select using (auth.uid() = user_id);

-- ---------- Eventos (tracking de uso de toda la plataforma) ----------
create table eventos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,          -- registro_candidato | registro_empresa | vacante_publicada | postulacion | notif_enviada | login | plan_activado | hv_generada | empresa_verificada | vacante_moderada
  actor_id uuid,
  actor_tipo text,             -- candidato | empresa | admin | sistema
  entidad text,
  entidad_id uuid,
  meta jsonb not null default '{}',
  creado_en timestamptz not null default now()
);
create index idx_eventos_tipo on eventos (tipo);
create index idx_eventos_creado on eventos (creado_en desc);
alter table eventos enable row level security; -- acceso solo vía service_role (servidor)

-- ---------- Moderación de vacantes ----------
create type estado_moderacion as enum ('aprobada', 'pendiente', 'rechazada', 'reportada');
alter table vacantes add column estado_moderacion estado_moderacion not null default 'aprobada';
alter table vacantes add column motivo_moderacion text;

-- ---------- Hojas de vida generadas con IA ----------
create table hojas_de_vida (
  id uuid primary key default gen_random_uuid(),
  candidato_id uuid not null references candidatos(id) on delete cascade,
  titulo text not null default 'Mi hoja de vida',
  cargo_objetivo text,
  contenido jsonb not null default '{}',   -- {resumen, habilidades[], experiencia[], educacion[], logros[]}
  linkedin_titular text,
  linkedin_acerca text,
  generada_por_ia boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index idx_hv_candidato on hojas_de_vida (candidato_id);
alter table hojas_de_vida enable row level security;
create policy hv_own_all on hojas_de_vida for all
  using (auth.uid() = candidato_id) with check (auth.uid() = candidato_id);

-- ---------- Grants (RLS sigue protegiendo filas) ----------
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
