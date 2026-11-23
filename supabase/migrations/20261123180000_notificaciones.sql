-- Notificaciones dentro de la web (campana de MedMar).
--
-- Una fila por aviso para una persona. Las crean triggers de la base, así ninguna acción de la API tiene que
-- acordarse de avisar:
--   * respuesta              → al autor del hilo, cuando alguien más responde.
--   * respuesta_a_respuesta  → al autor de la respuesta citada (si no es el mismo autor del hilo).
--   * mensaje                → a los demás participantes de un chat de intercambio.
--   * intercambio            → a cada participante de un intercambio nuevo.
--   * noticia                → la publica un admin con la acción publicarNoticia (una fila por usuario).
-- Avisos repetidos se agrupan: mientras el aviso de un hilo (o chat) siga sin leer, una respuesta nueva suma
-- `cantidad` en vez de crear otra fila («3 respuestas nuevas en …»).
--
-- Lectura: cada usuario ve solo las suyas (RLS). Escritura: solo triggers (security definer) y la API con el
-- cliente admin (marcar como leídas, noticias); sin políticas de insert/update/delete (ADR 0002).
-- Realtime: la tabla entra en supabase_realtime para que la campana se actualice sola.
-- Limpieza: leídas de más de 30 días y todas las de más de 60, dentro de cleanup_expired_data().
--
-- No es destructiva. Idempotente. Tiene `revoke` (el MCP lo rechaza): ejecutarla entera en
-- Supabase Dashboard > SQL Editor.

create table if not exists public.notificaciones (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  tipo        text        not null check (tipo in ('respuesta', 'respuesta_a_respuesta', 'mensaje', 'intercambio', 'noticia')),
  -- Copias de texto al momento del aviso (pseudónimo o «Anónimo», título del hilo o materia): así la lista
  -- se arma sin joins y no revela nada que la persona no haya podido ver en su momento.
  actor       text        check (char_length(actor) <= 60),
  contexto    text        check (char_length(contexto) <= 160),
  cuerpo      text        check (char_length(cuerpo) <= 400),
  link        text        check (char_length(link) <= 300),
  -- A dónde lleva el aviso: id del hilo, de la conversación, del intercambio o de la noticia.
  ref_id      uuid,
  cantidad    integer     not null default 1 check (cantidad >= 1),
  leida       boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.notificaciones is
  'Avisos de la campana de MedMar. Los crean triggers (respuestas, mensajes, intercambios) y la API (noticias).';

create index if not exists notificaciones_usuario_idx
  on public.notificaciones (user_id, updated_at desc);

-- Agrupación: a lo sumo un aviso sin leer por usuario, tipo y destino.
create unique index if not exists notificaciones_agrupar_idx
  on public.notificaciones (user_id, tipo, ref_id) where not leida;

drop trigger if exists notificaciones_updated_at on public.notificaciones;
create trigger notificaciones_updated_at
before update on public.notificaciones
for each row execute function public.set_updated_at();

alter table public.notificaciones enable row level security;

drop policy if exists notificaciones_select_propias on public.notificaciones;
create policy notificaciones_select_propias
  on public.notificaciones for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.notificaciones from anon, authenticated;
grant select on public.notificaciones to authenticated;

-- ------------------------------------------------------------
-- Alta o agrupación de un aviso. Uso interno de los triggers.
-- ------------------------------------------------------------
create or replace function public.notificar(
  p_user_id uuid, p_tipo text, p_actor text, p_contexto text, p_ref_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then return; end if;
  insert into public.notificaciones (user_id, tipo, actor, contexto, ref_id)
  values (p_user_id, p_tipo, left(p_actor, 60), left(p_contexto, 160), p_ref_id)
  on conflict (user_id, tipo, ref_id) where not leida
  do update set cantidad = public.notificaciones.cantidad + 1,
                actor = excluded.actor,
                contexto = excluded.contexto;
end;
$$;

revoke all on function public.notificar(uuid, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.nombre_publico(p_user_id uuid, p_anonimo boolean default false)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_anonimo then 'Anónimo'
              else coalesce((select pseudonimo from public.profiles where id = p_user_id), 'Estudiante') end;
$$;

revoke all on function public.nombre_publico(uuid, boolean) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Triggers. Un error al avisar nunca debe impedir publicar la respuesta, el mensaje o el intercambio:
-- se registra como warning y sigue.
-- ------------------------------------------------------------
create or replace function public.notificar_respuesta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hilo_autor uuid;
  v_titulo text;
  v_padre_autor uuid;
  v_actor text;
begin
  begin
    select autor_id, titulo into v_hilo_autor, v_titulo from public.hilos where id = new.hilo_id;
    v_actor := public.nombre_publico(new.autor_id, new.es_anonimo);

    if v_hilo_autor is not null and v_hilo_autor <> new.autor_id then
      perform public.notificar(v_hilo_autor, 'respuesta', v_actor, v_titulo, new.hilo_id);
    end if;

    if new.parent_id is not null then
      select autor_id into v_padre_autor from public.respuestas where id = new.parent_id;
      if v_padre_autor is not null and v_padre_autor <> new.autor_id
         and v_padre_autor is distinct from v_hilo_autor then
        perform public.notificar(v_padre_autor, 'respuesta_a_respuesta', v_actor, v_titulo, new.hilo_id);
      end if;
    end if;
  exception when others then
    raise warning 'notificar_respuesta: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists respuestas_notificar on public.respuestas;
create trigger respuestas_notificar
after insert on public.respuestas
for each row execute function public.notificar_respuesta();

create or replace function public.notificar_mensaje()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_materia text;
  v_actor text;
  v_destino uuid;
begin
  begin
    select materia into v_materia from public.conversaciones where id = new.conversacion_id;
    v_actor := public.nombre_publico(new.remitente_id, false);
    for v_destino in
      select user_id from public.conversacion_participantes
      where conversacion_id = new.conversacion_id and user_id <> new.remitente_id
    loop
      perform public.notificar(v_destino, 'mensaje', v_actor, v_materia, new.conversacion_id);
    end loop;
  exception when others then
    raise warning 'notificar_mensaje: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists mensajes_notificar on public.mensajes;
create trigger mensajes_notificar
after insert on public.mensajes
for each row execute function public.notificar_mensaje();

create or replace function public.notificar_intercambio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform public.notificar(
      new.user_id, 'intercambio', null,
      (select materia from public.intercambios where id = new.intercambio_id),
      new.intercambio_id);
  exception when others then
    raise warning 'notificar_intercambio: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists intercambio_participantes_notificar on public.intercambio_participantes;
create trigger intercambio_participantes_notificar
after insert on public.intercambio_participantes
for each row execute function public.notificar_intercambio();

revoke all on function public.notificar_respuesta() from public, anon, authenticated;
revoke all on function public.notificar_mensaje() from public, anon, authenticated;
revoke all on function public.notificar_intercambio() from public, anon, authenticated;

-- ------------------------------------------------------------
-- Realtime: la campana escucha INSERT/UPDATE de sus propias filas (RLS filtra por usuario).
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;

-- ------------------------------------------------------------
-- Limpieza: igual que la versión anterior + notificaciones de la campana.
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
  deleted_app_notifications integer := 0;
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

  -- Campana: leídas de más de 30 días y cualquiera de más de 60.
  delete from public.notificaciones
  where (leida and updated_at < now() - interval '30 days')
     or updated_at < now() - interval '60 days';
  get diagnostics deleted_app_notifications = row_count;

  -- La ventana más larga de RATE_LIMITS es 1 h; 1 día de margen.
  delete from public.rate_limit_buckets where window_started_at < now() - interval '1 day';
  get diagnostics deleted_rate_limits = row_count;

  return jsonb_build_object(
    'solicitudes', deleted_requests,
    'conversaciones', deleted_conversations,
    'intercambios', deleted_exchanges,
    'idempotency', deleted_idempotency,
    'notificaciones', deleted_notifications,
    'notificaciones_app', deleted_app_notifications,
    'rate_limits', deleted_rate_limits
  );
end;
$$;

revoke all on function public.cleanup_expired_data() from public, anon, authenticated;
grant execute on function public.cleanup_expired_data() to service_role;
