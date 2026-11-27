-- Filtro automático de contenido (ADR 0007): lo que retira el filtro se inserta directo en la papelera
-- (eliminado_at con valor). Una respuesta así no tiene que avisarle a nadie que «X respondió».
-- Igual que antes, salvo la primera línea del bloque.
--
-- Revertir: volver a crear la función sin la condición sobre eliminado_at.

create or replace function public.notificar_respuesta()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_hilo_autor uuid;
  v_titulo text;
  v_padre_autor uuid;
  v_actor text;
begin
  if new.eliminado_at is not null then return null; end if;
  begin
    select autor_id, titulo into v_hilo_autor, v_titulo from public.hilos where id = new.hilo_id;
    v_actor := public.nombre_publico(new.autor_id, new.es_anonimo);

    if v_hilo_autor is not null and v_hilo_autor <> new.autor_id then
      perform public.notificar(v_hilo_autor, 'respuesta', v_actor, v_titulo, new.hilo_id);
    end if;

    if new.parent_id is not null then
      select autor_id into v_padre_autor from public.respuestas where id = new.parent_id;
      if v_padre_autor is not null and v_padre_autor <> new.autor_id
         and v_padre_autor is distinct from v_hilo_autor then
        perform public.notificar(v_padre_autor, 'respuesta_a_respuesta', v_actor, v_titulo, new.hilo_id);
      end if;
    end if;
  exception when others then
    raise warning 'notificar_respuesta: %', sqlerrm;
  end;
  return null;
end;
$function$;
