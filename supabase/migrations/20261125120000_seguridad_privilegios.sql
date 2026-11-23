-- Auditoría de seguridad 2026-11, fase B: mínimo privilegio en la base.
-- Informe: https://claude.ai/artifact/7a5WNP5rLbbzSxrHirpB5V (hallazgos SEC-10 a SEC-15).
--
-- Qué hace:
--   SEC-10  Quita a `anon` todo acceso directo a las tablas y secuencias públicas (hoy RLS le devolvía 0 filas, pero el
--           grant sobraba) y a `authenticated` los privilegios TRIGGER/REFERENCES/MAINTAIN. Corrige la causa raíz:
--           los privilegios por defecto del rol postgres daban ALL a anon y authenticated en cada tabla nueva.
--   SEC-11  `profiles`: el navegador solo puede leer id, pseudonimo y foto_url (no is_admin/is_moderator ni fechas).
--           `is_admin`/`is_moderator` dejan de ser ejecutables por RPC desde el navegador (la API usa service_role).
--   SEC-12  El trigger de roles solo deja cambiar is_admin/is_moderator al service_role (la API, con llave de admin).
--   SEC-13  Ya no se da admin automático por email al crear un usuario.
--   SEC-14  Elimina las funciones de migración de contraseñas legacy (la tabla private.legacy_password_migrations está
--           vacía y se conserva).
--   SEC-15  finalize_exchange vuelve a validar la cadena tengo→busco después de bloquear las solicitudes.
--   Extra   ranking_juego con search_path vacío.
--
-- Requiere la API v17 o posterior (ya deployada): profileMap y bootstrap no leen roles con el cliente del usuario.
-- No borra datos. Es idempotente. Tiene `revoke`/`drop` (el MCP los rechaza): ejecutar ENTERA en
-- Supabase Dashboard > SQL Editor. La reversión está al final, comentada.

begin;

-- ------------------------------------------------------------
-- SEC-10: grants sobrantes
-- ------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon, authenticated;
revoke trigger, references, maintain on all tables in schema public from authenticated;

-- Causa raíz: lo que cree el rol postgres en public de acá en adelante nace sin permisos para el navegador.
-- Cada tabla nueva que deba leerse desde el navegador necesita su `grant select … to authenticated` explícito.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, public;

-- ------------------------------------------------------------
-- SEC-11: profiles por columnas + helpers de rol solo para el servidor
-- ------------------------------------------------------------
revoke select on public.profiles from authenticated;
grant select (id, pseudonimo, foto_url) on public.profiles to authenticated;

revoke execute on function public.is_admin(uuid) from public, anon, authenticated;
revoke execute on function public.is_moderator(uuid) from public, anon, authenticated;
grant execute on function public.is_admin(uuid) to service_role;
grant execute on function public.is_moderator(uuid) to service_role;

-- ------------------------------------------------------------
-- SEC-12: roles solo por service_role
-- ------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin or new.is_moderator is distinct from old.is_moderator then
    -- Solo la API (secret key → service_role), que antes exige la llave de admin (autorizarModeracion), o SQL del
    -- dashboard. Ya no alcanza con ser admin: una sesión robada de un admin no puede dar roles sin la llave.
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
       and current_user not in ('service_role', 'postgres', 'supabase_admin') then
      raise exception 'role_change_not_allowed';
    end if;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- SEC-13: sin admin automático por email
-- ------------------------------------------------------------
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
  -- Los roles se dan solo desde Moderación → Equipo (con llave de admin) o por SQL. Antes, quien se registrara con el
  -- email de la cuenta oficial nacía admin, incluso antes de confirmar el mail.
  insert into public.profiles(id, pseudonimo)
  values(new.id, suggested)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- SEC-14: fuera la migración legacy (la acción legacyLogin ya no existe en la API)
-- ------------------------------------------------------------
drop function if exists public.get_legacy_password(text);
drop function if exists public.upsert_legacy_password(text, text, text);
drop function if exists public.mark_legacy_password_migrated(text);

-- ------------------------------------------------------------
-- SEC-15: finalize_exchange revalida la cadena después del lock
-- ------------------------------------------------------------
create or replace function public.finalize_exchange(p_request_ids uuid[], p_materia text)
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

  -- SEC-15: con las filas ya bloqueadas, la cadena tiene que cerrar (lo que busca cada uno es lo que tiene el
  -- siguiente, y el último cierra con el primero) y cada solicitud tiene que ser de una persona distinta.
  -- Antes, un `editar` entre la búsqueda del ciclo y este cierre podía generar un intercambio inválido.
  if exists (
    select 1
    from unnest(p_request_ids) with ordinality as a(id, pos)
    join public.solicitudes sa on sa.id = a.id
    join unnest(p_request_ids) with ordinality as b(id, pos) on b.pos = (a.pos % v_expected_count) + 1
    join public.solicitudes sb on sb.id = b.id
    where sa.busco is distinct from sb.tengo
  ) then
    return jsonb_build_object('ok', false, 'reason', 'conflict');
  end if;

  select count(distinct s.user_id) into v_count
  from public.solicitudes s
  where s.id = any(p_request_ids);

  if v_count <> v_expected_count then
    return jsonb_build_object('ok', false, 'reason', 'invalid_cycle');
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
-- Extra: ranking_juego con search_path vacío (ya usa nombres calificados)
-- ------------------------------------------------------------
alter function public.ranking_juego(text, text, integer, uuid, text) set search_path = '';

commit;

-- ============================================================
-- REVERSIÓN (no ejecutar salvo que haga falta volver atrás). Copiar y correr en el SQL Editor:
-- ============================================================
-- begin;
-- grant select, trigger, references, maintain on public.hilos, public.respuestas, public.likes_hilos,
--   public.likes_respuestas, public.solicitudes, public.intercambios, public.intercambio_participantes,
--   public.conversaciones, public.conversacion_participantes, public.mensajes, public.profiles to anon, authenticated;
-- grant trigger, references, maintain on public.denuncias to anon, authenticated;
-- grant select on public.denuncias to anon;
-- grant usage, select, update on sequence public.registro_moderacion_id_seq to anon, authenticated;
-- alter default privileges for role postgres in schema public grant all on tables to anon, authenticated;
-- alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated;
-- alter default privileges for role postgres in schema public grant execute on functions to anon, authenticated;
-- grant select on public.profiles to authenticated;
-- grant execute on function public.is_admin(uuid) to authenticated;
-- grant execute on function public.is_moderator(uuid) to authenticated;
-- alter function public.ranking_juego(text, text, integer, uuid, text) set search_path = public;
-- -- prevent_role_escalation, handle_new_auth_user y finalize_exchange: volver a correr sus versiones anteriores,
-- -- que están en supabase/migrations/20261115180000_hardening_y_cron.sql y 20261101000000_schema_inicial.sql.
-- -- Las funciones legacy (get/upsert/mark_legacy_password*) están en 20261101000000_schema_inicial.sql.
-- commit;
