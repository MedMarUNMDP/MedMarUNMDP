# 0002 — Las escrituras a la base pasan solo por la Edge Function `api`

- **Fecha**: 2026-11-15
- **Estado**: aceptada

## Contexto

La web siempre escribe a través de la Edge Function `api`, que valida la entrada, aplica rate limit e
idempotencia y usa el cliente admin. Pero las tablas tenían también políticas RLS de `INSERT/UPDATE/DELETE`
para `authenticated`, y el bucket `profile-photos` aceptaba subidas directas. Con la publishable key (que es
pública) cualquier usuario logueado podía saltear la API: escribir su `foto_url` con cualquier texto (había un
XSS almacenado al renderizarla), crear hilos sin validar enlaces ni rate limit, o subir archivos de cualquier tipo.

## Decisión

- Se borran las políticas RLS de escritura y se revocan `insert/update/delete/truncate` de `anon` y
  `authenticated` en `public`. Las políticas de **lectura** se mantienen: la API lee con el cliente del usuario
  (respeta RLS) y Realtime las necesita.
- El bucket `profile-photos` no tiene políticas: las subidas las hace la API con la secret key, y las fotos se
  sirven por URL pública (los buckets públicos no necesitan una política de SELECT para eso).
- Las funciones `SECURITY DEFINER` que solo usa la API se ejecutan únicamente con `service_role`.

## Consecuencias

- Toda acción nueva que escriba datos va en la API (skill `/nueva-accion-api`), con el cliente admin y
  validando permisos a mano. Una tabla nueva no necesita políticas de escritura.
- Si en el futuro el frontend necesita escribir directo (por ejemplo, Storage con uploads grandes), hay que
  agregar una política específica y documentarla acá.
