-- 1) Papelera: lo que quita la moderación (publicaciones, respuestas, material, avisos de Compra venta) no se borra en
--    el momento: queda oculto 7 días con eliminado_at/eliminado_por/motivo y se puede restaurar (listarPapelera,
--    restaurarPapelera). purgar_papelera() lo borra definitivamente (pg_cron diario).
-- 2) Grupos de período de moderación: cada moderador vence en la fecha de su grupo o en una fecha individual.
--    Reemplaza la fecha única de periodo_moderacion (que se elimina: no llegó a usarse).
-- 3) Emparejamiento por QR: un dispositivo ya autorizado genera un código de un solo uso (3 min) para autorizar un
--    celular de la misma cuenta. Se guarda solo el hash del código.
--
-- Revertir: ver al final.

-- ---------- 1) Papelera ----------
alter table public.hilos
  add column if not exists eliminado_at timestamptz,
  add column if not exists eliminado_por uuid references auth.users(id) on delete set null,
  add column if not exists motivo_eliminacion text check (char_length(motivo_eliminacion) <= 200);
alter table public.respuestas
  add column if not exists eliminado_at timestamptz,
  add column if not exists eliminado_por uuid references auth.users(id) on delete set null,
  add column if not exists motivo_eliminacion text check (char_length(motivo_eliminacion) <= 200);
alter table public.materiales
  add column if not exists eliminado_at timestamptz,
  add column if not exists eliminado_por uuid references auth.users(id) on delete set null,
  add column if not exists motivo_eliminacion text check (char_length(motivo_eliminacion) <= 200);
alter table public.clasificados
  add column if not exists eliminado_at timestamptz,
  add column if not exists eliminado_por uuid references auth.users(id) on delete set null,
  add column if not exists motivo_eliminacion text check (char_length(motivo_eliminacion) <= 200);

create index if not exists hilos_papelera_idx on public.hilos (eliminado_at) where eliminado_at is not null;
create index if not exists respuestas_papelera_idx on public.respuestas (eliminado_at) where eliminado_at is not null;
create index if not exists materiales_papelera_idx on public.materiales (eliminado_at) where eliminado_at is not null;
create index if not exists clasificados_papelera_idx on public.clasificados (eliminado_at) where eliminado_at is not null;

-- Lo que está en la papelera no se ve desde el navegador (el foro se lee con el cliente del usuario).
drop policy if exists hilos_select_auth on public.hilos;
create policy hilos_select_auth on public.hilos for select to authenticated using (eliminado_at is null);
drop policy if exists respuestas_select_auth on public.respuestas;
create policy respuestas_select_auth on public.respuestas for select to authenticated using (eliminado_at is null);

-- Contador de respuestas: solo cuenta las visibles (al ir a la papelera resta, al restaurar suma).
create or replace function public.adjust_hilo_response_count()
returns trigger
language plpgsql
security definer
set search_path to ''
as $f$
begin
  if tg_op = 'INSERT' then
    if new.eliminado_at is null then update public.hilos set respuestas = respuestas + 1 where id = new.hilo_id; end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.eliminado_at is null then update public.hilos set respuestas = greatest(respuestas - 1, 0) where id = old.hilo_id; end if;
    return old;
  else
    if old.eliminado_at is null and new.eliminado_at is not null then
      update public.hilos set respuestas = greatest(respuestas - 1, 0) where id = new.hilo_id;
    elsif old.eliminado_at is not null and new.eliminado_at is null then
      update public.hilos set respuestas = respuestas + 1 where id = new.hilo_id;
    end if;
    return new;
  end if;
end;
$f$;
drop trigger if exists respuestas_count_after on public.respuestas;
create trigger respuestas_count_after after insert or delete or update of eliminado_at on public.respuestas
  for each row execute function public.adjust_hilo_response_count();

create or replace function public.purgar_papelera()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $f$
declare n_h integer; n_r integer; n_m integer; n_c integer;
begin
  delete from public.respuestas where eliminado_at < now() - interval '7 days'; get diagnostics n_r = row_count;
  delete from public.hilos where eliminado_at < now() - interval '7 days'; get diagnostics n_h = row_count;
  delete from public.materiales where eliminado_at < now() - interval '7 days'; get diagnostics n_m = row_count;
  delete from public.clasificados where eliminado_at < now() - interval '7 days'; get diagnostics n_c = row_count;
  delete from public.emparejamientos_moderacion where expira_at < now() - interval '1 day';
  return jsonb_build_object('hilos', n_h, 'respuestas', n_r, 'materiales', n_m, 'clasificados', n_c);
end;
$f$;

-- ---------- 2) Grupos de período ----------
create table if not exists public.grupos_moderacion (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 60),
  fecha_corte timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.grupos_moderacion enable row level security;
revoke all on table public.grupos_moderacion from anon, authenticated;

alter table public.profiles add column if not exists grupo_moderacion_id uuid references public.grupos_moderacion(id) on delete set null;

drop table if exists public.periodo_moderacion;

-- ---------- 3) Emparejamiento por QR ----------
create table if not exists public.emparejamientos_moderacion (
  codigo_hash text primary key check (codigo_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  padre_id uuid not null references public.llaves_moderacion(id) on delete cascade,
  creado_por_llave uuid references public.llaves_moderacion(id) on delete set null,
  expira_at timestamptz not null,
  usado_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.emparejamientos_moderacion enable row level security;
revoke all on table public.emparejamientos_moderacion from anon, authenticated;

revoke all on function public.purgar_papelera() from public, anon, authenticated;
select cron.unschedule('medmar-papelera-diaria') where exists (select 1 from cron.job where jobname = 'medmar-papelera-diaria');
select cron.schedule('medmar-papelera-diaria', '45 6 * * *', $$select public.purgar_papelera()$$);

-- Revertir:
--   select cron.unschedule('medmar-papelera-diaria'); drop function public.purgar_papelera();
--   drop table public.emparejamientos_moderacion; alter table public.profiles drop column grupo_moderacion_id;
--   drop table public.grupos_moderacion;
--   (políticas) create policy ... using (true) en hilos/respuestas; trigger respuestas_count_after solo insert/delete;
--   alter table public.{hilos,respuestas,materiales,clasificados} drop column eliminado_at, drop column eliminado_por,
--     drop column motivo_eliminacion;
