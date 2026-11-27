# Revisión de seguridad práctica — 2026-11-27

Pruebas hechas como lo haría una persona desde el navegador (consola de «Inspeccionar elemento», `fetch` a la API y a
PostgREST con la publishable key que expone la página) y revisión del código de las acciones que reciben ids.
**Falta la parte con sesión iniciada** (ver al final).

## Lo que se probó y resistió

| Prueba | Resultado |
|---|---|
| Leer cualquier tabla con la publishable key, sin sesión (28 tablas) | Denegado (sin grants para `anon`) |
| Insertar en tablas, llamar funciones internas (`purgar_papelera`, `claim_notification_batch`, `cleanup_expired_data`…) | Denegado |
| Esquema OpenAPI de PostgREST, GraphQL, listar buckets y fotos de Storage | Denegado / vacío / desactivado |
| Registro sin CAPTCHA (`/auth/v1/signup`) | Rechazado: `captcha_failed` |
| Todas las acciones de la API sin sesión, con JWT inventado o con `alg: none` | `sesion_invalida` |
| CORS de la API desde otro origen | Solo responde a medmar.com.ar (y localhost para desarrollo); además usa `Authorization`, no cookies |
| Función `maintenance` sin el secreto del cron | `401 no_autorizado` |
| Archivos internos publicados (`CLAUDE.md`, `.git`, `.env`, `docs/`, `tests/`, `*.map`, `package.json`) | 404 |
| SSRF en `resolverImagen` | Lista cerrada de sitios, solo https, bloquea IPs internas y revisa cada redirección |
| Acciones con ids ajenos (`editar`, `borrar`, `enviarMensaje`, `obtenerChat`, `gestionarClasificado`, `borrarHilo`…) | Todas filtran por dueño o pasan por RLS |
| XSS en el formato del foro | Escapa antes de dar formato |
| Mostrar el panel de moderación tocando el DOM | Solo cambia la vista: cada acción la valida el servidor con rol + llave |

## Corregido en esta revisión

- **Ranking**: se podía mandar cualquier cantidad de eliminaciones. Ahora rige el tope de apariciones
  (`maxApariciones`, juego 3.12 y API).
- **Comentarios visibles al inspeccionar**: lo publicado sale sin comentarios (`scripts/limpiar-publicacion.mjs` en el
  workflow de Pages); el código fuente los conserva.
- **CSP**: quedaba permitido conectarse a `script.google.com` (de la planilla de reportes que ya no se usa).

## Recomendaciones pendientes

1. **HSTS de 1 día** (regla de Cloudflare «Headers de seguridad MedMar»): subirlo a `max-age=15552000` (6 meses) cuando
   el dominio esté estable. Es un cambio en Cloudflare, no en el repo.
2. **`hilos.autor_id` y `respuestas.autor_id` se pueden leer directo** con una sesión (PostgREST): un usuario ve el id
   interno del autor de cada publicación, así que puede vincular todas las publicaciones de una misma persona aunque
   use seudónimo. Hoy no hay publicaciones anónimas (`es_anonimo` siempre es falso) y los perfiles no se pueden leer
   directo, así que el impacto es bajo. Si vuelven las publicaciones anónimas, hay que cerrarlo: leer el foro con el
   cliente admin en la API y quitar el `select` de esas tablas a `authenticated`. Lo mismo con `likes_*.user_id`.
3. **`is_conversation_participant(conv, usuario)` e `is_exchange_participant`** aceptan cualquier usuario como
   parámetro: con ids ajenos (que no se exponen) se podría consultar si alguien está en un chat. Bajo; se puede
   limitar a `auth.uid()`.
4. **Claves repetidas en `mensajeError`** (`no_es_moderador`, `link_invalido`, `servidor_ocupado`): gana la segunda;
   revisar cuál texto corresponde.

## Pendiente: pruebas con sesión iniciada

Para probar como usuario con sesión (cambiar ids, campos y roles en las llamadas desde la consola) hace falta una
cuenta **común** (no admin) iniciada en el navegador de pruebas. No se usa la contraseña de nadie: la persona inicia
sesión y las pruebas corren desde la consola.
