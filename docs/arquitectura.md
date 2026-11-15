# Arquitectura de MedMar

```
 Navegador (alumno)
   │  web/index.html + css/styles.css + js/app.js  (estático, GitHub Pages, medmar.com.ar)
   │  /juegos/<slug>/  (juegos Phaser, mismo origen)
   │
   │  supabase-js (publishable key)
   ├──► Supabase Auth (email+password, Google OAuth, reset por código)
   ├──► Realtime (mensajes de chat, solicitudes → matches)
   ├──► Storage (bucket profile-photos)
   └──► Edge Function `api`  ──►  Postgres (RLS)  ◄── cron ── Edge Function `maintenance` ──► Gmail API
          { accion, ...params }        tablas, RPCs                (cola notificacion_queue)
```

## Decisiones vigentes

- **Un único endpoint** (`api`) con despacho por `accion`: centraliza auth, rate limit, idempotencia y validación.
  Contra: un solo archivo grande; si crece mucho, partir en módulos importados desde `index.ts` (Deno lo soporta).
- **Frontend sin build**: simple de desplegar y de entender para colaboradores estudiantes. Contra: sin tipos ni
  módulos; la mitigación es `node --check`, convenciones documentadas y revisiones.
- **RLS como capa de seguridad real**: el frontend nunca es confiable. El cliente admin solo dentro de la Edge Function.
- **Juegos autocontenidos** en el mismo origen: se despliegan con la web y pueden compartir la sesión.

## Funcionalidades

| Área | Frontend (`app.js` sección) | Backend (acciones) | Tablas |
|---|---|---|---|
| Auth y perfil | CONTRASEÑAS / AUTENTICACIÓN, PERFIL | `bootstrap`, `completarPerfil`, `miPerfil`, `actualizarPseudonimo`, `actualizarFoto`, `legacyLogin` | `profiles`, storage |
| Intercambio de comisiones | MIS SOLICITUDES, INTERCAMBIOS, PUBLICAR/EDITAR | `guardar`, `editar`, `borrar`, `misSolicitudes`, `misIntercambios` | `solicitudes`, `intercambios`, `intercambio_participantes` |
| Chat de intercambio | (en INTERCAMBIOS) | `obtenerChat`, `enviarMensaje` | `conversaciones`, `mensajes` |
| Foro | FORO | `foroBootstrap`, `listarHilos`, `verHilo`, `crearHilo`, `crearRespuesta`, `borrarHilo`, `borrarRespuesta`, `toggleLike`, `listarEtiquetas`, `resolverImagen` | `hilos`, `respuestas`, `likes_*` |
| Moderación | MODERACIÓN | `denunciar`, `listarDenuncias`, `resolverDenuncia`, `soyModerador`, `listarModeradores`, `asignarModerador`, `quitarModerador` | `denuncias`, `profiles.rol` |
| Notificaciones | — | (maintenance) | `notificacion_queue` |
| Juegos | JUEGOS (placeholder) | (pendiente: `guardarPuntaje`, `ranking`) | (pendiente) |

Ver también: [deploy.md](deploy.md), [roadmap.md](roadmap.md), [decisiones/](decisiones/).
