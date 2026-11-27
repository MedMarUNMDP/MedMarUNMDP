-- Bienvenida como novedad: qué versión de la bienvenida (web/ayuda/bienvenida.md) ya vio cada cuenta.
-- La web la muestra al entrar si no coincide con BIENVENIDA_VERSION de app.js; la API la guarda con marcarBienvenida.
-- profiles ya tiene RLS y solo se escribe desde la API (cliente admin): no hacen falta políticas nuevas.
--
-- Revertir: alter table public.profiles drop column bienvenida_version;

alter table public.profiles add column if not exists bienvenida_version text;

comment on column public.profiles.bienvenida_version is
  'Versión de la bienvenida que la cuenta ya vio (BIENVENIDA_VERSION de web/js/app.js). Null: nunca la vio.';
