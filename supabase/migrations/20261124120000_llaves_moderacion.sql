-- Llaves de moderación: segundo factor criptográfico para todas las acciones de moderación y administración.
--
-- Cómo funciona (ver ADR docs/decisiones/0004-llaves-de-moderacion.md):
--   * Cada moderador o admin tiene un par de llaves ECDSA P-256 generado EN SU NAVEGADOR. La privada queda en un
--     archivo .medmarkey cifrado con una contraseña (PBKDF2 + AES-GCM) que nunca se sube. Acá se guarda solo la
--     llave pública y su huella.
--   * Para moderar, la API entrega un desafío; el navegador lo firma con la llave privada y la API verifica la firma
--     contra la llave pública registrada. Si es válida, entrega un token de moderación de 30 minutos.
--   * Toda acción de moderación exige: cuenta con el rol (profiles.is_moderator / is_admin) + llave activa del mismo
--     usuario y con ese rol + token vigente. Robar la cuenta sola no alcanza.
--   * Raíz de confianza: las llaves de ADMIN solo se dan de alta con SQL desde el dashboard de Supabase (este
--     archivo no crea ninguna). Las de moderador las registra el propio moderador (quedan 'pendiente') y las aprueba
--     un admin con su llave, verificando la huella por otro canal.
--
-- Nadie lee ni escribe estas tablas desde el navegador: solo la Edge Function api con el cliente admin.
-- Registro de auditoría de cada acción de moderación (180 días).
--
-- Tiene `revoke` (el MCP lo rechaza). No borra datos. Idempotente. Ejecutarla entera en el SQL Editor.

-- Denuncias: antes un moderador podía leerlas directo por PostgREST (política denuncias_select_mod), sin llave y
-- sin dejar rastro. Ahora solo las lee la API (listarDenuncias, que exige llave) con el cliente admin.
drop policy if exists denuncias_select_mod on public.denuncias;
revoke select on public.denuncias from authenticated;

create table if not exists public.llaves_moderacion (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  rol           text        not null check (rol in ('moderador', 'admin')),
  nombre        text        check (char_length(nombre) <= 60),
  public_key    jsonb       not null check (
                              public_key->>'kty' = 'EC' and public_key->>'crv' = 'P-256'
                              and public_key ? 'x' and public_key ? 'y' and not public_key ? 'd'
                              and pg_column_size(public_key) <= 600),
  huella        text        not null check (huella ~ '^[0-9A-F]{4}(-[0-9A-F]{4}){3}$'),
  estado        text        not null default 'pendiente' check (estado in ('pendiente', 'activa', 'revocada')),
  aprobada_por  uuid        references auth.users(id) on delete set null,
  aprobada_at   timestamptz,
  revocada_at   timestamptz,
  ultimo_uso    timestamptz,
  created_at    timestamptz not null default now()
);

comment on table public.llaves_moderacion is
  'Llaves públicas (ECDSA P-256) de moderadores y admins. Las privadas nunca salen del archivo del usuario.';

create unique index if not exists llaves_moderacion_huella_idx on public.llaves_moderacion (huella);
create index if not exists llaves_moderacion_usuario_idx on public.llaves_moderacion (user_id, estado);

alter table public.llaves_moderacion enable row level security;
revoke all on public.llaves_moderacion from anon, authenticated;

create table if not exists public.registro_moderacion (
  id          bigint      generated always as identity primary key,
  user_id     uuid        references auth.users(id) on delete set null,
  llave_id    uuid,
  accion      text        not null check (char_length(accion) <= 40),
  detalle     jsonb       not null default '{}'::jsonb check (pg_column_size(detalle) <= 2048),
  created_at  timestamptz not null default now()
);

comment on table public.registro_moderacion is
  'Auditoría: quién hizo qué acción de moderación, con qué llave y cuándo. Solo la API escribe y lee.';

create index if not exists registro_moderacion_fecha_idx on public.registro_moderacion (created_at desc);

alter table public.registro_moderacion enable row level security;
revoke all on public.registro_moderacion from anon, authenticated;

-- ------------------------------------------------------------
-- Limpieza: versión anterior + llaves pendientes viejas y auditoría de más de 180 días.
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
    'rate_limits', deleted_rate_limits
  );
end;
$$;

revoke all on function public.cleanup_expired_data() from public, anon, authenticated;
grant execute on function public.cleanup_expired_data() to service_role;
