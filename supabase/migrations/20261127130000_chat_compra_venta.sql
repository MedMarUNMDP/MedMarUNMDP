-- Chat interno de Compra venta (clasificados): reutiliza conversaciones/conversacion_participantes/mensajes del chat de
-- intercambios. Una conversación por aviso y por persona interesada; la crea la API (acción contactarClasificado).
-- Hereda todo lo del chat: RLS por participante, Realtime, notificación en la campana (notificar_mensaje usa `materia`,
-- que acá es «Compra venta · <título>») y borrado a los 14 días sin actividad (cleanup_expired_data).
--
-- Revertir:
--   drop index if exists public.conversaciones_clasificado_interesado_idx;
--   alter table public.conversaciones drop column clasificado_id, drop column interesado_id;

alter table public.conversaciones
  add column if not exists clasificado_id uuid references public.clasificados(id) on delete set null,
  add column if not exists interesado_id uuid references auth.users(id) on delete cascade;

create unique index if not exists conversaciones_clasificado_interesado_idx
  on public.conversaciones (clasificado_id, interesado_id) where clasificado_id is not null;
create index if not exists conversaciones_interesado_idx on public.conversaciones (interesado_id) where interesado_id is not null;

comment on column public.conversaciones.clasificado_id is 'Aviso de Compra venta del que surgió el chat (null en chats de intercambio o si se borró el aviso)';
comment on column public.conversaciones.interesado_id is 'Quien escribió al aviso; no null = chat de Compra venta';
