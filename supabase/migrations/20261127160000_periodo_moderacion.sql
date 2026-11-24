-- Período de moderación: los moderadores tienen fecha de vencimiento (por ejemplo, las elecciones del centro de
-- estudiantes). Al pasar la fecha dejan de moderar solos, salvo que un admin los haya confirmado para el período
-- siguiente (acción confirmarModerador). La fecha de corte la fija un admin (fijarPeriodoModeracion).
-- Además, cada moderador puede renunciar al rol en el momento (renunciarModeracion).
-- Los administradores no vencen.
--
-- Revertir:
--   create or replace function public.is_moderator(uid uuid) returns boolean language sql stable security definer
--     set search_path to '' as $f$ select coalesce((select is_moderator from public.profiles where id = uid), false); $f$;
--   alter table public.profiles drop column moderador_vence_at; drop table public.periodo_moderacion;
--   (y volver a crear recordatorios_diarios desde 20261127140000_notificaciones_nuevas.sql)

alter table public.profiles add column if not exists moderador_vence_at timestamptz;
comment on column public.profiles.moderador_vence_at is 'Hasta cuándo vale el rol de moderador (null = sin vencimiento). Ver periodo_moderacion';

-- Una sola fila con la fecha de corte vigente. Solo la API la lee y escribe.
create table if not exists public.periodo_moderacion (
  id boolean primary key default true check (id),
  fecha_corte timestamptz,
  descripcion text check (char_length(descripcion) <= 80),
  actualizado_por uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.periodo_moderacion enable row level security;
revoke all on table public.periodo_moderacion from anon, authenticated;
insert into public.periodo_moderacion (id) values (true) on conflict (id) do nothing;

-- El rol de moderador vencido deja de contar en todos lados (políticas RLS, API y web).
create or replace function public.is_moderator(uid uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $f$
  select coalesce((select is_moderator and (moderador_vence_at is null or moderador_vence_at > now())
                   from public.profiles where id = uid), false);
$f$;

create or replace function public.recordatorios_diarios()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  n_por_vencer integer := 0;
  n_vencidos integer := 0;
  n_solicitudes integer := 0;
  n_bajas integer := 0;
  n_mods integer := 0;
begin
  -- Cada consulta mira una ventana de 24 h: como corre una vez por día, cada cosa se avisa una sola vez.

  -- Avisos de Compra venta que vencen en 3 días.
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select c.autor_id, 'recordatorio', left('Tu aviso «' || c.titulo || '» vence en 3 días', 160),
         'Si todavía lo ofrecés, renovalo desde Compra venta → Tus avisos.', '/?vista=clasificados', c.id
  from public.clasificados c
  where c.activo and c.expira_at > now() + interval '2 days' and c.expira_at <= now() + interval '3 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;
  get diagnostics n_por_vencer = row_count;

  -- Avisos que vencieron en las últimas 24 h (reemplaza el «vence en 3 días» si no se leyó).
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select c.autor_id, 'recordatorio', left('Tu aviso «' || c.titulo || '» venció', 160),
         'Ya no se muestra en Compra venta. Podés volver a publicarlo desde Tus avisos.', '/?vista=clasificados', c.id
  from public.clasificados c
  where c.activo and c.expira_at <= now() and c.expira_at > now() - interval '1 day'
  on conflict (user_id, tipo, ref_id) where not leida
  do update set contexto = excluded.contexto, cuerpo = excluded.cuerpo, updated_at = now();
  get diagnostics n_vencidos = row_count;

  -- Solicitudes de intercambio activas que se borran en 2 días (cleanup_expired_data las borra a los 14).
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select s.user_id, 'recordatorio', left('Tu solicitud de ' || s.materia || ' vence en 2 días', 160),
         'Las solicitudes sin intercambio se borran a los 14 días. Si seguís buscando, volvé a publicarla cuando venza.',
         '/?vista=intercambios', s.id
  from public.solicitudes s
  where s.status = 'activa' and s.created_at < now() - interval '12 days' and s.created_at >= now() - interval '13 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;
  get diagnostics n_solicitudes = row_count;

  -- Cuentas que se borran en 3 días (baja pedida desde el perfil).
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select p.id, 'recordatorio', 'Tu cuenta se elimina en 3 días',
         'Si te arrepentiste, entrá a Perfil y tocá «Cancelar la eliminación».', '/?vista=configuracion', p.id
  from public.profiles p
  where p.baja_programada_para > now() + interval '2 days' and p.baja_programada_para <= now() + interval '3 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;
  get diagnostics n_bajas = row_count;

  -- Moderadores cuyo rol vence en 14 días: aviso a la persona y a cada admin (para que lo confirme o no).
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select p.id, 'recordatorio',
         'Tu rol de moderación vence el ' || to_char(p.moderador_vence_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'),
         'Termina el período de moderación. Si vas a seguir, pedile a un administrador que te confirme para el próximo.',
         '/?vista=moderacion', p.id
  from public.profiles p
  where p.is_moderator and not p.is_admin
    and p.moderador_vence_at > now() + interval '13 days' and p.moderador_vence_at <= now() + interval '14 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;
  get diagnostics n_mods = row_count;

  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select a.id, 'recordatorio',
         left('El rol de moderación de ' || p.pseudonimo || ' vence el ' || to_char(p.moderador_vence_at at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY'), 160),
         'Si sigue en el equipo, confirmalo en Moderación → Equipo. Si no, no hagas nada: pierde el rol solo.',
         '/?vista=moderacion', p.id
  from public.profiles p
  cross join public.profiles a
  where a.is_admin and p.is_moderator and not p.is_admin
    and p.moderador_vence_at > now() + interval '13 days' and p.moderador_vence_at <= now() + interval '14 days'
  on conflict (user_id, tipo, ref_id) where not leida do nothing;

  -- Moderadores cuyo rol venció en las últimas 24 h.
  insert into public.notificaciones (user_id, tipo, contexto, cuerpo, link, ref_id)
  select p.id, 'recordatorio', 'Tu rol de moderación venció',
         'Terminó el período y no fue confirmado. Si seguís en el equipo, pedile a un administrador que te confirme.',
         '/?vista=moderacion', p.id
  from public.profiles p
  where p.is_moderator and not p.is_admin
    and p.moderador_vence_at <= now() and p.moderador_vence_at > now() - interval '1 day'
  on conflict (user_id, tipo, ref_id) where not leida
  do update set contexto = excluded.contexto, cuerpo = excluded.cuerpo, updated_at = now();

  return jsonb_build_object('avisos_por_vencer', n_por_vencer, 'avisos_vencidos', n_vencidos,
                            'solicitudes', n_solicitudes, 'bajas', n_bajas, 'moderadores', n_mods);
end;
$$;

revoke all on function public.recordatorios_diarios() from public, anon, authenticated;
