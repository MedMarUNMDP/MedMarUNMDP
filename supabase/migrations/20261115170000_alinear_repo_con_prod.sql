-- MedMar — Alinea el repo con producción (auditoría 2026-11, hallazgo A3).
-- Estos cambios se habían aplicado a mano en prod y la API los usa (profile_completed, is_sensitive, parent_id).
-- Idempotente: en producción no cambia nada; en una base nueva deja el esquema igual al de prod.

alter table public.profiles   add column if not exists profile_completed boolean not null default false;
alter table public.hilos      add column if not exists is_sensitive     boolean not null default false;
alter table public.respuestas add column if not exists parent_id        uuid;

create unique index if not exists profiles_pseudonimo_lower_uidx on public.profiles (lower(pseudonimo));
create unique index if not exists respuestas_id_hilo_uidx       on public.respuestas (id, hilo_id);
create index        if not exists respuestas_parent_fecha_idx   on public.respuestas (parent_id, created_at)
  where parent_id is not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'respuestas_parent_same_hilo_fk') then
    alter table public.respuestas
      add constraint respuestas_parent_same_hilo_fk
      foreign key (parent_id, hilo_id) references public.respuestas (id, hilo_id) on delete cascade;
  end if;
end $$;
