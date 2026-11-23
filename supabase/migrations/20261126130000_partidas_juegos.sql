-- Historial de partidas del ranking, para estadísticas y detección de trampas.
-- guardarPuntaje guarda una fila por partida válida (además del mejor puntaje en puntajes_juegos). Con eso la API
-- calcula, por modo, el ritmo típico de eliminaciones por segundo y marca las partidas fuera de lo común para que
-- un moderador las mire (acción estadisticasRanking). No hay tope duro de eliminaciones por segundo: un jugador
-- muy fuerte puede eliminar muchísimo, así que se decide mirando los datos.
--
-- Costo: ~150 bytes por partida (100 mil partidas ≈ 15 MB). Se borran a los 365 días en cleanup_expired_data.
-- Solo la API lee y escribe (sin grants para anon/authenticated).
--
-- No es destructiva. Idempotente. Tiene `revoke`: ejecutarla entera en Supabase Dashboard > SQL Editor.
--
-- Reversión:
--   drop table if exists public.partidas_juegos;
--   cleanup_expired_data: volver a la versión de 20261124120000_llaves_moderacion.sql

create table if not exists public.partidas_juegos (
  id          bigint      generated always as identity primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  juego       text        not null check (juego ~ '^[a-z0-9-]{2,40}$'),
  modo        text        not null check (modo ~ '^[a-z0-9.-]{2,40}$'),
  puntaje     integer     not null check (puntaje >= 0),
  segundos    integer     not null check (segundos >= 0),
  kills       integer     not null check (kills >= 0),
  correctas   integer     not null check (correctas >= 0),
  preguntas   integer     not null check (preguntas >= 0),
  jefes       integer     not null check (jefes >= 0),
  dificultad_infeccion text not null check (length(dificultad_infeccion) <= 30),
  dificultad_evolucion text not null check (length(dificultad_evolucion) <= 30),
  version     text        not null default '' check (length(version) <= 20),
  created_at  timestamptz not null default now()
);

comment on table public.partidas_juegos is
  'Una fila por partida guardada en el ranking (estadísticas). Solo escribe y lee la API. Se borra a los 365 días.';

create index if not exists partidas_juegos_modo_idx on public.partidas_juegos (juego, modo, created_at desc);
create index if not exists partidas_juegos_usuario_idx on public.partidas_juegos (user_id, juego, modo, created_at desc);

alter table public.partidas_juegos enable row level security;
revoke all on public.partidas_juegos from anon, authenticated;

-- ------------------------------------------------------------
-- Limpieza: igual que la versión anterior + historial de partidas de más de 365 días.
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
  deleted_contributions integer := 0;
  deleted_keys integer := 0;
  deleted_audit integer := 0;
  deleted_rate_limits integer := 0;
  deleted_matches integer := 0;
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
    'partidas', deleted_matches
  );
end;
$$;

revoke all on function public.cleanup_expired_data() from public, anon, authenticated;
grant execute on function public.cleanup_expired_data() to service_role;
