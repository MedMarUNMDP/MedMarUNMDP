-- Moderación del ranking: esconder un puntaje sin borrarlo.
-- Un moderador (con llave, acción ocultarPuntaje de la API) puede esconder el puntaje de alguien: deja de verse en
-- el ranking y no cuenta para las posiciones, pero queda guardado y se puede volver a mostrar. Si la persona
-- vuelve a jugar, el puntaje sigue escondido. Para anularlo del todo está quitarPuntaje (borra la fila).
--
-- No es destructiva. Idempotente. Tiene `grant`/`create or replace`: ejecutarla entera en
-- Supabase Dashboard > SQL Editor.
--
-- Reversión:
--   create or replace function public.ranking_juego(...)  -- la versión de 20261122120000_puntajes_juegos.sql
--   alter table public.puntajes_juegos drop column if exists oculto, drop column if exists oculto_at;

alter table public.puntajes_juegos
  add column if not exists oculto    boolean     not null default false,
  add column if not exists oculto_at timestamptz;

-- ranking_juego es security invoker: el filtro necesita poder leer la columna.
grant select (oculto) on public.puntajes_juegos to authenticated;

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
set search_path = ''
as $$
  with r as (
    select p.user_id, p.puntaje, p.segundos, p.logrado_at,
           row_number() over (order by p.puntaje desc, p.logrado_at asc) as posicion,
           count(*) over () as total
    from public.puntajes_juegos p
    where p.juego = p_juego and p.modo = p_modo and not p.oculto
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
