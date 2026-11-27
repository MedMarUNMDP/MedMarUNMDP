-- Sanciones: strikes, suspensiones, baneos, apelaciones y bloqueo por dispositivo.
--
-- Reglas (las aplica la API, ver «SANCIONES» en supabase/functions/api/index.ts):
--   · Cada strike suspende 30 días; el tercero (contando los de los últimos 12 meses no anulados) es permanente.
--   · Suspensión común: no publica en el foro ni en Compra venta, ni cambia seudónimo/foto, ni manda aportes.
--     Suspensión total (opción del moderador): además no usa chats, comisiones, likes, votos ni el ranking.
--   · Por dispositivo (opción del moderador): la sanción alcanza también a los navegadores que usó la cuenta, con
--     cualquier cuenta. La huella es el SHA-256 de un id al azar que guarda cada navegador (no es IP ni fingerprint).
--   · Baneo permanente: a los 30 días la persona puede mandar UN descargo (apelaciones.sancion_id es único).
-- Sin grants para anon/authenticated: solo la API (secret key) lee y escribe.
--
-- Revertir: ver al final.

create table if not exists public.sanciones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strike smallint not null check (strike between 1 and 3),
  permanente boolean not null default false,
  total boolean not null default false,
  por_dispositivo boolean not null default false,
  categoria text not null check (categoria in ('acoso', 'discriminacion', 'pacientes', 'datos_personales',
    'contenido_inapropiado', 'spam', 'compraventa', 'derechos', 'evasion', 'otro')),
  motivo text not null check (char_length(motivo) between 3 and 400),
  ref_tipo text check (ref_tipo in ('hilo', 'respuesta', 'clasificado', 'material')),
  ref_id uuid,
  ref_titulo text check (char_length(ref_titulo) <= 160),
  moderador_id uuid references auth.users(id) on delete set null,
  inicio_at timestamptz not null default now(),
  fin_at timestamptz,
  levantada_at timestamptz,
  levantada_por uuid references auth.users(id) on delete set null,
  motivo_levantamiento text check (char_length(motivo_levantamiento) <= 400),
  anulada boolean not null default false,
  created_at timestamptz not null default now(),
  constraint sanciones_fin_chk check (permanente = (fin_at is null))
);
create index if not exists sanciones_usuario_idx on public.sanciones (user_id, created_at desc);
create index if not exists sanciones_vigentes_idx on public.sanciones (fin_at) where levantada_at is null and not anulada;
-- Una misma publicación no se sanciona dos veces (doble clic, dos moderadores a la vez).
create unique index if not exists sanciones_ref_unica on public.sanciones (ref_tipo, ref_id) where ref_id is not null and not anulada;
alter table public.sanciones enable row level security;
revoke all on table public.sanciones from anon, authenticated;

create table if not exists public.apelaciones (
  id uuid primary key default gen_random_uuid(),
  sancion_id uuid not null unique references public.sanciones(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 20 and 2000),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  respuesta text check (char_length(respuesta) <= 400),
  resuelta_por uuid references auth.users(id) on delete set null,
  resuelta_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists apelaciones_pendientes_idx on public.apelaciones (created_at) where estado = 'pendiente';
alter table public.apelaciones enable row level security;
revoke all on table public.apelaciones from anon, authenticated;

-- Navegadores que usó cada cuenta (se anota en bootstrap). Se borra a los 180 días sin uso.
create table if not exists public.dispositivos_cuenta (
  user_id uuid not null references auth.users(id) on delete cascade,
  huella text not null check (huella ~ '^[0-9a-f]{64}$'),
  primer_uso timestamptz not null default now(),
  ultimo_uso timestamptz not null default now(),
  primary key (user_id, huella)
);
create index if not exists dispositivos_cuenta_huella_idx on public.dispositivos_cuenta (huella);
alter table public.dispositivos_cuenta enable row level security;
revoke all on table public.dispositivos_cuenta from anon, authenticated;

-- Dispositivos sancionados. Copia plazo y alcance de la sanción para seguir vigente aunque la cuenta se dé de baja
-- (justamente el caso que busca cubrir: borrar la cuenta y crear otra en el mismo navegador).
create table if not exists public.dispositivos_sancionados (
  huella text not null check (huella ~ '^[0-9a-f]{64}$'),
  sancion_id uuid references public.sanciones(id) on delete set null,
  permanente boolean not null,
  total boolean not null,
  motivo text not null check (char_length(motivo) <= 400),
  fin_at timestamptz,
  levantada_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dispositivos_sancionados_huella_idx on public.dispositivos_sancionados (huella) where levantada_at is null;
create index if not exists dispositivos_sancionados_sancion_idx on public.dispositivos_sancionados (sancion_id);
alter table public.dispositivos_sancionados enable row level security;
revoke all on table public.dispositivos_sancionados from anon, authenticated;

-- Notificación «sancion» (aplicada, levantada, respuesta a la apelación).
do $$
declare v_nombre text;
begin
  select conname into v_nombre from pg_constraint
  where conrelid = 'public.notificaciones'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%tipo = ANY%';
  if v_nombre is not null then execute format('alter table public.notificaciones drop constraint %I', v_nombre); end if;
end $$;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'respuesta', 'respuesta_a_respuesta', 'mensaje', 'intercambio', 'noticia', 'aporte', 'moderacion', 'denuncia', 'recordatorio', 'sancion'
));

-- Limpieza: dispositivos sin uso hace 180 días y bloqueos de dispositivo vencidos o levantados hace más de 30 días.
select cron.unschedule('medmar-sanciones-limpieza') where exists (select 1 from cron.job where jobname = 'medmar-sanciones-limpieza');
select cron.schedule('medmar-sanciones-limpieza', '35 6 * * *', $$
  delete from public.dispositivos_cuenta where ultimo_uso < now() - interval '180 days';
  delete from public.dispositivos_sancionados
   where coalesce(levantada_at, case when permanente then null else fin_at end) < now() - interval '30 days';
$$);

-- Revertir:
--   select cron.unschedule('medmar-sanciones-limpieza');
--   drop table public.dispositivos_sancionados, public.dispositivos_cuenta, public.apelaciones, public.sanciones;
--   delete from public.notificaciones where tipo = 'sancion';
--   (y volver a crear notificaciones_tipo_check sin 'sancion', como en 20261127140000)
