-- 1) Reportes (bugs, sugerencias, correcciones de contenido) de la web y del juego. Antes iban a una planilla por
--    Apps Script que nunca se instaló. Son anónimos: no se guarda quién los mandó (la API usa la sesión solo para el
--    rate limit). Sin grants: solo la API lee y escribe (enviarReporte, listarReportes, gestionarReporte).
-- 2) profiles.mails_moderacion: el equipo recibe por mail los avisos de denuncias, aportes y reportes
--    (notificacion_queue → maintenance → Gmail). Cada persona lo puede apagar en Moderación → Mi llave.
--
-- Revertir: ver al final.

create table if not exists public.reportes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('bug', 'sugerencia', 'correccion', 'otro')),
  seccion text not null check (char_length(seccion) between 1 and 60),
  mensaje text not null check (char_length(mensaje) between 10 and 2000),
  origen text not null default 'web' check (origen in ('web', 'juego')),
  version text check (char_length(version) <= 80),
  detalle text check (char_length(detalle) <= 200),
  dispositivo text check (char_length(dispositivo) <= 200),
  estado text not null default 'nuevo' check (estado in ('nuevo', 'revisando', 'resuelto', 'descartado')),
  nota text check (char_length(nota) <= 400),
  revisado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reportes_estado_idx on public.reportes (estado, created_at desc);
alter table public.reportes enable row level security;
revoke all on table public.reportes from anon, authenticated;

alter table public.profiles add column if not exists mails_moderacion boolean not null default true;

-- Los reportes cerrados se borran a los 180 días.
select cron.unschedule('medmar-reportes-limpieza') where exists (select 1 from cron.job where jobname = 'medmar-reportes-limpieza');
select cron.schedule('medmar-reportes-limpieza', '20 6 * * *',
  $$delete from public.reportes where estado in ('resuelto', 'descartado') and updated_at < now() - interval '180 days'$$);

-- Revertir:
--   select cron.unschedule('medmar-reportes-limpieza');
--   drop table public.reportes;
--   alter table public.profiles drop column mails_moderacion;
