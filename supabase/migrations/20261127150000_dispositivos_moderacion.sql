-- Dispositivos autorizados para moderar (ADR 0005). El archivo de llave + su contraseña ya no se piden en cada
-- desbloqueo: sirven para AUTORIZAR un dispositivo. Ese navegador crea su propio par ECDSA (privada no exportable,
-- guardada en IndexedDB) y lo registra firmado por la llave del archivo (acción autorizarDispositivo). Desde ahí,
-- con la misma cuenta, el desbloqueo es automático. Cada dispositivo es una fila hija de la llave del archivo.
--
-- Revertir:
--   update public.llaves_moderacion set estado = 'revocada', revocada_at = now() where tipo = 'dispositivo';
--   alter table public.llaves_moderacion drop column padre_id, drop column tipo;

alter table public.llaves_moderacion
  add column if not exists tipo text not null default 'archivo' check (tipo in ('archivo', 'dispositivo')),
  add column if not exists padre_id uuid references public.llaves_moderacion(id) on delete cascade;

create index if not exists llaves_moderacion_padre_idx on public.llaves_moderacion (padre_id) where padre_id is not null;

comment on column public.llaves_moderacion.tipo is 'archivo = llave del archivo .medmarkey; dispositivo = llave de un navegador autorizado por un archivo';
comment on column public.llaves_moderacion.padre_id is 'Para dispositivos: la llave de archivo que lo autorizó (si se revoca, caen sus dispositivos)';
