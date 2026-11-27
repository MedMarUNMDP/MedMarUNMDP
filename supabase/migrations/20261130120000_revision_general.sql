-- Revisión general (2026-11-30). Idempotente: se puede correr más de una vez.
-- Basada en las definiciones vigentes en producción (leídas con pg_get_functiondef / pg_policies el 2026-11-27).
--
-- 1. respuestas: la política SELECT además oculta las respuestas de hilos que están en la papelera.
-- 2. generate_unique_pseudonym: compara sin distinguir mayúsculas (igual que el índice profiles_pseudonimo_lower_uidx).
-- 3. recordatorios_diarios: el aviso «tu cuenta se elimina» usa un ref_id propio (derivado del id) para no pisarse
--    con el de «tu rol de moderación vence» (los dos eran tipo 'recordatorio' con ref_id = p.id y, por el índice
--    notificaciones_agrupar_idx (user_id, tipo, ref_id) where not leida, el segundo se descartaba).
-- 4. recount_medmar_counters: cuenta solo respuestas fuera de la papelera (igual que el trigger adjust_hilo_response_count).
-- 5. cleanup_expired_data: borra también el historial de pg_cron (cron.job_run_details, 14 días), denuncias resueltas
--    de más de 180 días y apelaciones resueltas de más de 180 días cuya sanción ya no rige (levantada o anulada).
--    Las apelaciones de un baneo que sigue vigente NO se borran: si se borraran, la persona podría apelar de nuevo
--    (la API solo lo impide por el índice único apelaciones_sancion_id_key).
-- 6. is_conversation_participant / is_exchange_participant: solo responden por quien consulta (p_user_id debe ser
--    auth.uid()). Las únicas que las usan son las políticas *_select_member, que ya pasan (select auth.uid()), así que
--    para ellas no cambia nada; lo que se evita es que una cuenta pregunte por RPC si OTRA persona está en un chat.
--    Se mantiene la firma (las políticas dependen de ella) y el grant a authenticated (las políticas lo necesitan).
--
-- No borra datos al aplicarse: la limpieza nueva corre con el cron medmar-cleanup-diario (06:00 UTC).
-- Tiene `drop policy`: el MCP la rechaza. Ejecutar en Supabase Dashboard > SQL Editor.
--
-- Revertir:
--   1. drop policy if exists respuestas_select_auth on public.respuestas;
--      create policy respuestas_select_auth on public.respuestas for select to authenticated using (eliminado_at is null);
--   2-5. volver a crear cada función sin las partes marcadas con «Cambio:» (el resto es idéntico a producción).
--   6. volver a crear las dos funciones sin la condición `coalesce(p_user_id = (select auth.uid()), false) and`.

-- ---------------------------------------------------------------------------------------------------------------
-- 1. Respuestas de hilos en la papelera
-- ---------------------------------------------------------------------------------------------------------------
drop policy if exists respuestas_select_auth on public.respuestas;
create policy respuestas_select_auth on public.respuestas
  for select to authenticated
  using (
    eliminado_at is null
    and exists (select 1 from public.hilos h where h.id = hilo_id and h.eliminado_at is null)
  );

-- ---------------------------------------------------------------------------------------------------------------
-- 2. Seudónimo único sin distinguir mayúsculas
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.generate_unique_pseudonym(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  hex_id text := replace(p_user_id::text, '-', '');
  candidate text;
  prefix_len integer;
begin
  -- Conserva el formato histórico EstudianteXXXXXX, pero amplía el prefijo
  -- si encuentra una colisión. El pseudónimo nunca supera 24 caracteres.
  -- Cambio: la comparación es sin distinguir mayúsculas, como el índice profiles_pseudonimo_lower_uidx.
  for prefix_len in 6..14 loop
    candidate := 'Estudiante' || substr(hex_id, 1, prefix_len);
    if not exists (select 1 from public.profiles where lower(pseudonimo) = lower(candidate)) then
      return candidate;
    end if;
  end loop;

  -- Fallback extremadamente improbable: genera candidatos nuevos hasta hallar uno libre.
  loop
    candidate := 'Estudiante' || substr(md5(random()::text || clock_timestamp()::text), 1, 14);
    if not exists (select 1 from public.profiles where lower(pseudonimo) = lower(candidate)) then
      return candidate;
    end if;
  end loop;
end;
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 3. Recordatorios diarios: la baja de cuenta con ref_id propio
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.recordatorios_diarios()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  n_por_vencer integer := 0;
  n_vencidos integer := 0;
  n_solicitudes integer := 0;
  n_bajas integer := 0;
  n_mods integer := 0;
begin
  -- Cada consulta mira una ventana de 24 h: como corre una vez por día, cada cosa se avisa una sola vez.

  -- Avisos de Compra venta que vencen en 3 días.
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select c.autor_id, 'recordatorio', left('Tu aviso «' || c.titulo || '» vence en 3 días', 160),
         'Si todavía lo ofrecés, renovalo desde Compra venta → Tus avisos.', '/?vista=clasificados', c.id
  from public.clasificados c
  where c.activo and c.expira_at > now() + interval '2 days' and c.expira_at <= now() + interval '3 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;
  get diagnostics n_por_vencer = row_count;

  -- Avisos que vencieron en las últimas 24 h (reemplaza el «vence en 3 días» si no se leyó).
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select c.autor_id, 'recordatorio', left('Tu aviso «' || c.titulo || '» venció', 160),
         'Ya no se muestra en Compra venta. Podés volver a publicarlo desde Tus avisos.', '/?vista=clasificados', c.id
  from public.clasificados c
  where c.activo and c.expira_at <= now() and c.expira_at > now() - interval '1 day'
  on conflict (user_id, tipo, ref_id) where not leida
  do update set contexto = excluded.contexto, cuerpo = excluded.cuerpo, updated_at = now();
  get diagnostics n_vencidos = row_count;

  -- Solicitudes de intercambio activas que se borran en 2 días (cleanup_expired_data las borra a los 14).
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select s.user_id, 'recordatorio', left('Tu solicitud de ' || s.materia || ' vence en 2 días', 160),
         'Las solicitudes sin intercambio se borran a los 14 días. Si seguís buscando, volvé a publicarla cuando venza.',
         '/?vista=intercambios', s.id
  from public.solicitudes s
  where s.status = 'activa' and s.created_at < now() - interval '12 days' and s.created_at >= now() - interval '13 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;
  get diagnostics n_solicitudes = row_count;

  -- Cuentas que se borran en 3 días (baja pedida desde el perfil).
  -- Cambio: ref_id derivado del id (md5('baja-cuenta:' || id) como uuid) para que no choque con el aviso de
  -- «rol de moderación vence/venció», que usa ref_id = p.id con el mismo user_id y tipo.
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select p.id, 'recordatorio', 'Tu cuenta se elimina en 3 días',
         'Si te arrepentiste, entrá a Perfil y tocá «Cancelar la eliminación».', '/?vista=configuracion',
         md5('baja-cuenta:' || p.id::text)::uuid
  from public.profiles p
  where p.baja_programada_para > now() + interval '2 days' and p.baja_programada_para <= now() + interval '3 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;
  get diagnostics n_bajas = row_count;

  -- Moderadores cuyo rol vence en 14 días: aviso a la persona y a cada admin (para que lo confirme o no).
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select p.id, 'recordatorio',
         'Tu rol de moderación vence el ' || to_char(p.moderador_vence_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'),
         'Termina el período de moderación. Si vas a seguir, pedile a un administrador que te confirme para el próximo.',
         '/?vista=moderacion', p.id
  from public.profiles p
  where p.is_moderator and not p.is_admin
    and p.moderador_vence_at > now() + interval '13 days' and p.moderador_vence_at <= now() + interval '14 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;
  get diagnostics n_mods = row_count;

  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select a.id, 'recordatorio',
         left('El rol de moderación de ' || p.pseudonimo || ' vence el ' || to_char(p.moderador_vence_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'), 160),
         'Si sigue en el equipo, confirmalo en Moderación → Equipo. Si no, no hagas nada: pierde el rol solo.',
         '/?vista=moderacion', p.id
  from public.profiles p
  cross join public.profiles a
  where a.is_admin and p.is_moderator and not p.is_admin
    and p.moderador_vence_at > now() + interval '13 days' and p.moderador_vence_at <= now() + interval '14 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;

  -- Moderadores cuyo rol venció en las últimas 24 h (reemplaza a propósito el «vence el …» si no se leyó).
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select p.id, 'recordatorio', 'Tu rol de moderación venció',
         'Terminó el período y no fue confirmado. Si seguís en el equipo, pedile a un administrador que te confirme.',
         '/?vista=moderacion', p.id
  from public.profiles p
  where p.is_moderator and not p.is_admin
    and p.moderador_vence_at <= now() and p.moderador_vence_at > now() - interval '1 day'
  on conflict (user_id, tipo, ref_id) where not leida
  do update set contexto = excluded.contexto, cuerpo = excluded.cuerpo, updated_at = now();

  return jsonb_build_object('avisos_por_vencer', n_por_vencer, 'avisos_vencidos', n_vencidos,
                            'solicitudes', n_solicitudes, 'bajas', n_bajas, 'moderadores', n_mods);
end;
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 4. Recuento de contadores sin la papelera
-- ---------------------------------------------------------------------------------------------------------------
create or replace function public.recount_medmar_counters()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  thread_count integer;
  conversation_count integer;
begin
  -- Cambio: solo respuestas fuera de la papelera, igual que el trigger adjust_hilo_response_count.
  update public.hilos h
  set respuestas = (select count(*) from public.respuestas r where r.hilo_id = h.id and r.eliminado_at is null);
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
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 5. Limpieza diaria: historial de pg_cron, denuncias y apelaciones resueltas
-- ---------------------------------------------------------------------------------------------------------------
-- Es security definer con dueño postgres, que tiene DELETE sobre cron.job_run_details (verificado con
-- has_table_privilege). Igual va en un bloque aparte: si algún día cambia el permiso, el resto de la limpieza sigue.
create or replace function public.cleanup_expired_data()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  cutoff timestamptz := now() - interval '14 days';
  deleted_requests integer := 0;
  deleted_exchanges integer := 0;
  deleted_conversations integer := 0;
  deleted_idempotency integer := 0;
  deleted_notifications integer := 0;
  deleted_app_notifications integer := 0;
  deleted_contributions integer := 0;
  deleted_keys integer := 0;
  deleted_audit integer := 0;
  deleted_rate_limits integer := 0;
  deleted_matches integer := 0;
  deleted_reports integer := 0;
  deleted_appeals integer := 0;
  deleted_cron_runs integer := 0;
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

  -- Campana: leídas de más de 30 días y cualquiera de más de 60.
  delete from public.notificaciones
  where (leida and updated_at < now() - interval '30 days')
     or updated_at < now() - interval '60 days';
  get diagnostics deleted_app_notifications = row_count;

  -- Aportes: rechazados a los 30 días; aprobados a los 180 (el material ya quedó en el catálogo).
  delete from public.aportes_material
  where (estado = 'rechazado' and coalesce(revisado_at, created_at) < now() - interval '30 days')
     or (estado = 'aprobado' and coalesce(revisado_at, created_at) < now() - interval '180 days');
  get diagnostics deleted_contributions = row_count;

  -- Llaves: pendientes sin aprobar en 7 días y revocadas hace más de 180.
  delete from public.llaves_moderacion
  where (estado = 'pendiente' and created_at < now() - interval '7 days')
     or (estado = 'revocada' and revocada_at < now() - interval '180 days');
  get diagnostics deleted_keys = row_count;

  delete from public.registro_moderacion where created_at < now() - interval '180 days';
  get diagnostics deleted_audit = row_count;

  -- La ventana más larga de RATE_LIMITS es 1 h; 1 día de margen.
  delete from public.rate_limit_buckets where window_started_at < now() - interval '2 days';
  get diagnostics deleted_rate_limits = row_count;

  -- Historial de partidas (estadísticas del ranking): un año alcanza para los promedios.
  delete from public.partidas_juegos where created_at < now() - interval '365 days';
  get diagnostics deleted_matches = row_count;

  -- Cambio: denuncias resueltas (descartada/eliminada) hace más de 180 días, como registro_moderacion.
  delete from public.denuncias
  where estado in ('descartada', 'eliminada')
    and coalesce(fecha_resolucion, created_at) < now() - interval '180 days';
  get diagnostics deleted_reports = row_count;

  -- Cambio: apelaciones resueltas hace más de 180 días, solo si la sanción ya no rige (levantada o anulada).
  -- Las de un baneo permanente todavía vigente se conservan: son las que impiden un segundo descargo.
  delete from public.apelaciones a
  where a.estado in ('aceptada', 'rechazada')
    and coalesce(a.resuelta_at, a.created_at) < now() - interval '180 days'
    and exists (
      select 1 from public.sanciones s
      where s.id = a.sancion_id and (s.levantada_at is not null or s.anulada)
    );
  get diagnostics deleted_appeals = row_count;

  -- Cambio: historial de ejecuciones de pg_cron (con los jobs actuales crece unas 160 filas por día).
  begin
    delete from cron.job_run_details where end_time < now() - interval '14 days';
    get diagnostics deleted_cron_runs = row_count;
  exception when others then
    raise warning 'cleanup_expired_data: no se pudo limpiar cron.job_run_details: %', sqlerrm;
  end;

  return jsonb_build_object(
    'solicitudes', deleted_requests,
    'conversaciones', deleted_conversations,
    'intercambios', deleted_exchanges,
    'idempotency', deleted_idempotency,
    'notificaciones', deleted_notifications,
    'notificaciones_app', deleted_app_notifications,
    'aportes', deleted_contributions,
    'llaves', deleted_keys,
    'auditoria', deleted_audit,
    'rate_limits', deleted_rate_limits,
    'partidas', deleted_matches,
    'denuncias', deleted_reports,
    'apelaciones', deleted_appeals,
    'cron_historial', deleted_cron_runs
  );
end;
$function$;

-- ---------------------------------------------------------------------------------------------------------------
-- 6. Helpers de participación: solo por quien consulta
-- ---------------------------------------------------------------------------------------------------------------
-- `create or replace` conserva los grants actuales (authenticated y service_role), que las políticas necesitan.
-- Con service_role o postgres (sin JWT) auth.uid() es null y devuelven false: hoy nadie las llama así
-- (ni la API ni otras funciones; solo las políticas *_select_member, y service_role saltea RLS).
create or replace function public.is_exchange_participant(p_exchange_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  -- Cambio: p_user_id tiene que ser quien consulta; con otro id devuelve false.
  select coalesce(p_user_id = (select auth.uid()), false)
     and exists (select 1 from public.intercambio_participantes where intercambio_id = p_exchange_id and user_id = p_user_id);
$function$;

create or replace function public.is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  -- Cambio: p_user_id tiene que ser quien consulta; con otro id devuelve false.
  select coalesce(p_user_id = (select auth.uid()), false)
     and exists (select 1 from public.conversacion_participantes where conversacion_id = p_conversation_id and user_id = p_user_id);
$function$;
