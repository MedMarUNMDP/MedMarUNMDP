# supabase/ — Backend de MedMar

Proyecto Supabase (plan **Free**), ref `ekfwdrsehhmrqxxlefyx`. No hay entorno de staging: todo lo que
se aplica acá impacta producción.

## Estructura (convención de Supabase CLI)

- `functions/api/index.ts` — Edge Function principal (Deno). Un único endpoint POST que despacha por `body.accion`
  en el `switch` de `handle()`. Acciones públicas: `health`, `legacyLogin`; el resto exige `Authorization: Bearer`.
- `functions/maintenance/index.ts` — invocada por cron con header `x-medmar-cron-secret`. Procesa `notificacion_queue`
  (RPC `claim_notification_batch`) y envía mails vía Gmail API con backoff exponencial.
- `migrations/` — SQL en orden por timestamp. `…_schema_inicial.sql` es idempotente (`if not exists`, `create or replace`)
  y se aplicó a mano desde el SQL Editor del dashboard.

## Modelo de datos (resumen)

`profiles` (`is_moderator`/`is_admin` booleanos, pseudónimo único sin distinguir mayúsculas, `foto_url`, `profile_completed`) ·
`solicitudes` → `intercambios` + `intercambio_participantes`
(intercambio de comisiones, matching por ciclos en `finalize_exchange`) · `conversaciones`, `conversacion_participantes`,
`mensajes` (chat de un intercambio, 14 días) · `hilos` (`is_sensitive`), `respuestas` (anidadas con `parent_id`,
FK al mismo hilo), `likes_hilos`, `likes_respuestas` (foro) ·
`denuncias` (moderación) · `notificaciones` (campana: las crean triggers en `respuestas`, `mensajes` e
`intercambio_participantes` vía `notificar()`, agrupando avisos sin leer del mismo destino; las noticias las publica un admin
con `publicarNoticia`; select solo propias, en Realtime) · `materiales` (catálogo de enlaces a Google Drive: no se suben archivos) y
`aportes_material` (aportes de estudiantes por link de Drive o sugerencia, revisados por moderadores; anti-spam en
`enviarAporte`: rate limit, tope diario y de pendientes, solo Drive, trampa y tiempo mínimo) · `llaves_moderacion` (llaves públicas ECDSA P-256 de moderadores/admins; segundo factor:
toda acción de moderación pasa por `autorizarModeracion` y exige rol + llave activa + token de 30 min; llaves de admin solo
por SQL; ADR `docs/decisiones/0004`) · `registro_moderacion` (auditoría, 180 días) · `puntajes_juegos` (ranking: mejor puntaje por usuario/juego/modo, RPC `ranking_juego`) ·
`notificacion_queue` · `idempotency_keys` · `rate_limit_buckets` · `private.legacy_password_migrations`.

Funciones clave: `is_moderator`, `is_admin`, `prevent_role_escalation`, `consume_rate_limit`, `finalize_exchange`,
`cleanup_expired_data`, `recount_medmar_counters`. Storage: bucket `profile-photos`.

**Estado tras la auditoría 2026-11** (`docs/auditoria-supabase-2026-11.md`): repo y prod alineados
(`…170000_alinear_repo_con_prod.sql`, `…180000_hardening_y_cron.sql`). Las escrituras pasan **solo** por la API:
no hay políticas RLS de INSERT/UPDATE/DELETE ni subidas directas a Storage (ADR `docs/decisiones/0002`).
Cron (pg_cron): `medmar-cleanup-diario` (06:00 UTC, `cleanup_expired_data`) y `medmar-maintenance` (cada 10 min,
solo invoca la función si hay mails pendientes; token en Vault `medmar_cron_secret`, validado con `cron_token_valido`).
Keep-alive: `.github/workflows/keep-alive.yml` llama a `api/health` dos veces por semana.

## Reglas al modificar

1. **Acción de moderación o admin nueva** → siempre `const auth=await autorizarModeracion(admin,user,body,'moderador'|'admin')`
   (nunca solo `isModerator`/`isAdmin`) y `auditar(...)`; en la web, llamala con `llamarModeracion`.
1. **Nueva acción del API** → skill `/nueva-accion-api`. Siempre: `rateLimit()` (y entrada en `RATE_LIMITS`),
   validar/limitar tamaños (`MAX_*`), devolver `json({ ok: true, … })` o `json({ ok: false, error: 'codigo' })` con status 200.
2. Usá el **cliente de usuario** (`client`, respeta RLS) por defecto. El **admin** (`admin`, secret key, saltea RLS)
   solo cuando hace falta y validando permisos a mano (`isModerator`, `isAdmin`).
3. **Cambios de schema** → skill `/nueva-migracion`: archivo nuevo en `migrations/`, nunca editar uno ya aplicado.
   Toda tabla con RLS + políticas. Probar con `SELECT` antes de cualquier escritura.
4. Mutaciones que el cliente puede reintentar → `operationId` + `saveIdempotent`/`getIdempotent`.
5. Secretos solo por `Deno.env.get(...)`. Variables usadas: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   `MEDMAR_SUPABASE_SECRET_KEY` (o `SUPABASE_SECRET_KEYS`), `MEDMAR_CRON_SECRET`, `GMAIL_*`. Ver `.env.example`.

## Límites del plan Free (verificá valores actuales en supabase.com/pricing)

Base de datos ~500 MB · Storage ~1 GB · ~500 mil invocaciones de Edge Functions/mes · egress limitado ·
el proyecto **se pausa tras ~7 días sin actividad**. Implicancias: fotos comprimidas en cliente (ya se hace),
limpieza periódica (`cleanup_expired_data`), dedupe/caché en el frontend, evitar polling agresivo.

## Deploy (solo cuando el usuario lo pida)

Con Supabase CLI (`npx supabase …`, requiere `supabase login` + `supabase link --project-ref ekfwdrsehhmrqxxlefyx`):

```powershell
# En Windows, npx.cmd (PowerShell bloquea npx.ps1). --use-api empaqueta en el servidor (no hace falta Docker).
# verify_jwt está en false en las dos funciones: la API valida la sesión por su cuenta.
npx.cmd -y supabase@2.48.3 functions deploy api --project-ref ekfwdrsehhmrqxxlefyx --no-verify-jwt --use-api
npx.cmd -y supabase@2.48.3 functions deploy maintenance --project-ref ekfwdrsehhmrqxxlefyx --no-verify-jwt --use-api
```

No uses `deploy_edge_function` del MCP para `api`: habría que pegar el archivo entero (~70 KB) a mano.

Migraciones: el MCP en modo escritura aplica DDL simple, pero **rechaza solo** el SQL que considera destructivo
(`drop`, `revoke`, `update`, `delete`): eso se pega en el SQL Editor. Todos los archivos de `migrations/` son idempotentes. El MCP de Supabase está configurado en **solo lectura**
(sirve para `list_tables`, `execute_sql` de lectura, logs y advisors de seguridad/performance).
