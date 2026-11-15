---
name: nueva-accion-api
description: Agrega una acción nueva de punta a punta en MedMar (Edge Function `api` + llamada desde web/js/app.js). Usar cuando haya que crear o modificar un endpoint/acción del backend, p. ej. "agregar acción para X", "nuevo endpoint", "guardar puntaje del juego".
argument-hint: "<nombreAccion> <qué hace>"
---

# Nueva acción del API de MedMar

Acción pedida: $ARGUMENTS

## 1. Diseño (antes de escribir código)
- Nombre en camelCase y en español (`listarX`, `crearX`, `borrarX`). ¿Es lectura o mutación?
- ¿Qué tablas toca? ¿Alcanza el cliente de usuario (`client`, con RLS) o necesita `admin`? Preferí `client`.
  Si usás `admin`, validá permisos a mano (`isModerator`, `isAdmin`, dueño del recurso).
- ¿Necesita cambio de schema? → primero `/nueva-migracion`.
- Costo en plan Free: ¿cuántas veces por sesión se va a llamar? ¿Se puede cachear en cliente?

## 2. Backend — `supabase/functions/api/index.ts`
1. Entrada en `RATE_LIMITS` (`[cantidad, ventanaSegundos]`).
2. `case 'nombreAccion': { … }` dentro del `switch` de `handle()`, empezando con
   `const rl = await rateLimit(admin, action, user.id); if (rl) return rl`.
3. Validar y normalizar cada parámetro de `body` (tipos, `trim`, largo máximo con las constantes `MAX_*`).
   Links de usuario → `safeLink`/`validateContentLinks`.
4. Mutación reintentable → aceptar `operationId` (`validOperationId`) y usar `getIdempotent`/`saveIdempotent`.
5. Respuesta: `json({ ok: true, … })`; errores esperables: `json({ ok: false, error: 'codigo_en_snake_case' })` (status 200).
   Errores inesperados: `throw` (el handler global los captura).

## 3. Frontend — `web/js/app.js`
1. Llamar con `await llamar('nombreAccion', { … })` (lectura) o `llamarMutacionResiliente(…)` (mutación con `operationId`).
2. Lectura frecuente → agregarla a `ACCIONES_LECTURA_DEDUPE` y considerar caché local.
3. Mapear cada código de `error` a un mensaje en español en la sección "MENSAJES DE ERROR".
4. Escapar todo dato de usuario con `escapeHtml`/`escapeAttr`.
5. Subir `?v=` de `app.js` en `web/index.html` y `FRONTEND_VERSION`.

## 4. Verificación
- `npm run check`.
- Pedile al subagente `revisor-seguridad` que revise el diff (auth, RLS, validación, rate limit).
- Recordale al usuario que la función hay que **desplegarla** (`npx supabase functions deploy api`) antes de publicar
  el frontend que la usa; no la despliegues sin que lo pida.
