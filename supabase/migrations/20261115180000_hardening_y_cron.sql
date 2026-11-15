-- MedMar — Hardening de seguridad, limpieza de restos y trabajos programados (auditoría 2026-11).
-- Ver docs/auditoria-supabase-2026-11.md y docs/decisiones/0002-escrituras-solo-por-api.md.
--
-- 1. Borra las ~50 RPC heredadas de un esquema viejo (referencian tablas que ya no existen).
-- 2. Escrituras SOLO por la Edge Function `api`: se quitan las políticas RLS de INSERT/UPDATE/DELETE y los
--    privilegios de escritura de anon/authenticated. Las lecturas (y Realtime) siguen por RLS.
-- 3. Políticas SELECT con `(select auth.uid())` (advisor auth_rls_initplan) e índices para FKs.
-- 4. search_path fijo, permisos de funciones mínimos, RLS en private.legacy_password_migrations.
-- 5. Storage: el bucket de fotos solo acepta imágenes chicas y no se puede listar ni escribir directo.
-- 6. Cron: limpieza diaria real (cleanup_expired_data) y `maintenance` cada 10 min solo si hay mails pendientes.

-- ------------------------------------------------------------
-- 1. RPC heredadas
-- ------------------------------------------------------------
drop function if exists
  public._asegurar_perfil(uuid), public._buscar_ciclo(uuid), public._cerrar_ciclo(uuid[]),
  public._email_valido(text), public._err(text), public._es_admin(), public._es_moderador(),
  public._etiquetas_json(), public._hilo_json(uuid, uuid, boolean), public._intercambios_de(uuid),
  public._link_permitido(text), public._lista_hilos(text, integer, uuid), public._mailer_autorizado(text),
  public._nuevo_usuario(), public._operacion_id(text), public._rl(text, integer, integer),
  public._solicitudes_de(uuid), public._tags_limpias(text), public._validar_comisiones(integer, integer),
  public.actualizar_foto(), public.actualizar_pseudonimo(text), public.asignar_moderador(text),
  public.borrar_hilo(uuid), public.borrar_respuesta(uuid), public.borrar_solicitud(uuid),
  public.crear_hilo(text, text, text, text, boolean, text), public.crear_respuesta(uuid, text, boolean, text),
  public.denunciar(text, uuid, text), public.editar_solicitud(uuid, text, integer, integer),
  public.enviar_mensaje(uuid, text, text), public.foro_bootstrap(text),
  public.guardar_solicitud(text, integer, integer), public.limpiar_expirados(), public.listar_denuncias(),
  public.listar_etiquetas(), public.listar_hilos(text, integer), public.listar_moderadores(),
  public.mailer_marcar(text, uuid, boolean, text), public.mailer_tomar(text, integer), public.mi_perfil(),
  public.mis_intercambios(), public.mis_solicitudes(), public.obtener_chat(uuid, integer), public.ping(),
  public.quitar_moderador(text), public.resolver_denuncia(uuid, text), public.rpc_bootstrap(),
  public.soy_moderador(), public.toggle_like(text, uuid), public.ver_hilo(uuid);

-- ------------------------------------------------------------
-- 2. Escrituras solo por la API (cliente admin dentro de la Edge Function)
-- ------------------------------------------------------------
drop policy if exists profiles_insert_self            on public.profiles;
drop policy if exists profiles_update_self            on public.profiles;
drop policy if exists solicitudes_insert_own          on public.solicitudes;
drop policy if exists solicitudes_update_own          on public.solicitudes;
drop policy if exists solicitudes_delete_own          on public.solicitudes;
drop policy if exists mensajes_insert_member          on public.mensajes;
drop policy if exists hilos_insert_self               on public.hilos;
drop policy if exists hilos_update_owner_or_mod       on public.hilos;
drop policy if exists hilos_delete_owner_or_mod       on public.hilos;
drop policy if exists respuestas_insert_self          on public.respuestas;
drop policy if exists respuestas_update_owner_or_mod  on public.respuestas;
drop policy if exists respuestas_delete_owner_or_mod  on public.respuestas;
drop policy if exists likes_hilos_insert_self         on public.likes_hilos;
drop policy if exists likes_hilos_delete_self         on public.likes_hilos;
drop policy if exists likes_respuestas_insert_self    on public.likes_respuestas;
drop policy if exists likes_respuestas_delete_self    on public.likes_respuestas;
drop policy if exists denuncias_insert_self           on public.denuncias;
drop policy if exists denuncias_update_mod            on public.denuncias;

revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;

-- ------------------------------------------------------------
-- 3. Políticas SELECT optimizadas + índices de FKs
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ------------------------------------------------------------
drop policy if exists solicitudes_select_own on public.solicitudes;
create policy solicitudes_select_own on public.solicitudes for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists intercambios_select_member on public.intercambios;
create policy intercambios_select_member on public.intercambios for select to authenticated
  using (public.is_exchange_participant(id, (select auth.uid())));

drop policy if exists intercambio_participantes_select_member on public.intercambio_participantes;
create policy intercambio_participantes_select_member on public.intercambio_participantes for select to authenticated
  using (public.is_exchange_participant(intercambio_id, (select auth.uid())));

drop policy if exists conversaciones_select_member on public.conversaciones;
create policy conversaciones_select_member on public.conversaciones for select to authenticated
  using (public.is_conversation_participant(id, (select auth.uid())));

drop policy if exists conversacion_participantes_select_member on public.conversacion_participantes;
create policy conversacion_participantes_select_member on public.conversacion_participantes for select to authenticated
  using (public.is_conversation_participant(conversacion_id, (select auth.uid())));

drop policy if exists mensajes_select_member on public.mensajes;
create policy mensajes_select_member on public.mensajes for select to authenticated
  using (public.is_conversation_participant(conversacion_id, (select auth.uid())));

drop policy if exists denuncias_select_mod on public.denuncias;
create policy denuncias_select_mod on public.denuncias for select to authenticated
  using (public.is_moderator((select auth.uid())));

create index if not exists hilos_autor_idx                 on public.hilos (autor_id);
create index if not exists respuestas_autor_idx            on public.respuestas (autor_id);
create index if not exists respuestas_parent_hilo_idx      on public.respuestas (parent_id, hilo_id);
create index if not exists mensajes_remitente_idx          on public.mensajes (remitente_id);
create index if not exists notificacion_queue_user_idx     on public.notificacion_queue (user_id);
create index if not exists denuncias_denunciante_idx       on public.denuncias (denunciante_id);
create index if not exists denuncias_publicacion_idx       on public.denuncias (id_publicacion);
create index if not exists denuncias_resuelto_por_idx      on public.denuncias (resuelto_por);
create index if not exists solicitudes_exchange_idx        on public.solicitudes (exchange_id);
create index if not exists intercambio_part_solicitud_idx  on public.intercambio_participantes (solicitud_id);

-- ------------------------------------------------------------
-- 4. Funciones: search_path fijo y permisos mínimos
-- ------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_admin is distinct from old.is_admin or new.is_moderator is distinct from old.is_moderator then
    -- La API cambia roles con la secret key (rol service_role). Antes se leía el GUC legacy
    -- `request.jwt.claim.role`, que PostgREST ya no define, y asignar moderadores fallaba.
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
       and current_user not in ('service_role', 'postgres', 'supabase_admin')
       and not public.is_admin(auth.uid()) then
      raise exception 'role_change_not_allowed';
    end if;
  end if;
  return new;
end;
$$;

alter function public.touch_conversacion_on_message() set search_path = '';
alter function public.adjust_hilo_response_count()    set search_path = '';
alter function public.set_updated_at()                set search_path = '';

revoke execute on function public.prevent_role_escalation()       from public, anon, authenticated;
revoke execute on function public.touch_conversacion_on_message() from public, anon, authenticated;
revoke execute on function public.adjust_hilo_response_count()    from public, anon, authenticated;
revoke execute on function public.set_updated_at()                from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user()          from public, anon, authenticated;
-- Solo la API (service_role) consume rate limits: un usuario no puede agotar el bucket de otro.
revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant  execute on function public.consume_rate_limit(text, integer, integer) to service_role;

alter table private.legacy_password_migrations enable row level security;

-- ------------------------------------------------------------
-- 5. Storage
-- ------------------------------------------------------------
-- Los buckets públicos se sirven por URL sin políticas; la de SELECT solo permitía listar las carpetas
-- (ids de usuarios). Las subidas las hace la API con la secret key.
-- https://supabase.com/docs/guides/storage/buckets/fundamentals#public-buckets
drop policy if exists profile_photos_select_public on storage.objects;
drop policy if exists profile_photos_insert_own    on storage.objects;
drop policy if exists profile_photos_update_own    on storage.objects;
drop policy if exists profile_photos_delete_own    on storage.objects;
-- Bucket heredado `avatares` (vacío): sin políticas queda inutilizable. Borrarlo desde el dashboard.
drop policy if exists avatares_actualizar on storage.objects;
drop policy if exists avatares_borrar     on storage.objects;
drop policy if exists avatares_leer       on storage.objects;
drop policy if exists avatares_subir      on storage.objects;

update storage.buckets
   set file_size_limit = 262144,
       allowed_mime_types = array['image/jpeg']
 where id = 'profile-photos';

-- ------------------------------------------------------------
-- 6. Limpieza y cron
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
  deleted_rate_limits integer := 0;
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

  -- Enviados/errores viejos, y pendientes que ya no tiene sentido mandar.
  delete from public.notificacion_queue
  where (status in ('enviado', 'error') and created_at < now() - interval '30 days')
     or (status in ('pendiente', 'procesando') and created_at < cutoff);
  get diagnostics deleted_notifications = row_count;

  -- La ventana más larga de RATE_LIMITS es 1 h; 1 día de margen.
  delete from public.rate_limit_buckets where window_started_at < now() - interval '1 day';
  get diagnostics deleted_rate_limits = row_count;

  return jsonb_build_object(
    'solicitudes', deleted_requests,
    'conversaciones', deleted_conversations,
    'intercambios', deleted_exchanges,
    'idempotency', deleted_idempotency,
    'notificaciones', deleted_notifications,
    'rate_limits', deleted_rate_limits
  );
end;
$$;

revoke all on function public.cleanup_expired_data() from public, anon, authenticated;
grant execute on function public.cleanup_expired_data() to service_role;

-- Mails de matches de septiembre que nunca salieron: se descartan (decisión del 2026-11-15).
update public.notificacion_queue
   set status = 'error', ultimo_error = 'descartado_antiguo', next_attempt_at = null
 where status = 'pendiente' and created_at < '2026-10-01';

-- Token compartido entre pg_cron y la Edge Function `maintenance`. Se genera dentro de la base y vive solo
-- en Vault: nadie lo ve ni queda en el repo. https://supabase.com/docs/guides/database/vault
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'medmar_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'medmar_cron_secret',
      'Token que pg_cron manda a la Edge Function maintenance (header x-medmar-cron-secret)');
  end if;
end $$;

create or replace function public.cron_token_valido(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p_token) >= 32, false) and exists (
    select 1 from vault.decrypted_secrets
    where name = 'medmar_cron_secret' and decrypted_secret = p_token
  );
$$;

revoke all on function public.cron_token_valido(text) from public, anon, authenticated;
grant execute on function public.cron_token_valido(text) to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- El job viejo llamaba a limpiar_expirados() (borrada arriba) y fallaba todos los días.
select cron.unschedule(jobid) from cron.job where jobname = 'medmar-limpieza-diaria';

-- https://supabase.com/docs/guides/cron
select cron.schedule('medmar-cleanup-diario', '0 6 * * *', $job$select public.cleanup_expired_data()$job$);

-- https://supabase.com/docs/guides/functions/schedule-functions
-- Solo se invoca la función si hay mails para mandar: casi cero invocaciones del plan Free.
select cron.schedule('medmar-maintenance', '*/10 * * * *', $job$
  select net.http_post(
    url := 'https://ekfwdrsehhmrqxxlefyx.supabase.co/functions/v1/maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-medmar-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'medmar_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  where exists (
    select 1 from public.notificacion_queue q
    where (q.status = 'pendiente' and (q.next_attempt_at is null or q.next_attempt_at <= now()))
       or (q.status = 'procesando' and q.updated_at < now() - interval '10 minutes')
  )
$job$);
