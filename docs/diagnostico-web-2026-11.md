# Diagnóstico de la web — noviembre 2026

Revisión del frontend (`web/`) y de cómo usa la Edge Function `api`, hecha el 2026-11-15 después del
hardening (`ff1430a`). Método: lectura completa de `web/js/app.js`, `web/index.html` y las acciones del API;
pruebas en el navegador sin sesión (local, viewport de celular) y consultas de solo lectura a producción.
No se probaron los flujos con sesión iniciada (requieren una cuenta real).

Uso actual de producción (para dimensionar): 9 perfiles, 1 hilo, 1 respuesta, 0 solicitudes activas,
2 intercambios. Los problemas de escala de abajo no duelen hoy, pero conviene resolverlos antes de difundir.

> **Actualización 2026-11-15 (tarde):** corregidos A1 a A7 y además un bug latente que apareció al probar:
> `renderizarLinkPreview` llamaba a `detectarTipoLink`, una función borrada por error en `f05ebaa`, así que
> cualquier hilo con `link` rompía el foro (hoy ningún hilo de producción lo tiene). Para A3 la web verifica la
> contraseña actual con un login antes de `updateUser` (solo en cuentas con contraseña, no en las de Google);
> falta activar *Secure password change* en Auth. Pendientes: los ítems Media y Baja (ver `roadmap.md`).

---

## 1. Cómo funciona cada apartado

### Arranque y sesión
- `index.html` carga supabase-js (versión fija + SRI) y `app.js` (script clásico, todo global).
- `inicializarAuthSupabase()` muestra el login, pide `getSession()` y, si hay sesión, llama `mostrarApp()`.
  `onAuthStateChange` mantiene `sesion` al día (refresco de token) y atiende `PASSWORD_RECOVERY` y `SIGNED_OUT`.
- `mostrarApp()` arma el historial propio, muestra Inicio, pide **`bootstrap`** (perfil + solicitudes activas +
  intercambios + rol) y abre Realtime sobre las `solicitudes` del usuario. `bootstrap` se cachea en
  `localStorage` (`medmar:perfil:<email>`, 20 s de frescura) y se pinta desde caché al instante.
- Si el perfil no está completo aparece el **modal de bienvenida** (pseudónimo obligatorio + avatar o foto).

### Login / registro / recuperación
- **Google**: `signInWithOAuth`, vuelve a la misma URL y supabase-js toma la sesión del callback.
- **Email**: `signInWithPassword`. Si falla, prueba `legacyLogin` (migración de contraseñas del sistema viejo)
  y reintenta. Registro con `signUp` + mail de confirmación.
- **Recuperar**: `resetPasswordForEmail` manda un enlace; al volver con él se dispara `PASSWORD_RECOVERY` y se
  muestra el campo de nueva contraseña (`updateUser`).

### Navegación
- Una sola página con vistas `#vistaInicio`, `#vistaIntercambios`, `#vistaForo`, `#vistaModeracion`,
  `#vistaJuegos`, `#vistaConfiguracion`; `mostrarSeccion()` prende una y apaga las demás.
- El botón **Atrás** del celular navega dentro de la app: cada vista y cada "overlay" (redactar, hilo abierto,
  chat) empuja un estado en `history`. Hay una entrada centinela para que el primer Atrás desde Inicio no
  saque al usuario del sitio.

### Intercambio de comisiones
- Formulario con materia (selector propio con búsqueda) + comisión que tenés / que buscás (1 a 40).
- **Publicar** → `guardar` (con `operacionId` para idempotencia). El servidor valida, impide dos solicitudes
  activas para la misma materia y corre `maybeMatch`: si se cierra un ciclo crea el intercambio, el chat y
  encola los mails. La UI muestra la solicitud de forma optimista y después refresca.
- **Editar / Borrar** → `editar` (también puede disparar un match) / `borrar` (marca `cancelada`).
- **Intercambios completados**: lista de participantes con pseudónimo (los mails no se muestran) y botón al chat.
- Los matches que hace otra persona te llegan por **Realtime**; si Realtime no conecta, hay un refresco cada 60 s
  mientras estás en la vista.

### Chat del intercambio
- `obtenerChat` trae los últimos 100 mensajes; si le pasás la cantidad que ya tenés responde `sinCambios`
  (ahorra egress). Los mensajes nuevos de la otra persona llegan por Realtime (INSERT en `mensajes`);
  si Realtime no está suscripto, se consulta cada 30 s.
- Enviar → `enviarMensaje` con `operacionId`, UI optimista y reintento a los 15 s si la respuesta fue ambigua.
- Se borra tras 14 días sin actividad (`cleanup_expired_data`, cron diario).

### Foro
- Al entrar: `foroBootstrap` (primera página de 20 hilos + lista de etiquetas). Caché en memoria por filtro, 20 s.
- **Buscar**: texto libre → `listarHilos` con `ilike` sobre título y contenido. Tocar un **chip de etiqueta**
  filtra por esa etiqueta. "Cargar más" pagina de a 20.
- **Publicar**: modal con título, contenido, etiquetas (hasta 5, separadas por coma) y casilla de contenido
  sensible → `crearHilo`. El hilo aparece al instante (optimista) y se confirma después.
- **Hilo abierto**: `verHilo` trae el hilo y hasta 500 respuestas; las respuestas se anidan por `parent_id`
  (tocar una respuesta = responderle a esa). Likes optimistas (`toggleLike`), denunciar (`denunciar`) y borrar
  (autor o moderador).
- **Enlaces**: solo HTTPS a una lista blanca de dominios (YouTube, Google, UNMDP, revistas, Spotify, Steam y
  hosts de imágenes). YouTube y Spotify se embeben; las imágenes directas se muestran; para hosts tipo
  prnt.sc/imgur el servidor resuelve la imagen real (`resolverImagen`, cacheado por sesión).
- **Contenido sensible**: en el listado se reemplaza el resumen por un aviso; en el hilo, el texto se muestra
  desenfocado hasta tocar "Mostrar contenido".

### Moderación (moderadores y admin)
- Botón 🛡️ en el foro si `bootstrap`/`foroBootstrap` dicen que sos moderador.
- `listarDenuncias`: denuncias pendientes con el contenido, el motivo y el **mail real del autor**.
  Descartar o eliminar (eliminar borra la publicación y cierra todas las denuncias sobre ella).
- El admin además ve **Moderadores**: alta y baja por email.

### Perfil
- Tema claro / oscuro / según el dispositivo (`localStorage` `medmar:tema`).
- Foto: se recorta a 256×256 y se comprime a JPEG en el navegador → `actualizarFoto` (el servidor revisa
  tamaño y firma JPEG y borra las fotos anteriores).
- Pseudónimo (`actualizarPseudonimo`, único sin distinguir mayúsculas), cambio de contraseña y cerrar sesión.

### Juegos
- Placeholder: solo un texto. La tarjeta de Inicio promete "Jugá y subí al ranking".

---

## 2. Problemas encontrados

Severidad: **Alta** = un usuario lo nota o puede perder/filtrar datos; **Media** = comportamiento raro, gasto
innecesario o riesgo acotado; **Baja** = deuda técnica.

### Alta

| # | Problema | Dónde | Detalle |
|---|---|---|---|
| A1 | **Publicar una solicitud sin elegir materia no hace nada** | `app.js` `mejorarSelect` (oculta el `<select required>`) | El navegador bloquea el envío pero no puede mostrar el globo de error en un control oculto: no aparece ningún mensaje (en consola: *An invalid form control with name='materia' is not focusable*). **Confirmado en el navegador.** Validar a mano en el submit y mostrar el error en `#msg`. |
| A2 | **El modal de bienvenida se cierra tocando afuera o con Escape y deja la página sin scroll** | `app.js` handler de `.modalFondo` y `cerrarModalConEscape` | El handler genérico de fondo de modal también aplica al modal obligatorio; `cerrarModal` no restaura `body.style.overflow`. **Confirmado en el navegador**: el modal desaparece y el scroll queda bloqueado. Excluir `modalSetupPerfil` de ese cierre. |
| A3 | **"Cambiar contraseña" pide la actual pero no la verifica** | `app.js` `formCambiarPassword` | Llama `updateUser({ password })` y el campo "Contraseña actual" se ignora: quien tenga la sesión abierta cambia la contraseña. Activar *Secure password change* en Auth (exige reautenticación) y usar `reauthenticate()` + `nonce`, o quitar el campo para no dar una falsa sensación de seguridad. |
| A4 | **Un reintento de respuesta puede publicarse en otro hilo** | `app.js` submit de `formRespuesta`, `setTimeout` de 15 s | El reintento usa `hiloAbiertoId` del momento del reintento, no el del envío. Si la primera vez no se guardó y en esos 15 s abriste otro hilo, la respuesta va al hilo equivocado. Guardar el id en una constante al enviar (como ya hace el chat con `chatIdEnviado`). |
| A5 | **El contenido sensible muestra igual la vista previa de YouTube** | `app.js` `renderizarHilos` / `renderizarDetalleHilo` | En el listado se oculta el resumen pero se pinta la miniatura del video; en el hilo, el embed queda fuera del bloque desenfocado. Si el hilo es sensible, no renderizar la preview hasta "Mostrar contenido". |
| A6 | **Las cachés del foro no se invalidan (claves distintas)** | `app.js` `borrarPublicacion`, submit de `formHilo` / `formRespuesta`, `cargarEtiquetasDisponibles` | La caché usa claves `"_todos::<busqueda>"`, pero al borrar/crear se borra o actualiza `"_todos"`, que no existe. Efecto: después de borrar un hilo o responder, al volver a la lista aparece el estado viejo (hilo borrado, contador de respuestas desactualizado) hasta que llega la respuesta del servidor; `cargarEtiquetasDisponibles` nunca usa la caché. Centralizar la clave en una función `claveForo()`. |
| A7 | **Cerrar sesión no limpia los datos locales** | `app.js` `logoutBtn` / `mostrarLogin` | Quedan `foroCacheCliente`, `hiloCacheCliente`, `chatCacheCliente`, las listas en memoria y `localStorage` `medmar:perfil:<email>` (con solicitudes e intercambios). En una compu compartida queda información; si otra persona entra en la misma pestaña ve por unos segundos likes y botones "Borrar" del usuario anterior. Vaciar todo en el logout. |

### Media

| # | Problema | Dónde | Detalle |
|---|---|---|---|
| M1 | Carrera al abrir hilos rápido | `abrirHilo` | Si abrís A y enseguida B, la respuesta tardía de A puede pintarse estando en B. Ignorar respuestas si `hiloAbiertoId !== id`. |
| M2 | Abrir un hilo con caché fresca igual llama al servidor | `abrirHilo` | Con caché de menos de 20 s hace `verHilo` "de fondo" y no usa el resultado: gasta una invocación por apertura. |
| M3 | `legacyLogin` en cada login fallido | `formLogin` + acción `legacyLogin` | La tabla `private.legacy_password_migrations` tiene **0 filas**: la migración terminó. Cada contraseña mal escrita gasta una invocación extra. Quitar la llamada, la acción, la RPC y la tabla. |
| M4 | Comisiones arrancan en "Comisión 1 / Comisión 1" | `index.html` `#tengo`/`#busco` | No hay opción vacía: `required` no sirve y, si no tocás nada, el error es "misma comisión" en un `alert`. Agregar un placeholder. |
| M5 | Foto PNG con transparencia queda con fondo negro | `recortarYComprimirImagen` | Al pasar a JPEG, el canvas transparente se vuelve negro. Pintar fondo blanco antes de `drawImage`. |
| M6 | El buscador del foro confunde | `#ayudaFiltroEtiqueta`, `<datalist>` | El texto dice "Elegí una de las etiquetas existentes" pero el campo es búsqueda libre, y el `datalist` no está conectado a ningún input. La búsqueda distingue tildes ("anatomia" no encuentra "anatomía"): usar `unaccent` o una columna normalizada. |
| M7 | Diálogos nativos (`alert`, `confirm`, `prompt`) | Denunciar, borrar, errores | Bloquean la página, se ven fuera de estilo en el celular, y varios agregan "Detalle técnico" al mensaje. Reemplazar por mensajes en línea o un modal propio. |
| M8 | Mensajes de error internos al usuario | Registro (`formRegistro`) | "Revisá Authentication → Logs" y "hay que revisar la configuración de emails de Supabase" son instrucciones para el admin, no para un estudiante. |
| M9 | Chat: solo 100 mensajes y botón trabado | `obtenerChat`, submit de `formChat` | No hay "ver anteriores". Si el envío quedó ambiguo dos veces, el botón Enviar queda deshabilitado hasta que llegue la reconciliación. |
| M10 | Parpadeos al cargar | `inicializarAuthSupabase`, `aplicarTemaGlobal` | Con sesión guardada se ve el login un instante antes de la app; con tema oscuro se ve primero el claro (el tema se aplica al final del `body`). El tema por defecto es "claro" y no "según el dispositivo". |
| M11 | Accesibilidad | Selector propio, login | Las opciones del selector propio son `div` sin foco ni flechas: no se puede elegir materia con teclado ni lector de pantalla. Los `<label>` del login no tienen `for`. |
| M12 | Privacidad de moderación sin documentar | `listarDenuncias` | Los moderadores ven el **mail real** del autor denunciado en un foro pseudónimo. Puede ser correcto, pero debería estar escrito (ADR + aviso en el sitio). |
| M13 | Etiquetas recalculadas en cada carga del foro | `foroBootstrap`, `listarEtiquetas` | Leen hasta 1000 hilos para sacar etiquetas, y `getThreadPage` pide `count: 'exact'` en cada página. Hoy no pesa; con uso real conviene una vista o tabla de etiquetas. |

### Baja (deuda técnica)

- **Código muerto**: `cargarPerfil` (además espera `r.pseudonimo` y la API responde `r.perfil`), `cargarRolModerador`,
  `guardarSesionLocal`/`cargarSesionLocal`, `resetCodigo` (el elemento no existe) y la clave
  `medmar:perfil:optimista` (se escribe y nunca se lee). `mensajeError` tiene `servidor_ocupado` duplicado.
- `guardar` manda `operacionId` pero usa `llamar` en vez de `llamarMutacionResiliente`: no reintenta.
- `renderizarDetalleHilo` mete `h.id` en atributos sin `escapeAttr` (son UUID del servidor, pero es inconsistente).
- **CSS**: las ~350 líneas finales de `styles.css` son parches sin sección; hay selectores definidos hasta 4 veces
  (`#vistaForo`, `.hero-inner`) y una clase (`autoTemaOscuro`) que el JS nunca pone.
- `index.html`: la firma va como imagen base64 embebida (~8,5 KB en cada carga) y el link de Instagram lleva un
  parámetro de rastreo (`stkn=`).
- La tarjeta **Juegos** promete un ranking que no existe.

---

## 3. Lo que está bien

- El escapado de HTML es consistente y la CSP + SRI están activas (sin errores de consola en producción).
- Las mutaciones importantes son idempotentes (`operacionId`) y la UI optimista reconcilia bien en el caso normal.
- El ahorro de invocaciones está pensado: dedupe de lecturas, cachés, `sinCambios` en el chat, polling solo si
  Realtime no conecta.
- El Atrás del celular dentro de la app funciona como se espera.

## 4. Orden sugerido

1. A1, A2, A4, A5 y A7: cambios chicos y de alto impacto, todos en `app.js`.
2. A3 (Auth: *Secure password change*) y A6 (función única para la clave de caché).
3. M3 (quitar `legacyLogin`), M4, M5, M8 y el código muerto, en un mismo PR de limpieza.
4. M7, M10 y M11: pasada de UX y accesibilidad.
