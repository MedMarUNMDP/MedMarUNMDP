-- 1) Baja de cuenta por la propia persona, con 30 días para arrepentirse (acciones solicitarBaja / cancelarBaja).
--    Cuando vence el plazo, la Edge Function maintenance borra el usuario de Auth (todo lo demás cae en cascada) y sus fotos.
-- 2) Clasificados: sección aparte del foro para ventas y servicios de estudiantes a título personal (resúmenes propios,
--    clases particulares, equipo usado). Solo la API lee y escribe (cliente admin): sin grants para anon/authenticated.
-- 3) Denuncias de clasificados.
-- 4) Tareas de pg_cron: limpieza de clasificados vencidos y disparo diario de las bajas vencidas.
--
-- Revertir:
--   select cron.unschedule('medmar-bajas-diario'); select cron.unschedule('medmar-clasificados-limpieza');
--   drop table public.clasificados;
--   alter table public.profiles drop column baja_solicitada_at, drop column baja_programada_para;
--   alter table public.denuncias drop constraint denuncias_tipo_chk,
--     add constraint denuncias_tipo_chk check (tipo in ('hilo', 'respuesta', 'material'));

-- 1) Baja programada
alter table public.profiles
  add column if not exists baja_solicitada_at timestamptz,
  add column if not exists baja_programada_para timestamptz;
create index if not exists profiles_baja_programada_idx on public.profiles (baja_programada_para)
  where baja_programada_para is not null;
comment on column public.profiles.baja_programada_para is 'Si no es null, la cuenta se borra en esa fecha (30 días después de pedirlo) salvo que se cancele';

-- 2) Clasificados
create table if not exists public.clasificados (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null,
  titulo text not null,
  descripcion text not null,
  precio text,
  contacto text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expira_at timestamptz not null default (now() + interval '60 days'),
  operation_id uuid not null unique,
  constraint clasificados_categoria_chk check (categoria in ('resumenes', 'clases', 'equipo', 'libros', 'servicios', 'otros')),
  constraint clasificados_titulo_chk check (char_length(titulo) between 3 and 100),
  constraint clasificados_descripcion_chk check (char_length(descripcion) between 10 and 1500),
  constraint clasificados_precio_chk check (precio is null or char_length(precio) <= 40),
  constraint clasificados_contacto_chk check (contacto is null or char_length(contacto) <= 120)
);
create index if not exists clasificados_lista_idx on public.clasificados (created_at desc) where activo;
create index if not exists clasificados_autor_idx on public.clasificados (autor_id);

alter table public.clasificados enable row level security;
-- Sin políticas: nadie lee ni escribe desde el navegador; todo pasa por la API (cliente admin).
revoke all on table public.clasificados from anon, authenticated;

-- 3) Denuncias de clasificados
alter table public.denuncias drop constraint if exists denuncias_tipo_chk;
alter table public.denuncias add constraint denuncias_tipo_chk check (tipo in ('hilo', 'respuesta', 'material', 'clasificado'));

-- 4) Tareas programadas
-- Clasificados: se borran 30 días después de vencidos (sus denuncias pendientes quedan sin publicación y se ven como tal).
select cron.unschedule('medmar-clasificados-limpieza') where exists (select 1 from cron.job where jobname = 'medmar-clasificados-limpieza');
select cron.schedule('medmar-clasificados-limpieza', '15 6 * * *',
  $$delete from public.clasificados where expira_at < now() - interval '30 days'$$);

-- Bajas: una vez por día, solo si hay alguna vencida, se invoca maintenance (que borra con la API de Auth).
select cron.unschedule('medmar-bajas-diario') where exists (select 1 from cron.job where jobname = 'medmar-bajas-diario');
select cron.schedule('medmar-bajas-diario', '30 6 * * *', $$
  select net.http_post(
    url := 'https://ekfwdrsehhmrqxxlefyx.supabase.co/functions/v1/maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-medmar-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'medmar_cron_secret')
    ),
    body := '{"tarea":"bajas"}'::jsonb,
    timeout_milliseconds := 30000
  )
  where exists (select 1 from public.profiles where baja_programada_para <= now())
$$);
