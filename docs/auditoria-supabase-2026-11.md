# Auditoría Supabase de producción — noviembre 2026

- **Proyecto**: `ekfwdrsehhmrqxxlefyx` (plan Free, Postgres 17.6)
- **Fecha**: 2026-11-15
- **Método**: MCP `supabase` en modo **solo lectura** (`list_tables`, `list_extensions`, `list_migrations`,
  `list_edge_functions`, `get_edge_function`, `get_advisors`, `query_logs` de las últimas 24 h y `execute_sql` con
  `SELECT` sobre catálogos). No se escribió nada en Supabase, no se desplegó nada y no se pusheó nada.
- **Comparado contra**: `supabase/migrations/20261101000000_schema_inicial.sql`, `…000100_realtime.sql`,
  `supabase/functions/api/index.ts` y `supabase/functions/maintenance/index.ts` (commit `fc778ca`).

> **Actualización 2026-11-15 (tarde):** los hallazgos A1–A3, M1–M5 y B-1, B-5, B-6 quedaron corregidos con las
> migraciones `20261115170000_alinear_repo_con_prod.sql` y `20261115180000_hardening_y_cron.sql`, el deploy de
> `api` v11 / `maintenance` v4 y el workflow de keep-alive. Quedan pendientes B-4 (contraseñas filtradas) y borrar el
> bucket `avatares`. Ver `docs/decisiones/0002-escrituras-solo-por-api.md`.

## Resumen ejecutivo

1. **El código de las Edge Functions coincide con el repo.** `api` (v10, desplegada el 2026-10-31) es idéntica byte a
   byte a `functions/api/index.ts`, y `maintenance` (v3, del 2026-09-24) coincide con `functions/maintenance/index.ts`.
2. **La base tiene bastante deriva respecto del repo**, por dos causas:
   - **Restos de un esquema anterior**: hay 50 funciones `public.*` que no figuran en el repo (`crear_hilo`,
     `listar_hilos`, `mailer_tomar`, `actualizar_foto`, `limpiar_expirados`, …). Usan tablas que ya no existen
     (`perfiles`, `config`, `cola_emails`, `rate_limits`, `foro_eventos`), así que están rotas, pero cualquier usuario
     logueado las puede llamar por `/rest/v1/rpc/…` y dos también sin login (`anon`). Ni la web ni la API las usan.
   - **Cambios aplicados a mano que nunca se pasaron a una migración**: 3 columnas que la API **sí usa**
     (`profiles.profile_completed`, `hilos.is_sensitive`, `respuestas.parent_id`), una FK y 3 índices. Si mañana se
     recrea la base desde `migrations/`, la API se rompe.
3. **Los trabajos programados no funcionan:**
   - El único job de `pg_cron` (`medmar-limpieza-diaria`) llama a la función vieja `limpiar_expirados()` y **falla
     todos los días desde el 2026-09-25** (`column "fecha" does not exist`). La limpieza real (`cleanup_expired_data`)
     no está programada en ningún lado.
   - **Nada invoca `maintenance`**: no hay job de cron ni `pg_net`, y en 24 h no hubo invocaciones. Hay 4 mails
     `intercambio_encontrado` en `pendiente`, con 0 intentos, desde el 2026-09-25. **Las notificaciones por mail no
     salen.**
4. **Uso muy por debajo de los límites del plan Free** (DB 14,6 MB de 500 MB; storage 59 KB de 1 GB; unas pocas
   invocaciones por día). El riesgo real del plan es que **el proyecto se pause por inactividad** en vacaciones o en
   semanas sin uso: hoy el único tráfico es el de una cuenta.
5. Los advisors de seguridad no muestran nada explotable sobre datos de usuarios, aparte de la superficie de RPC
   heredada y de `consume_rate_limit` (ver M1). El aviso "crítico" sobre `private.legacy_password_migrations` está
   mitigado en la práctica, porque el schema `private` no está expuesto y `anon`/`authenticated` no tienen `USAGE`.
   Igual conviene cerrarlo.

## Hallazgos priorizados

### Alto

**A1. Las notificaciones por mail nunca se procesan.**
- *Evidencia*: `cron.job` tiene un único job (`select public.limpiar_expirados()`) y ninguno llama a `maintenance`.
  La extensión `pg_net` no está instalada. `query_logs` de 24 h: 0 requests a `/functions/v1/maintenance`.
  `notificacion_queue` tiene 4 filas `pendiente`, `intentos = 0`, creadas el 2026-09-25 01:08 y 01:31 UTC.
- *Impacto*: cuando hay un match de intercambio, los alumnos no reciben el mail. `docs/deploy.md` y `CLAUDE.md` dan
  por hecho un cron que no existe.
- *Corrección*: (1) descartar o borrar las 4 filas viejas, para no mandar avisos de septiembre; (2) programar
  `maintenance`. Opción A: `pg_net` + `pg_cron` leyendo el secreto desde Vault (SQL abajo, bloque B3). Opción B: un
  workflow de GitHub Actions con `schedule` que haga el POST con el header `x-medmar-cron-secret` guardado como secret
  del repo. Con un intervalo de 10–15 min el consumo de invocaciones sigue siendo bajo (~3–4,5 mil/mes).
  Antes de habilitarlo hay que confirmar que `MEDMAR_CRON_SECRET` y los `GMAIL_*` siguen cargados y vigentes, y que
  no queda pendiente la rotación del client secret de Google.

**A2. El cron diario falla desde hace 7 semanas y la limpieza real no corre.**
- *Evidencia*: `cron.job_run_details`: todos los runs están en `failed` (primero 2026-09-25 06:00, último 2026-11-15
  06:00, ninguno `succeeded`). El error es `column "fecha" does not exist … PL/pgSQL function limpiar_expirados() line 3`.
  `cleanup_expired_data()` (la del repo) no tiene job.
- *Impacto*: hoy no se nota, porque hay muy pocos datos, pero solicitudes vencidas, chats de más de 14 días e
  `idempotency_keys` no se borran nunca. La regla de producto de "chat de 14 días" no se cumple.
- *Corrección*: reprogramar el job con `cleanup_expired_data()` (bloque B3) y eliminar `limpiar_expirados()` (B2).

**A3. Hay columnas en uso que no existen en las migraciones del repo.**
- *Evidencia*: en prod existen `profiles.profile_completed boolean not null default false`,
  `hilos.is_sensitive boolean not null default false` y `respuestas.parent_id uuid` con la FK
  `respuestas_parent_same_hilo_fk (parent_id, hilo_id) → respuestas(id, hilo_id) on delete cascade`. La API las lee y
  las escribe (`api/index.ts:331`, `:404`, `:529`, `:556`, `:577`). El `schema_inicial.sql` no las crea.
- *Impacto*: una base nueva creada con `migrations/` (staging, restore, tests) no sirve para la API.
- *Corrección*: migración de alineación idempotente (bloque B1). En prod no cambia nada.

### Medio

**M1. `consume_rate_limit` se puede llamar directamente desde el cliente.**
- *Evidencia*: el repo (`schema_inicial.sql:621`) y prod hacen `grant execute … to authenticated`. La API solo la
  llama con el cliente admin (`api/index.ts:96`, `:108`).
- *Impacto*: un usuario logueado puede hacer `POST /rest/v1/rpc/consume_rate_limit` con
  `p_bucket_key = 'crearHilo:<uuid de otro>'` y agotarle el rate limit a otra persona. También puede inflar
  `rate_limit_buckets` con claves arbitrarias, que además no se limpian.
- *Corrección*: `revoke execute … from authenticated` (B2). Agregar la limpieza de buckets viejos a
  `cleanup_expired_data` (B3).

**M2. Superficie de RPC heredada (50 funciones fuera del repo).**
- *Evidencia*: advisor `authenticated_security_definer_function_executable` (35 hallazgos) y
  `anon_security_definer_function_executable` (`mailer_tomar`, `mailer_marcar`, `handle_new_auth_user`). Todas son
  `SECURITY DEFINER` y su owner es `postgres`. Referencian tablas inexistentes, así que hoy fallan al ejecutarse.
  `asignar_moderador` y `quitar_moderador` siguen expuestas.
- *Impacto*: hoy es bajo, porque fallan por las tablas faltantes, pero es código privilegiado sin dueño. Si alguien
  vuelve a crear una tabla con alguno de esos nombres (`config`, `perfiles`), resucitan sin revisión.
- *Corrección*: hacer `drop` de todas (B2). Antes, confirmar con `pg_stat_user_functions` o con los logs de PostgREST
  que nadie las llama (en 24 h, ninguna).

**M3. Funciones con `search_path` mutable.**
- *Evidencia*: advisor `function_search_path_mutable`: `prevent_role_escalation`, `touch_conversacion_on_message`,
  `adjust_hilo_response_count` y `set_updated_at` (las 4 están en el repo sin `set search_path`).
- *Corrección*: `alter function … set search_path = ''` (B2) y agregarlo a las definiciones del repo.

**M4. El bucket `profile-photos` no tiene límite de tamaño ni de tipo MIME.**
- *Evidencia*: `storage.buckets`: `profile-photos` tiene `file_size_limit = null` y `allowed_mime_types = null`. El
  bucket viejo `avatares` sí tiene límites (1 MB, jpeg/png/webp), pero está vacío.
- *Impacto*: la compresión está en el cliente. Con la publishable key, un usuario puede subir archivos grandes o de
  cualquier tipo a su carpeta y consumir el GB de storage y el egress.
- *Corrección*: `update storage.buckets set file_size_limit = 1048576, allowed_mime_types = '{image/jpeg,image/png,image/webp}' where id = 'profile-photos'`.
  Eliminar el bucket `avatares` y sus 4 políticas (B2).

**M5. `maintenance` queda abierta si falta `MEDMAR_CRON_SECRET`.**
- *Evidencia*: `maintenance/index.ts:136`: `if (CRON_SECRET) { … }`. Si la variable está vacía, cualquiera puede
  dispararla. `verify_jwt = false`.
- *Corrección*: fallar cerrado (`if (!CRON_SECRET || secret !== CRON_SECRET) return no_autorizado`). Es un cambio de
  código, así que va en un deploy aparte que tiene que pedir el usuario.

### Bajo

- **B-1. `private.legacy_password_migrations` sin RLS** (el advisor lo marca como *critical*). Está mitigado: el schema
  `private` no está en los schemas expuestos y `anon`/`authenticated` no tienen `USAGE` (verificado con
  `has_schema_privilege`). La tabla está vacía. Corrección: `enable row level security` sin políticas (solo
  `service_role` y las funciones `SECURITY DEFINER` acceden) o, si la migración legacy terminó, borrar la tabla y las
  3 RPC `*_legacy_password`.
- **B-2. Advisors de performance**: 25 políticas con `auth.uid()` sin envolver en `(select auth.uid())`
  (`auth_rls_initplan`), 9 FKs sin índice y 7 índices sin uso. Con el volumen actual (decenas de filas) no se nota.
  Conviene corregir `auth_rls_initplan` en la misma migración en la que se toquen esas políticas. Los índices sin uso
  no se borran todavía: es una base nueva con poco tráfico.
- **B-3. Tablas con RLS y sin políticas** (`idempotency_keys`, `notificacion_queue`, `rate_limit_buckets`): es
  intencional (solo acceso admin). Se deja documentado.
- **B-4. Protección contra contraseñas filtradas desactivada** (Auth). Activarla desde el dashboard: Auth → Password
  security. Es un cambio de configuración que hace el usuario.
- **B-5. El rate limit falla abierto**: si la RPC da error, `rateLimit()` devuelve `null` y deja pasar
  (`api/index.ts:102`). Es aceptable por disponibilidad, pero conviene loguear el error.
- **B-6. `cleanup_expired_data` no limpia `rate_limit_buckets`** ni las notificaciones `pendiente` viejas (ver B3).
- **B-7. `list_migrations` está vacío**: las migraciones se aplicaron desde el SQL Editor, así que la tabla
  `supabase_migrations.schema_migrations` no registra nada. Si en algún momento se adopta `supabase db push`, primero
  hay que marcarlas como aplicadas (`supabase migration repair --status applied <versión>`) para que no se
  re-ejecuten.

## Deriva repo ↔ producción

| Objeto | Repo | Prod | Nota |
|---|---|---|---|
| Edge Function `api` | `functions/api/index.ts` | v10 (2026-10-31) | **Idéntica** |
| Edge Function `maintenance` | `functions/maintenance/index.ts` | v3 (2026-09-24) | **Idéntica** |
| 16 tablas (`public.*` + `private.legacy_password_migrations`) | ✔ | ✔ | Mismo conjunto |
| `profiles.profile_completed` | ✘ | ✔ | La usa la API → B1 |
| `hilos.is_sensitive` | ✘ | ✔ | La usa la API → B1 |
| `respuestas.parent_id` + FK `respuestas_parent_same_hilo_fk` | ✘ | ✔ | Respuestas anidadas → B1 |
| Índice `respuestas_id_hilo_uidx` (unique `id, hilo_id`) | ✘ | ✔ | Lo necesita la FK → B1 |
| Índice `respuestas_parent_fecha_idx` | ✘ | ✔ | → B1 |
| Índice `profiles_pseudonimo_lower_uidx` (unique `lower(pseudonimo)`) | ✘ | ✔ | → B1 |
| 18 funciones del repo | ✔ | ✔ | Cuerpo **idéntico** (md5 de `prosrc`) |
| 50 funciones heredadas (`_rl`, `_err`, `crear_hilo`, `listar_hilos`, `mailer_*`, `limpiar_expirados`, `ping`, …) | ✘ | ✔ | Rotas, expuestas por RPC → B2 |
| 7 triggers | ✔ | ✔ | Iguales |
| 30 políticas RLS de `public` + 4 de `profile-photos` | ✔ | ✔ | Iguales |
| Bucket `avatares` + 4 políticas `avatares_*` | ✘ | ✔ | Vacío, heredado → B2 |
| Límites del bucket `profile-photos` | ✘ | ✘ | Faltan en ambos → M4 |
| Realtime: `mensajes` | ✔ (`schema_inicial`) | ✔ | |
| Realtime: `solicitudes`, `intercambio_participantes` | ✔ (`realtime.sql`) | ✔ | |
| Job `pg_cron` `medmar-limpieza-diaria` → `limpiar_expirados()` | ✘ | ✔ (falla) | → B2/B3 |
| Cron de `maintenance` | se asume en docs | ✘ | → A1 |
| Extensiones | no declaradas | `pg_cron`, `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault` | Declarar `pg_cron` en B3 |
| Historial de migraciones (`supabase_migrations`) | 2 archivos | vacío | → B-7 |

## Uso vs. límites del plan Free

| Recurso | Uso actual | Límite Free (aprox., verificar en supabase.com/pricing) | % |
|---|---|---|---|
| Tamaño de la base | 14,6 MB (`pg_database_size`) | 500 MB | ~3 % |
| Storage | 3 objetos, 59 KB (`profile-photos`) | 1 GB | <0,01 % |
| Invocaciones de Edge Functions | ~5 POST a `api` en 24 h (+ preflights `OPTIONS`) | 500 mil/mes | ~0 % |
| Usuarios de Auth | 9 (último login: hoy) | 50 mil MAU | ~0 % |
| Realtime | 4 conexiones websocket en 24 h | 200 concurrentes | ~0 % |
| Inactividad | Hubo actividad el 14 y el 15 de noviembre | Pausa a los ~7 días sin requests | **Riesgo en receso** |

Datos de contenido: 9 perfiles, 5 solicitudes, 1 hilo, 1 respuesta, 6 mensajes, 0 denuncias, 4 notificaciones en
cola, 22 claves de idempotencia y 52 buckets de rate limit. La tabla más grande es `auth.users` (264 KB).

**Riesgo de pausa**: es el único límite que puede afectar al sitio a corto plazo (receso de verano de diciembre a
febrero). Mitigación barata: un workflow de GitHub Actions semanal que llame a la acción `health` de `api`, que es
pública. Ojo: GitHub deshabilita los `schedule` después de 60 días sin commits en el repo, así que conviene revisarlo.
Si se programa `maintenance` (A1, opción A) con `pg_cron` + `pg_net`, eso no cuenta como actividad externa: lo que
evita la pausa son los requests a la API.

**Proyección**: aun con 1.000 alumnos activos, el cuello de botella serían las invocaciones de `api` (cada acción es
1 invocación más 1 preflight `OPTIONS`) mucho antes que la base. Seguir con caché en el cliente y polling moderado.

## Migración propuesta (NO aplicada)

> Es una propuesta para revisar. **No se ejecutó.** Va en dos archivos para que se puedan aplicar por separado.
> Producción es real: aplicarla solo cuando el usuario lo pida, primero con los `SELECT` de verificación.

### B1 — `20261116000000_alinear_repo_con_prod.sql` (idempotente; en prod no cambia nada)

```sql
-- Trae al repo los cambios que se aplicaron a mano en producción.
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
```

### B2 — `20261116000100_limpieza_legado_y_hardening.sql` (cambia prod)

```sql
-- 1) Funciones heredadas del esquema anterior (referencian tablas inexistentes).
drop function if exists
  public._asegurar_perfil(uuid), public._buscar_ciclo(uuid), public._cerrar_ciclo(uuid[]),
  public._email_valido(text), public._err(text), public._es_admin(), public._es_moderador(),
  public._etiquetas_json(), public._hilo_json(uuid, uuid, boolean), public._intercambios_de(uuid),
  public._link_permitido(text), public._lista_hilos(text, integer, uuid), public._mailer_autorizado(text),
  public._nuevo_usuario(), public._operacion_id(text), public._rl(text, integer, integer),
  public._solicitudes_de(uuid), public._tags_limpias(text), public._validar_comisiones(integer, integer),
  public.actualizar_foto(), public.actualizar_pseudonimo(text), public.asignar_moderador(text),
  public.borrar_hilo(uuid), public.borrar_respuesta(uuid), public.borrar_solicitud(uuid),
  public.crear_hilo(text, text, text, text, boolean, text), public.crear_respuesta(uuid, text, boolean, text),
  public.denunciar(text, uuid, text), public.editar_solicitud(uuid, text, integer, integer),
  public.enviar_mensaje(uuid, text, text), public.foro_bootstrap(text),
  public.guardar_solicitud(text, integer, integer), public.limpiar_expirados(), public.listar_denuncias(),
  public.listar_etiquetas(), public.listar_hilos(text, integer), public.listar_moderadores(),
  public.mailer_marcar(text, uuid, boolean, text), public.mailer_tomar(text, integer), public.mi_perfil(),
  public.mis_intercambios(), public.mis_solicitudes(), public.obtener_chat(uuid, integer), public.ping(),
  public.quitar_moderador(text), public.resolver_denuncia(uuid, text), public.rpc_bootstrap(),
  public.soy_moderador(), public.toggle_like(text, uuid), public.ver_hilo(uuid);
-- (Si algún drop falla por dependencias, revisar antes de usar CASCADE.)

-- 2) Job de cron roto.
select cron.unschedule('medmar-limpieza-diaria')
where exists (select 1 from cron.job where jobname = 'medmar-limpieza-diaria');

-- 3) Bucket heredado vacío y sus políticas.
drop policy if exists avatares_actualizar on storage.objects;
drop policy if exists avatares_borrar     on storage.objects;
drop policy if exists avatares_leer       on storage.objects;
drop policy if exists avatares_subir      on storage.objects;
delete from storage.buckets where id = 'avatares'
  and not exists (select 1 from storage.objects where bucket_id = 'avatares');

-- 4) Límites del bucket de fotos (M4).
update storage.buckets
   set file_size_limit = 1048576, allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id = 'profile-photos';

-- 5) Hardening de permisos y search_path (M1, M3, B-1).
revoke execute on function public.consume_rate_limit(text, integer, integer) from authenticated;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
alter function public.prevent_role_escalation()       set search_path = '';
alter function public.touch_conversacion_on_message() set search_path = '';
alter function public.adjust_hilo_response_count()    set search_path = '';
alter function public.set_updated_at()                set search_path = '';
alter table private.legacy_password_migrations enable row level security;
```

Antes de B2 hay que verificar que las 4 funciones de trigger usan nombres calificados (`public.tabla`), porque con
`search_path = ''` un nombre sin schema deja de resolverse:

```sql
select proname, prosrc from pg_proc
where proname in ('prevent_role_escalation','touch_conversacion_on_message','adjust_hilo_response_count','set_updated_at');
```

### B3 — programación (cambia prod; elegir opción para `maintenance`)

```sql
create extension if not exists pg_cron;

-- Limpieza diaria real (A2). Antes, sumar en cleanup_expired_data():
--   delete from public.rate_limit_buckets where window_started_at < now() - interval '2 days';
--   delete from public.notificacion_queue where status = 'pendiente' and created_at < now() - interval '14 days';
select cron.schedule('medmar-cleanup-diario', '0 6 * * *', $$select public.cleanup_expired_data()$$);

-- Opción A para maintenance (A1): pg_net + secreto en Vault (cargar el secreto desde el dashboard, no en el SQL).
-- create extension if not exists pg_net;
-- select cron.schedule('medmar-maintenance', '*/15 * * * *', $$
--   select net.http_post(
--     url := 'https://ekfwdrsehhmrqxxlefyx.supabase.co/functions/v1/maintenance',
--     headers := jsonb_build_object('content-type','application/json',
--       'x-medmar-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'medmar_cron_secret')),
--     body := '{}'::jsonb)
-- $$);
```

Después de aplicar: volver a correr `get_advisors` (security y performance) y revisar `cron.job_run_details`.

## Próximos pasos sugeridos (en orden)

1. Rotar la secret key de Supabase y el client secret de Google (pendiente previo; es requisito para A1).
2. Commitear B1 en el repo (no cambia prod) y corregir `schema_inicial.sql` solo con comentarios, sin editarlo.
3. Decidir qué hacer con las 4 notificaciones de septiembre y la opción de cron para `maintenance` (A1).
4. Aplicar B2 y B3 desde el SQL Editor, cuando el usuario lo pida.
5. Deploy de `maintenance` con fail-closed (M5), cuando el usuario lo pida.
6. Activar la protección contra contraseñas filtradas en Auth (B-4) y el keep-alive semanal.
