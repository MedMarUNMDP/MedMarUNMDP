-- Notificaciones nuevas:
--   'moderacion'   → a quien publicó, cuando la moderación quita su contenido (con el motivo). La crea la API.
--   'denuncia'     → aviso agrupado a moderadores cuando llega una denuncia. La crea la API.
--   'recordatorio' → avisos automáticos diarios (recordatorios_diarios, pg_cron 12:00 UTC = 9:00 en Argentina):
--                    aviso de Compra venta por vencer y vencido, solicitud de intercambio por vencer y cuenta por borrarse.
--
-- Revertir:
--   select cron.unschedule('medmar-recordatorios-diarios'); drop function public.recordatorios_diarios();
--   delete from public.notificaciones where tipo in ('moderacion','denuncia','recordatorio');
--   alter table public.notificaciones drop constraint notificaciones_tipo_check, add constraint notificaciones_tipo_check
--     check (tipo in ('respuesta','respuesta_a_respuesta','mensaje','intercambio','noticia','aporte'));

do $$
declare v_nombre text;
begin
  select conname into v_nombre from pg_constraint
  where conrelid = 'public.notificaciones'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%tipo = ANY%';
  if v_nombre is not null then execute format('alter table public.notificaciones drop constraint %I', v_nombre); end if;
end $$;
alter table public.notificaciones add constraint notificaciones_tipo_check check (tipo in (
  'respuesta', 'respuesta_a_respuesta', 'mensaje', 'intercambio', 'noticia', 'aporte', 'moderacion', 'denuncia', 'recordatorio'
));

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

  return jsonb_build_object('avisos_por_vencer', n_por_vencer, 'avisos_vencidos', n_vencidos,
                            'solicitudes', n_solicitudes, 'bajas', n_bajas);
end;
$$;

revoke all on function public.recordatorios_diarios() from public, anon, authenticated;

select cron.unschedule('medmar-recordatorios-diarios') where exists (select 1 from cron.job where jobname = 'medmar-recordatorios-diarios');
select cron.schedule('medmar-recordatorios-diarios', '0 12 * * *', $$select public.recordatorios_diarios()$$);
