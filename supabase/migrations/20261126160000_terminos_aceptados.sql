-- Aceptación de los Términos y Condiciones y de la Política de Privacidad (web/terminos/, web/privacidad/).
-- Guarda qué versión aceptó cada cuenta y cuándo: prueba del consentimiento expreso (Ley 25.326, arts. 5 y 12).
-- Solo la escribe la API (acción aceptarTerminos, cliente admin). No hace falta grant nuevo: profiles ya tiene RLS
-- y las columnas nuevas no se exponen en ninguna política de escritura del navegador.
alter table public.profiles
  add column if not exists terminos_version text,
  add column if not exists terminos_aceptados_at timestamptz;

comment on column public.profiles.terminos_version is 'Versión de Términos y Privacidad aceptada (TERMINOS_VERSION de la API)';
comment on column public.profiles.terminos_aceptados_at is 'Momento en que se aceptó esa versión';
