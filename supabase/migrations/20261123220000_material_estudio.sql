-- Material de estudio y aportes de la comunidad.
--
-- * materiales: catálogo de recursos alojados en Google Drive (PDF, documentos, carpetas). MedMar guarda solo
--   el enlace y los datos para buscarlo: los archivos no ocupan espacio en Supabase.
-- * aportes_material: lo que mandan los estudiantes para sumar al catálogo. Siempre como ENLACE de Drive
--   (no hay subida de archivos) o como sugerencia de texto. Un moderador lo aprueba (pasa a materiales) o lo
--   rechaza; quien lo mandó recibe una notificación (tipo 'aporte').
--
-- Anti-spam: la acción enviarAporte de la API valida tamaños, solo acepta enlaces de drive.google.com o
-- docs.google.com, aplica rate limit, tope diario por persona, tope de pendientes por persona y global,
-- campo trampa y tiempo mínimo de llenado. Además, acá: límites de largo por columna y un mismo enlace no
-- puede estar dos veces pendiente o aprobado.
--
-- Lectura: materiales activos para cualquier usuario autenticado; aportes, cada uno los suyos (los
-- moderadores los leen por la API con el cliente admin). Escritura: solo la API (ADR 0002).
-- Limpieza: aportes rechazados > 30 días y resueltos > 180 días, en cleanup_expired_data().
--
-- Tiene `alter table … drop constraint` y `revoke` (el MCP los rechaza). No borra datos.
-- Idempotente. Ejecutarla entera en Supabase Dashboard > SQL Editor.

-- ------------------------------------------------------------
-- Catálogo
-- ------------------------------------------------------------
create table if not exists public.materiales (
  id           uuid        primary key default gen_random_uuid(),
  titulo       text        not null check (char_length(titulo) between 3 and 120),
  descripcion  text        check (char_length(descripcion) <= 400),
  materia      text        not null check (char_length(materia) between 2 and 120),
  tipo         text        not null check (tipo in ('resumen', 'apunte', 'guia', 'examen', 'libro', 'otro')),
  link         text        not null check (char_length(link) <= 300 and link ~ '^https://(drive|docs)\.google\.com/'),
  credito      text        check (char_length(credito) <= 60),
  aporte_id    uuid,
  creado_por   uuid        references auth.users(id) on delete set null,
  activo       boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.materiales is
  'Material de estudio (enlaces a Google Drive). Lo cargan moderadores por la API o aprobando aportes.';

create index if not exists materiales_listado_idx on public.materiales (activo, created_at desc);
create unique index if not exists materiales_link_unico_idx on public.materiales (lower(link)) where activo;

drop trigger if exists materiales_updated_at on public.materiales;
create trigger materiales_updated_at
before update on public.materiales
for each row execute function public.set_updated_at();

alter table public.materiales enable row level security;

drop policy if exists materiales_select_activos on public.materiales;
create policy materiales_select_activos
  on public.materiales for select to authenticated
  using (activo);

revoke all on public.materiales from anon, authenticated;
grant select (id, titulo, descripcion, materia, tipo, link, credito, created_at) on public.materiales to authenticated;

-- ------------------------------------------------------------
-- Aportes de estudiantes
-- ------------------------------------------------------------
create table if not exists public.aportes_material (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  clase         text        not null check (clase in ('archivo', 'sugerencia')),
  titulo        text        not null check (char_length(titulo) between 3 and 120),
  descripcion   text        check (char_length(descripcion) <= 1000),
  materia       text        check (char_length(materia) <= 120),
  tipo          text        check (tipo in ('resumen', 'apunte', 'guia', 'examen', 'libro', 'otro')),
  link          text        check (char_length(link) <= 300 and link ~ '^https://(drive|docs)\.google\.com/'),
  mostrar_credito boolean   not null default false,
  estado        text        not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  motivo        text        check (char_length(motivo) <= 300),
  revisado_por  uuid        references auth.users(id) on delete set null,
  revisado_at   timestamptz,
  created_at    timestamptz not null default now(),
  constraint aportes_archivo_con_link check (clase <> 'archivo' or link is not null)
);

comment on table public.aportes_material is
  'Aportes de material (enlaces de Drive o sugerencias). Los revisan moderadores. Solo escribe la API.';

create index if not exists aportes_material_pendientes_idx on public.aportes_material (estado, created_at);
create index if not exists aportes_material_usuario_idx on public.aportes_material (user_id, created_at desc);
create unique index if not exists aportes_material_link_unico_idx
  on public.aportes_material (lower(link)) where link is not null and estado in ('pendiente', 'aprobado');

alter table public.aportes_material enable row level security;

drop policy if exists aportes_material_select_propios on public.aportes_material;
create policy aportes_material_select_propios
  on public.aportes_material for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.aportes_material from anon, authenticated;
grant select (id, clase, titulo, materia, tipo, link, estado, motivo, created_at, revisado_at)
  on public.aportes_material to authenticated;

-- ------------------------------------------------------------
-- Notificación al resolver un aporte: nuevo tipo 'aporte' en la campana.
-- ------------------------------------------------------------
alter table public.notificaciones drop constraint if exists notificaciones_tipo_check;
alter table public.notificaciones add constraint notificaciones_tipo_check
  check (tipo in ('respuesta', 'respuesta_a_respuesta', 'mensaje', 'intercambio', 'noticia', 'aporte'));

-- ------------------------------------------------------------
-- Limpieza: versión anterior + aportes resueltos.
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

  -- Aportes: rechazados a los 30 días; aprobados a los 180 (el material ya quedó en el catálogo).
  delete from public.aportes_material
  where (estado = 'rechazado' and coalesce(revisado_at, created_at) < now() - interval '30 days')
     or (estado = 'aprobado' and coalesce(revisado_at, created_at) < now() - interval '180 days');
  get diagnostics deleted_contributions = row_count;

  -- La ventana más larga de RATE_LIMITS es 1 día; 1 día más de margen.
  delete from public.rate_limit_buckets where window_started_at < now() - interval '2 days';
  get diagnostics deleted_rate_limits = row_count;

  return jsonb_build_object(
    'solicitudes', deleted_requests,
    'conversaciones', deleted_conversations,
    'intercambios', deleted_exchanges,
    'idempotency', deleted_idempotency,
    'notificaciones', deleted_notifications,
    'notificaciones_app', deleted_app_notifications,
    'aportes', deleted_contributions,
    'rate_limits', deleted_rate_limits
  );
end;
$$;

revoke all on function public.cleanup_expired_data() from public, anon, authenticated;
grant execute on function public.cleanup_expired_data() to service_role;
