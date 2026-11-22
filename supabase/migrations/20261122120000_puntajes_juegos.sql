-- Ranking de los juegos (Inmune Survivors v3.8 en adelante).
-- Guarda el MEJOR puntaje de cada usuario por juego y modo (una fila por usuario/juego/modo: la tabla
-- crece con los jugadores, no con las partidas). Las escrituras pasan solo por la acción guardarPuntaje
-- de la Edge Function api (cliente admin, con validación de plausibilidad y rate limit): no hay políticas
-- de insert/update/delete (ADR 0002). Lectura: usuarios autenticados.
--
-- No es destructiva. Idempotente. Tiene `revoke` (el MCP lo rechaza): ejecutarla entera en
-- Supabase Dashboard > SQL Editor.

create table if not exists public.puntajes_juegos (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  juego       text        not null check (juego ~ '^[a-z0-9-]{2,40}$'),
  modo        text        not null check (modo ~ '^[a-z0-9.-]{2,40}$'),
  puntaje     integer     not null check (puntaje >= 0),
  segundos    integer     not null check (segundos >= 0),
  detalle     jsonb       not null default '{}'::jsonb check (pg_column_size(detalle) <= 2048),
  partidas    integer     not null default 1 check (partidas >= 1),
  logrado_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, juego, modo)
);

comment on table public.puntajes_juegos is
  'Mejor puntaje por usuario, juego y modo. Solo escribe la API (guardarPuntaje).';

-- Orden del ranking: puntaje descendente; a igual puntaje, gana quien lo logró primero.
create index if not exists puntajes_juegos_ranking_idx
  on public.puntajes_juegos (juego, modo, puntaje desc, logrado_at asc);

drop trigger if exists puntajes_juegos_updated_at on public.puntajes_juegos;
create trigger puntajes_juegos_updated_at
before update on public.puntajes_juegos
for each row execute function public.set_updated_at();

alter table public.puntajes_juegos enable row level security;

drop policy if exists puntajes_juegos_select_autenticados on public.puntajes_juegos;
create policy puntajes_juegos_select_autenticados
  on public.puntajes_juegos for select to authenticated
  using (true);

-- Defensa en profundidad: además de RLS sin políticas de escritura, sin privilegios de escritura para los roles
-- del navegador. Lectura solo de las columnas que usa el ranking (no `detalle` ni `partidas`).
revoke all on public.puntajes_juegos from anon, authenticated;
grant select (user_id, juego, modo, puntaje, segundos, logrado_at) on public.puntajes_juegos to authenticated;

-- Ranking de un juego y modo: el top (hasta 100), la fila del usuario pedido y las que coincidan con la
-- búsqueda por pseudónimo, cada una con su posición real y el total de jugadores.
-- security invoker: respeta RLS (solo autenticados leen). p_buscar llega ya escapado para LIKE desde la API.
create or replace function public.ranking_juego(
  p_juego   text,
  p_modo    text,
  p_limite  integer default 20,
  p_usuario uuid    default null,
  p_buscar  text    default null
)
returns table (
  posicion   bigint,
  user_id    uuid,
  pseudonimo text,
  foto_url   text,
  puntaje    integer,
  segundos   integer,
  logrado_at timestamptz,
  total      bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with r as (
    select p.user_id, p.puntaje, p.segundos, p.logrado_at,
           row_number() over (order by p.puntaje desc, p.logrado_at asc) as posicion,
           count(*) over () as total
    from public.puntajes_juegos p
    where p.juego = p_juego and p.modo = p_modo
  )
  select r.posicion, r.user_id, pr.pseudonimo, pr.foto_url, r.puntaje, r.segundos, r.logrado_at, r.total
  from r
  join public.profiles pr on pr.id = r.user_id
  where r.posicion <= least(greatest(coalesce(p_limite, 20), 1), 100)
     or r.user_id = p_usuario
     or (p_buscar is not null and length(p_buscar) >= 2 and pr.pseudonimo ilike '%' || p_buscar || '%')
  order by r.posicion
  limit 160;
$$;

revoke all on function public.ranking_juego(text, text, integer, uuid, text) from public, anon;
grant execute on function public.ranking_juego(text, text, integer, uuid, text) to authenticated;
