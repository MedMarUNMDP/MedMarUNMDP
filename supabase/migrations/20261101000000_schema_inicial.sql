-- MedMarUNMDP / Supabase v1 - schema funcional y tolerante a reintentos
-- Basado en el schema original entregado por el proyecto.
-- Correcciones incluidas:
--   * dependencias correctas: profiles antes de is_moderator/is_admin
--   * reparación no destructiva de notificacion_queue (incluye status)
--   * generación de pseudónimos con manejo de colisiones
--   * backfill de perfiles para usuarios Auth existentes
--   * rate limit seguro ante creación concurrente de buckets
--   * finalize_exchange bloquea antes de validar para evitar matches duplicados
--
-- NO elimina usuarios de auth.users ni datos existentes.
-- Ejecutar completo en Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

---

-- UTILIDADES

---

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
new.updated_at = now();
return new;
end;

$$;



-- ------------------------------------------------------------
-- MIGRACIÓN DE CONTRASEÑAS LEGACY (solo durante el corte)
-- El sistema anterior usaba SHA-256(password|salt), que Supabase Auth
-- no puede importar como hash nativo. Esta tabla privada permite una
-- migración transparente en el primer login; luego el usuario queda
-- gestionado por Supabase Auth.
-- ------------------------------------------------------------

create schema if not exists private;

create table if not exists private.legacy_password_migrations (
  email text primary key,
  legacy_hash text not null,
  legacy_salt text not null,
  migrated_at timestamptz,
  created_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on table private.legacy_password_migrations from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.legacy_password_migrations to service_role;

create or replace function public.get_legacy_password(p_email text)
returns table(legacy_hash text, legacy_salt text, migrated_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select l.legacy_hash, l.legacy_salt, l.migrated_at
  from private.legacy_password_migrations l
  where lower(l.email) = lower(p_email)
  limit 1;
$$;

create or replace function public.mark_legacy_password_migrated(p_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  update private.legacy_password_migrations
  set migrated_at = coalesce(migrated_at, now())
  where lower(email) = lower(p_email);
  select true;
$$;

create or replace function public.upsert_legacy_password(p_email text, p_legacy_hash text, p_legacy_salt text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  insert into private.legacy_password_migrations(email, legacy_hash, legacy_salt)
  values(lower(p_email), p_legacy_hash, p_legacy_salt)
  on conflict (email) do update
  set legacy_hash = excluded.legacy_hash,
      legacy_salt = excluded.legacy_salt,
      migrated_at = private.legacy_password_migrations.migrated_at;
  select true;
$$;

revoke all on function public.get_legacy_password(text) from public, anon, authenticated;
revoke all on function public.mark_legacy_password_migrated(text) from public, anon, authenticated;
revoke all on function public.upsert_legacy_password(text, text, text) from public, anon, authenticated;
grant execute on function public.get_legacy_password(text) to service_role;
grant execute on function public.mark_legacy_password_migrated(text) to service_role;
grant execute on function public.upsert_legacy_password(text, text, text) to service_role;


-- ------------------------------------------------------------
-- PERFIL PÚBLICO
-- El email real queda exclusivamente en auth.users.
-- ------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudonimo text not null,
  foto_url text,
  is_moderator boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_pseudonimo_chk check (char_length(pseudonimo) between 3 and 24),
  constraint profiles_pseudonimo_unique unique (pseudonimo)
);

-- Estas funciones dependen de public.profiles, por eso se crean DESPUÉS de la tabla.
create or replace function public.is_moderator(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_moderator from public.profiles where id = uid), false);
$$;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

revoke all on function public.is_moderator(uuid) from public, anon;
revoke all on function public.is_admin(uuid) from public, anon;
grant execute on function public.is_moderator(uuid) to authenticated, service_role;
grant execute on function public.is_admin(uuid) to authenticated, service_role;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.is_admin <> old.is_admin or new.is_moderator <> old.is_moderator then
    if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
       and not public.is_admin(auth.uid()) then
      raise exception 'role_change_not_allowed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
before update on public.profiles
for each row execute function public.prevent_role_escalation();

create or replace function public.generate_unique_pseudonym(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  hex_id text := replace(p_user_id::text, '-', '');
  candidate text;
  prefix_len integer;
begin
  -- Conserva el formato histórico EstudianteXXXXXX, pero amplía el prefijo
  -- si encuentra una colisión. El pseudónimo nunca supera 24 caracteres.
  for prefix_len in 6..14 loop
    candidate := 'Estudiante' || substr(hex_id, 1, prefix_len);
    if not exists (select 1 from public.profiles where pseudonimo = candidate) then
      return candidate;
    end if;
  end loop;

  -- Fallback extremadamente improbable: genera candidatos nuevos hasta hallar uno libre.
  loop
    candidate := 'Estudiante' || substr(md5(random()::text || clock_timestamp()::text), 1, 14);
    if not exists (select 1 from public.profiles where pseudonimo = candidate) then
      return candidate;
    end if;
  end loop;
end;
$$;

revoke all on function public.generate_unique_pseudonym(uuid) from public, anon, authenticated;
grant execute on function public.generate_unique_pseudonym(uuid) to service_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  suggested text;
begin
  suggested := public.generate_unique_pseudonym(new.id);
  insert into public.profiles(id, pseudonimo, is_admin)
  values(new.id, suggested, lower(coalesce(new.email,'')) = 'medmarunmdp@gmail.com')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Backfill: crea perfiles para cuentas de Auth que ya existían antes de instalar este schema.
do $$
declare
  u record;
  suggested text;
begin
  for u in
    select id, email
    from auth.users
    where not exists (select 1 from public.profiles p where p.id = auth.users.id)
  loop
    suggested := public.generate_unique_pseudonym(u.id);
    insert into public.profiles(id, pseudonimo, is_admin)
    values(u.id, suggested, lower(coalesce(u.email,'')) = 'medmarunmdp@gmail.com')
    on conflict (id) do nothing;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- SOLICITUDES
-- status activa/completada/cancelada
-- completed_at se usa para limpieza de 14 días.
-- operation_id permite reintentos idempotentes.
-- ------------------------------------------------------------

create table if not exists public.solicitudes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  materia text not null,
  tengo integer not null,
  busco integer not null,
  status text not null default 'activa',
  exchange_id uuid,
  operation_id uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint solicitudes_comision_chk check (tengo between 1 and 40 and busco between 1 and 40 and tengo <> busco),
  constraint solicitudes_status_chk check (status in ('activa','completada','cancelada'))
);

create index if not exists solicitudes_user_status_idx on public.solicitudes(user_id, status, created_at desc);
create index if not exists solicitudes_match_idx on public.solicitudes(materia, tengo, busco) where status = 'activa';
create index if not exists solicitudes_cleanup_idx on public.solicitudes(status, created_at, completed_at);
create unique index if not exists solicitudes_user_materia_activa_idx on public.solicitudes(user_id, materia) where status = 'activa';

drop trigger if exists solicitudes_updated_at on public.solicitudes;
create trigger solicitudes_updated_at
before update on public.solicitudes
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- INTERCAMBIOS + PARTICIPANTES
-- ------------------------------------------------------------

create table if not exists public.intercambios (
  id uuid primary key default gen_random_uuid(),
  materia text not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz not null default now()
);

create table if not exists public.intercambio_participantes (
  intercambio_id uuid not null references public.intercambios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  solicitud_id uuid references public.solicitudes(id) on delete set null,
  tengo integer not null,
  busco integer not null,
  primary key (intercambio_id, user_id)
);

create index if not exists intercambio_participantes_user_idx on public.intercambio_participantes(user_id, intercambio_id);

alter table public.solicitudes
  drop constraint if exists solicitudes_exchange_fk;
alter table public.solicitudes
  add constraint solicitudes_exchange_fk foreign key (exchange_id) references public.intercambios(id) on delete set null;

-- ------------------------------------------------------------
-- CHAT
-- ------------------------------------------------------------

create table if not exists public.conversaciones (
  id uuid primary key default gen_random_uuid(),
  intercambio_id uuid unique references public.intercambios(id) on delete cascade,
  materia text not null,
  created_at timestamptz not null default now(),
  ultima_actividad timestamptz not null default now(),
  cantidad_mensajes integer not null default 0
);

create table if not exists public.conversacion_participantes (
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (conversacion_id, user_id)
);

create index if not exists conversacion_participantes_user_idx on public.conversacion_participantes(user_id, conversacion_id);

create table if not exists public.mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.conversaciones(id) on delete cascade,
  remitente_id uuid not null references auth.users(id) on delete cascade,
  texto text not null,
  created_at timestamptz not null default now(),
  operation_id uuid not null unique,
  constraint mensajes_texto_chk check (char_length(texto) between 1 and 2000)
);

create index if not exists mensajes_conversacion_created_idx on public.mensajes(conversacion_id, created_at desc);

create or replace function public.touch_conversacion_on_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversaciones
  set ultima_actividad = new.created_at,
      cantidad_mensajes = cantidad_mensajes + 1
  where id = new.conversacion_id;
  return new;
end;
$$;

drop trigger if exists mensajes_touch_conversacion on public.mensajes;
create trigger mensajes_touch_conversacion
after insert on public.mensajes
for each row execute function public.touch_conversacion_on_message();

-- ------------------------------------------------------------
-- FORO
-- ------------------------------------------------------------

create table if not exists public.hilos (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references auth.users(id) on delete cascade,
  es_anonimo boolean not null default false,
  titulo text not null,
  contenido text not null,
  etiquetas text[] not null default '{}',
  link text,
  created_at timestamptz not null default now(),
  respuestas integer not null default 0,
  operation_id uuid not null unique,
  constraint hilos_titulo_chk check (char_length(titulo) between 1 and 140),
  constraint hilos_contenido_chk check (char_length(contenido) between 1 and 5000)
);

create index if not exists hilos_fecha_idx on public.hilos(created_at desc);
create index if not exists hilos_etiquetas_gin_idx on public.hilos using gin(etiquetas);

create table if not exists public.respuestas (
  id uuid primary key default gen_random_uuid(),
  hilo_id uuid not null references public.hilos(id) on delete cascade,
  autor_id uuid not null references auth.users(id) on delete cascade,
  es_anonimo boolean not null default false,
  contenido text not null,
  created_at timestamptz not null default now(),
  operation_id uuid not null unique,
  constraint respuestas_contenido_chk check (char_length(contenido) between 1 and 5000)
);

create index if not exists respuestas_hilo_fecha_idx on public.respuestas(hilo_id, created_at asc);

create or replace function public.adjust_hilo_response_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.hilos set respuestas = respuestas + 1 where id = new.hilo_id;
  elsif tg_op = 'DELETE' then
    update public.hilos set respuestas = greatest(0, respuestas - 1) where id = old.hilo_id;
  end if;
  return null;
end;
$$;

drop trigger if exists respuestas_count_after on public.respuestas;
create trigger respuestas_count_after
after insert or delete on public.respuestas
for each row execute function public.adjust_hilo_response_count();

-- ------------------------------------------------------------
-- LIKES
-- ------------------------------------------------------------

create table if not exists public.likes_hilos (
  hilo_id uuid not null references public.hilos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (hilo_id, user_id)
);

create table if not exists public.likes_respuestas (
  respuesta_id uuid not null references public.respuestas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (respuesta_id, user_id)
);

create index if not exists likes_hilos_user_idx on public.likes_hilos(user_id);
create index if not exists likes_respuestas_user_idx on public.likes_respuestas(user_id);

-- ------------------------------------------------------------
-- MODERACIÓN
-- ------------------------------------------------------------

create table if not exists public.denuncias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  id_publicacion uuid not null,
  denunciante_id uuid not null references auth.users(id) on delete cascade,
  motivo text not null default '',
  created_at timestamptz not null default now(),
  estado text not null default 'pendiente',
  resuelto_por uuid references auth.users(id) on delete set null,
  fecha_resolucion timestamptz,
  constraint denuncias_tipo_chk check (tipo in ('hilo','respuesta')),
  constraint denuncias_estado_chk check (estado in ('pendiente','descartada','eliminada'))
);

create index if not exists denuncias_estado_fecha_idx on public.denuncias(estado, created_at);

-- ------------------------------------------------------------
-- COLA DE EMAILS
-- ------------------------------------------------------------

create table if not exists public.notificacion_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null,
  asunto text not null,
  cuerpo text not null,
  status text not null default 'pendiente',
  intentos integer not null default 0,
  ultimo_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  next_attempt_at timestamptz,
  exchange_id uuid references public.intercambios(id) on delete cascade,
  unique (exchange_id, user_id, tipo)
);

-- Reparación no destructiva por si la tabla ya existía por una ejecución anterior.
alter table public.notificacion_queue add column if not exists user_id uuid;
alter table public.notificacion_queue add column if not exists tipo text;
alter table public.notificacion_queue add column if not exists asunto text;
alter table public.notificacion_queue add column if not exists cuerpo text;
alter table public.notificacion_queue add column if not exists status text;
alter table public.notificacion_queue add column if not exists intentos integer;
alter table public.notificacion_queue add column if not exists ultimo_error text;
alter table public.notificacion_queue add column if not exists created_at timestamptz;
alter table public.notificacion_queue add column if not exists updated_at timestamptz;
alter table public.notificacion_queue add column if not exists sent_at timestamptz;
alter table public.notificacion_queue add column if not exists next_attempt_at timestamptz;
alter table public.notificacion_queue add column if not exists exchange_id uuid;

update public.notificacion_queue set status = 'pendiente' where status is null;
update public.notificacion_queue set intentos = 0 where intentos is null;
update public.notificacion_queue set created_at = now() where created_at is null;
update public.notificacion_queue set updated_at = coalesce(created_at, now()) where updated_at is null;
update public.notificacion_queue set tipo = 'sistema' where tipo is null;
update public.notificacion_queue set asunto = 'Notificación MedMarUNMDP' where asunto is null;
update public.notificacion_queue set cuerpo = '' where cuerpo is null;

alter table public.notificacion_queue alter column status set default 'pendiente';
alter table public.notificacion_queue alter column status set not null;
alter table public.notificacion_queue alter column intentos set default 0;
alter table public.notificacion_queue alter column intentos set not null;
alter table public.notificacion_queue alter column created_at set default now();
alter table public.notificacion_queue alter column created_at set not null;
alter table public.notificacion_queue alter column updated_at set default now();
alter table public.notificacion_queue alter column updated_at set not null;
alter table public.notificacion_queue alter column tipo set not null;
alter table public.notificacion_queue alter column asunto set not null;
alter table public.notificacion_queue alter column cuerpo set not null;

drop trigger if exists notificacion_queue_updated_at on public.notificacion_queue;
create trigger notificacion_queue_updated_at
before update on public.notificacion_queue
for each row execute function public.set_updated_at();

create index if not exists notification_queue_status_idx on public.notificacion_queue(status, created_at);

-- Reclama filas de correo de forma atómica para evitar envíos duplicados si
-- dos ejecuciones de mantenimiento coinciden. Solo service_role puede llamarla.
create or replace function public.claim_notification_batch(p_limit integer default 20)
returns setof public.notificacion_queue
language sql
security definer
set search_path = ''
as $$
  with picked as (
    select q.id
    from public.notificacion_queue q
    where (
      q.status = 'pendiente'
      and (q.next_attempt_at is null or q.next_attempt_at <= now())
    )
    or (
      q.status = 'procesando'
      and q.updated_at < now() - interval '10 minutes'
    )
    order by q.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  )
  update public.notificacion_queue q
  set status = 'procesando', updated_at = now(), intentos = q.intentos + 1
  from picked
  where q.id = picked.id
  returning q.*;
$$;

revoke all on function public.claim_notification_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_batch(integer) to service_role;

-- ------------------------------------------------------------
-- IDEMPOTENCIA
-- ------------------------------------------------------------

create table if not exists public.idempotency_keys (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  action text not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key(user_id, operation_id)
);

create index if not exists idempotency_cleanup_idx on public.idempotency_keys(created_at);

-- ------------------------------------------------------------
-- RATE LIMITS
-- ------------------------------------------------------------

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  count integer not null,
  window_started_at timestamptz not null
);

create or replace function public.consume_rate_limit(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after integer, current_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  now_ts timestamptz := now();
  row_data public.rate_limit_buckets%rowtype;
  elapsed double precision;
begin
  -- Garantiza que dos requests simultáneos para un bucket nuevo no choquen.
  insert into public.rate_limit_buckets(bucket_key, count, window_started_at)
  values(p_bucket_key, 0, now_ts)
  on conflict (bucket_key) do nothing;

  select * into row_data
  from public.rate_limit_buckets
  where bucket_key = p_bucket_key
  for update;

  elapsed := extract(epoch from (now_ts - row_data.window_started_at));

  if elapsed >= p_window_seconds then
    update public.rate_limit_buckets
      set count = 1, window_started_at = now_ts
      where bucket_key = p_bucket_key;
    return query select true, 0, 1;
    return;
  end if;

  if row_data.count >= p_limit then
    return query select false, greatest(1, ceil(p_window_seconds - elapsed)::integer), row_data.count;
    return;
  end if;

  update public.rate_limit_buckets
    set count = count + 1
    where bucket_key = p_bucket_key;
  return query select true, 0, row_data.count + 1;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated, service_role;

-- ------------------------------------------------------------
-- FINALIZACIÓN ATÓMICA DE UN MATCH
-- El Edge Function detecta el ciclo; esta función lo confirma en una
-- transacción única, marca solicitudes como completadas, crea intercambio,
-- conversación, participantes y notificaciones.
-- ------------------------------------------------------------

create or replace function public.finalize_exchange(
  p_request_ids uuid[],
  p_materia text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exchange_id uuid := gen_random_uuid();
  v_conversation_id uuid := gen_random_uuid();
  v_count integer;
  v_locked_count integer;
  v_expected_count integer;
begin
  v_expected_count := coalesce(array_length(p_request_ids, 1), 0);

  if v_expected_count < 2 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_cycle');
  end if;

  -- Un ID repetido no representa un ciclo válido.
  select count(distinct request_id) into v_locked_count
  from unnest(p_request_ids) as request_id;

  if v_locked_count <> v_expected_count then
    return jsonb_build_object('ok', false, 'reason', 'invalid_cycle');
  end if;

  -- IMPORTANTE: bloqueamos primero y validamos después. Así dos matches
  -- concurrentes que comparten solicitudes no pueden crear dos intercambios.
  select count(*) into v_locked_count
  from (
    select id
    from public.solicitudes
    where id = any(p_request_ids)
    order by id
    for update
  ) locked;

  if v_locked_count <> v_expected_count then
    return jsonb_build_object('ok', false, 'reason', 'conflict');
  end if;

  select count(*) into v_count
  from public.solicitudes s
  where s.id = any(p_request_ids)
    and s.status = 'activa'
    and s.materia = p_materia;

  if v_count <> v_expected_count then
    return jsonb_build_object('ok', false, 'reason', 'conflict');
  end if;

  insert into public.intercambios(id, materia)
  values(v_exchange_id, p_materia);

  insert into public.conversaciones(id, intercambio_id, materia)
  values(v_conversation_id, v_exchange_id, p_materia);

  insert into public.intercambio_participantes(intercambio_id, user_id, solicitud_id, tengo, busco)
  select v_exchange_id, s.user_id, s.id, s.tengo, s.busco
  from public.solicitudes s
  where s.id = any(p_request_ids);

  insert into public.conversacion_participantes(conversacion_id, user_id)
  select v_conversation_id, s.user_id
  from public.solicitudes s
  where s.id = any(p_request_ids);

  update public.solicitudes
  set status = 'completada', exchange_id = v_exchange_id, completed_at = now(), updated_at = now()
  where id = any(p_request_ids);

  insert into public.notificacion_queue(user_id, tipo, asunto, cuerpo, exchange_id)
  select
    s.user_id,
    'intercambio_encontrado',
    'Intercambio de comisión encontrado',
    'Se encontró un intercambio de comisión en MedMarUNMDP.' || E'\n\n' ||
    'Materia: ' || p_materia || E'\n\n' ||
    'Visitá MedMarUNMDP para coordinar el intercambio con quienes participaron.',
    v_exchange_id
  from public.solicitudes s
  where s.id = any(p_request_ids)
  on conflict (exchange_id, user_id, tipo) do nothing;

  return jsonb_build_object(
    'ok', true,
    'intercambioId', v_exchange_id,
    'conversacionId', v_conversation_id
  );
end;
$$;

revoke all on function public.finalize_exchange(uuid[], text) from public, anon, authenticated;
grant execute on function public.finalize_exchange(uuid[], text) to service_role;

-- ------------------------------------------------------------
-- LIMPIEZA DE DATOS
-- ------------------------------------------------------------

create or replace function public.cleanup_expired_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz := now() - interval '14 days';
  deleted_requests integer := 0;
  deleted_exchanges integer := 0;
  deleted_conversations integer := 0;
  deleted_idempotency integer := 0;
  deleted_notifications integer := 0;
begin
  delete from public.solicitudes
  where (status = 'activa' and created_at < cutoff)
     or (status = 'completada' and completed_at < cutoff)
     or (status = 'cancelada' and updated_at < cutoff);
  get diagnostics deleted_requests = row_count;

  delete from public.conversaciones where ultima_actividad < cutoff;
  get diagnostics deleted_conversations = row_count;

  delete from public.intercambios where completed_at < cutoff;
  get diagnostics deleted_exchanges = row_count;

  delete from public.idempotency_keys where created_at < now() - interval '30 days';
  get diagnostics deleted_idempotency = row_count;

  delete from public.notificacion_queue
  where (status in ('enviado','error') and created_at < now() - interval '30 days');
  get diagnostics deleted_notifications = row_count;

  return jsonb_build_object(
    'solicitudes', deleted_requests,
    'conversaciones', deleted_conversations,
    'intercambios', deleted_exchanges,
    'idempotency', deleted_idempotency,
    'notificaciones', deleted_notifications
  );
end;
$$;

revoke all on function public.cleanup_expired_data() from public, anon, authenticated;
grant execute on function public.cleanup_expired_data() to service_role;

-- Se usa exclusivamente durante la migración para reconstruir contadores
-- derivados sin duplicarlos después de insertar respuestas/mensajes.
create or replace function public.recount_medmar_counters()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread_count integer;
  conversation_count integer;
begin
  update public.hilos h
  set respuestas = (select count(*) from public.respuestas r where r.hilo_id = h.id);
  get diagnostics thread_count = row_count;

  update public.conversaciones c
  set cantidad_mensajes = (select count(*) from public.mensajes m where m.conversacion_id = c.id),
      ultima_actividad = coalesce(
        (select max(m.created_at) from public.mensajes m where m.conversacion_id = c.id),
        c.ultima_actividad
      );
  get diagnostics conversation_count = row_count;

  return jsonb_build_object('hilos_recontados', thread_count, 'conversaciones_recontadas', conversation_count);
end;
$$;

revoke all on function public.recount_medmar_counters() from public, anon, authenticated;
grant execute on function public.recount_medmar_counters() to service_role;

-- ------------------------------------------------------------
-- STORAGE PARA AVATARES
-- Se mantiene público para conservar el comportamiento actual de las fotos.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;


create or replace function public.is_exchange_participant(p_exchange_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.intercambio_participantes where intercambio_id = p_exchange_id and user_id = p_user_id);
$$;

create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.conversacion_participantes where conversacion_id = p_conversation_id and user_id = p_user_id);
$$;

revoke all on function public.is_exchange_participant(uuid, uuid) from public, anon;
revoke all on function public.is_conversation_participant(uuid, uuid) from public, anon;
grant execute on function public.is_exchange_participant(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.solicitudes enable row level security;
alter table public.intercambios enable row level security;
alter table public.intercambio_participantes enable row level security;
alter table public.conversaciones enable row level security;
alter table public.conversacion_participantes enable row level security;
alter table public.mensajes enable row level security;
alter table public.hilos enable row level security;
alter table public.respuestas enable row level security;
alter table public.likes_hilos enable row level security;
alter table public.likes_respuestas enable row level security;
alter table public.denuncias enable row level security;
alter table public.notificacion_queue enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.rate_limit_buckets enable row level security;

-- Profiles: pseudónimo/foto son públicos entre usuarios autenticados; roles no se pueden editar desde cliente.
drop policy if exists profiles_select_auth on public.profiles;
create policy profiles_select_auth on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = auth.uid());

-- Solicitudes propias.
drop policy if exists solicitudes_select_own on public.solicitudes;
create policy solicitudes_select_own on public.solicitudes for select to authenticated using (user_id = auth.uid());
drop policy if exists solicitudes_insert_own on public.solicitudes;
create policy solicitudes_insert_own on public.solicitudes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists solicitudes_update_own on public.solicitudes;
create policy solicitudes_update_own on public.solicitudes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists solicitudes_delete_own on public.solicitudes;
create policy solicitudes_delete_own on public.solicitudes for delete to authenticated using (user_id = auth.uid());

-- Intercambios/chat: solo participantes.
drop policy if exists intercambios_select_member on public.intercambios;
create policy intercambios_select_member on public.intercambios for select to authenticated
using (public.is_exchange_participant(id, auth.uid()));

drop policy if exists intercambio_participantes_select_member on public.intercambio_participantes;
create policy intercambio_participantes_select_member on public.intercambio_participantes for select to authenticated
using (public.is_exchange_participant(intercambio_id, auth.uid()));

drop policy if exists conversaciones_select_member on public.conversaciones;
create policy conversaciones_select_member on public.conversaciones for select to authenticated
using (public.is_conversation_participant(id, auth.uid()));

drop policy if exists conversacion_participantes_select_member on public.conversacion_participantes;
create policy conversacion_participantes_select_member on public.conversacion_participantes for select to authenticated
using (public.is_conversation_participant(conversacion_id, auth.uid()));

drop policy if exists mensajes_select_member on public.mensajes;
create policy mensajes_select_member on public.mensajes for select to authenticated
using (public.is_conversation_participant(conversacion_id, auth.uid()));
drop policy if exists mensajes_insert_member on public.mensajes;
create policy mensajes_insert_member on public.mensajes for insert to authenticated
with check (remitente_id = auth.uid() and public.is_conversation_participant(conversacion_id, auth.uid()));

-- Foro público autenticado.
drop policy if exists hilos_select_auth on public.hilos;
create policy hilos_select_auth on public.hilos for select to authenticated using (true);
drop policy if exists hilos_insert_self on public.hilos;
create policy hilos_insert_self on public.hilos for insert to authenticated with check (autor_id = auth.uid());
drop policy if exists hilos_update_owner_or_mod on public.hilos;
create policy hilos_update_owner_or_mod on public.hilos for update to authenticated using (autor_id = auth.uid() or public.is_moderator(auth.uid())) with check (autor_id = auth.uid() or public.is_moderator(auth.uid()));
drop policy if exists hilos_delete_owner_or_mod on public.hilos;
create policy hilos_delete_owner_or_mod on public.hilos for delete to authenticated using (autor_id = auth.uid() or public.is_moderator(auth.uid()));

drop policy if exists respuestas_select_auth on public.respuestas;
create policy respuestas_select_auth on public.respuestas for select to authenticated using (true);
drop policy if exists respuestas_insert_self on public.respuestas;
create policy respuestas_insert_self on public.respuestas for insert to authenticated with check (autor_id = auth.uid());
drop policy if exists respuestas_update_owner_or_mod on public.respuestas;
create policy respuestas_update_owner_or_mod on public.respuestas for update to authenticated using (autor_id = auth.uid() or public.is_moderator(auth.uid())) with check (autor_id = auth.uid() or public.is_moderator(auth.uid()));
drop policy if exists respuestas_delete_owner_or_mod on public.respuestas;
create policy respuestas_delete_owner_or_mod on public.respuestas for delete to authenticated using (autor_id = auth.uid() or public.is_moderator(auth.uid()));

-- Likes.
drop policy if exists likes_hilos_select_auth on public.likes_hilos;
create policy likes_hilos_select_auth on public.likes_hilos for select to authenticated using (true);
drop policy if exists likes_hilos_insert_self on public.likes_hilos;
create policy likes_hilos_insert_self on public.likes_hilos for insert to authenticated with check (user_id = auth.uid());
drop policy if exists likes_hilos_delete_self on public.likes_hilos;
create policy likes_hilos_delete_self on public.likes_hilos for delete to authenticated using (user_id = auth.uid());

drop policy if exists likes_respuestas_select_auth on public.likes_respuestas;
create policy likes_respuestas_select_auth on public.likes_respuestas for select to authenticated using (true);
drop policy if exists likes_respuestas_insert_self on public.likes_respuestas;
create policy likes_respuestas_insert_self on public.likes_respuestas for insert to authenticated with check (user_id = auth.uid());
drop policy if exists likes_respuestas_delete_self on public.likes_respuestas;
create policy likes_respuestas_delete_self on public.likes_respuestas for delete to authenticated using (user_id = auth.uid());

-- Denuncias.
drop policy if exists denuncias_insert_self on public.denuncias;
create policy denuncias_insert_self on public.denuncias for insert to authenticated with check (denunciante_id = auth.uid());
drop policy if exists denuncias_select_mod on public.denuncias;
create policy denuncias_select_mod on public.denuncias for select to authenticated using (public.is_moderator(auth.uid()));
drop policy if exists denuncias_update_mod on public.denuncias;
create policy denuncias_update_mod on public.denuncias for update to authenticated using (public.is_moderator(auth.uid())) with check (public.is_moderator(auth.uid()));

-- Todo lo demás no se expone directamente al cliente.

-- Permisos base: RLS decide qué filas puede tocar cada usuario autenticado.
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.solicitudes to authenticated;
grant select on public.intercambios to authenticated;
grant select on public.intercambio_participantes to authenticated;
grant select on public.conversaciones to authenticated;
grant select, insert on public.mensajes to authenticated;
grant select, insert, update, delete on public.hilos to authenticated;
grant select, insert, update, delete on public.respuestas to authenticated;
grant select, insert, delete on public.likes_hilos to authenticated;
grant select, insert, delete on public.likes_respuestas to authenticated;
grant select, insert, update on public.denuncias to authenticated;

-- El frontend no escribe directamente en Postgres: todas las mutaciones pasan
-- por la Edge Function, que valida identidad, rate limiting e idempotencia.
-- Se conservan permisos SELECT para RLS/Realtime y se eliminan INSERT/UPDATE/DELETE
-- directos para usuarios autenticados.
revoke insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete on public.solicitudes from authenticated;
revoke insert, update, delete on public.intercambios from authenticated;
revoke insert, update, delete on public.intercambio_participantes from authenticated;
revoke insert, update, delete on public.conversaciones from authenticated;
revoke insert, update, delete on public.conversacion_participantes from authenticated;
revoke insert, update, delete on public.mensajes from authenticated;
revoke insert, update, delete on public.hilos from authenticated;
revoke insert, update, delete on public.respuestas from authenticated;
revoke insert, update, delete on public.likes_hilos from authenticated;
revoke insert, update, delete on public.likes_respuestas from authenticated;
revoke insert, update, delete on public.denuncias from authenticated;
revoke insert, update, delete on public.notificacion_queue from authenticated;
revoke insert, update, delete on public.idempotency_keys from authenticated;
revoke insert, update, delete on public.rate_limit_buckets from authenticated;

revoke all on public.notificacion_queue from anon, authenticated;
revoke all on public.idempotency_keys from anon, authenticated;
revoke all on public.rate_limit_buckets from anon, authenticated;

-- ------------------------------------------------------------
-- STORAGE RLS
-- ------------------------------------------------------------

drop policy if exists profile_photos_select_public on storage.objects;
create policy profile_photos_select_public on storage.objects for select to public using (bucket_id = 'profile-photos');
drop policy if exists profile_photos_insert_own on storage.objects;
create policy profile_photos_insert_own on storage.objects for insert to authenticated with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists profile_photos_update_own on storage.objects;
create policy profile_photos_update_own on storage.objects for update to authenticated using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists profile_photos_delete_own on storage.objects;
create policy profile_photos_delete_own on storage.objects for delete to authenticated using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------
-- REALTIME
-- Chat instantáneo. Postgres Changes es suficiente para la escala inicial de MedMar.
-- ------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
exception when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mensajes'
  ) then
    alter publication supabase_realtime add table public.mensajes;
  end if;
end $$;
