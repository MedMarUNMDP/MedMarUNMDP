-- Encuestas en el foro: una publicación puede llevar una encuesta (2 a 6 opciones), de voto anónimo o público,
-- de una o varias respuestas y con cierre opcional. Igual que el resto del foro, las escrituras y las lecturas pasan
-- solo por la API (crearHilo, verHilo, votarEncuesta): sin grants para anon/authenticated (ADR 0002).
--
-- Voto anónimo: la API igual guarda quién votó (hace falta para que cada persona vote una vez y pueda cambiar su
-- voto), pero nunca lo devuelve: solo los totales. En una encuesta pública, la API devuelve los pseudónimos de
-- quienes eligieron cada opción. El tipo (anónima o pública) no se puede cambiar después de crearla.
--
-- Una fila por persona y encuesta (las opciones elegidas en un arreglo): votar es un upsert atómico, así que dos
-- votos simultáneos no pueden dejar varias opciones en una encuesta de respuesta única.
--
-- No es destructiva. Idempotente. Tiene `revoke`: ejecutarla entera en Supabase Dashboard > SQL Editor.
--
-- Reversión:
--   drop table if exists public.votos_encuesta;
--   drop table if exists public.encuestas;

create table if not exists public.encuestas (
  id         uuid        primary key default gen_random_uuid(),
  hilo_id    uuid        not null unique references public.hilos(id) on delete cascade,
  pregunta   text        not null check (length(pregunta) between 1 and 200),
  opciones   text[]      not null check (array_length(opciones, 1) between 2 and 6),
  anonima    boolean     not null default true,
  multiple   boolean     not null default false,
  cierra_at  timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.encuestas is
  'Encuesta de una publicación del foro (2 a 6 opciones). Solo la API lee y escribe.';

create table if not exists public.votos_encuesta (
  encuesta_id uuid        not null references public.encuestas(id) on delete cascade,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  opciones    smallint[]  not null check (cardinality(opciones) between 1 and 6 and opciones <@ array[0,1,2,3,4,5]::smallint[]),
  updated_at  timestamptz not null default now(),
  primary key (encuesta_id, user_id)
);

comment on table public.votos_encuesta is
  'Voto de cada persona en una encuesta del foro. En las anónimas, la API nunca devuelve user_id. Solo la API lee y escribe.';

create index if not exists votos_encuesta_usuario_idx on public.votos_encuesta (user_id);

alter table public.encuestas enable row level security;
alter table public.votos_encuesta enable row level security;
revoke all on public.encuestas from anon, authenticated;
revoke all on public.votos_encuesta from anon, authenticated;
