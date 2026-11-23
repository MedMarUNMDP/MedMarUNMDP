# web/ — Frontend de MedMar

Sitio estático servido en https://medmar.com.ar (GitHub Pages). Sin framework, sin build, sin npm.

## Archivos

- `index.html` — solo estructura (pantallas y modales). Cada vista es un `<div id="vista…">` que se muestra/oculta por JS.
- `css/styles.css` — todos los estilos. Secciones marcadas con `/* ---------- NOMBRE ---------- */`.
  Arranca con el bloque **TOKENS**: única fuente de colores (roles como `--surface`, `--brand`, `--ink-soft`,
  `--link`), radios y sombras. Las reglas usan esos tokens, no colores sueltos. El modo oscuro es
  `body.temaOscuro` y solo redefine tokens. Ojo: un rol que se arma con otro token (`--bg: var(--teal-50)`)
  se resuelve donde se declara, así que también hay que redeclararlo en `body.temaOscuro`.
  Propuesta de rediseño completa (fases 1 a 4): https://claude.ai/artifact/4otTuteGcULkAH8pDeYwii
- `js/app.js` — toda la lógica, **script clásico** (no módulo): las funciones y `const` de nivel superior son globales.
  Secciones marcadas con `// ==================== NOMBRE ====================`:
  selector personalizado, mensajes de error, historial de navegación, modales, sesión local,
  **llamadas al servidor**, autenticación, foro, moderación, mostrar/ocultar pantallas, perfil,
  mis solicitudes, intercambios completados, publicar/editar solicitud, inicio.
- `assets/avatars/*.svg`, `assets/brand/*` — imágenes. `CNAME`, `robots.txt`, `sitemap.xml` — SEO/dominio.

Para ubicarte: `Grep "// ====" web/js/app.js` y leé solo el rango que necesitás.

## Patrones del código

- **Toda** comunicación con el backend pasa por `llamar(accion, params)` (con sesión) o `llamarSinSesion`.
  Invoca la Edge Function `api` con `{ accion, ...params }` y siempre devuelve `{ ok, error?, ... }` (nunca lanza).
- Mutaciones con reintento: `llamarMutacionResiliente(accion, params)` + un `operationId` (idempotencia en servidor).
- Lecturas repetidas se deduplican (`ACCIONES_LECTURA_DEDUPE`) y se cachean en cliente (`foroCacheCliente`, `localStorage` `medmar:*`).
  Si agregás una acción de lectura frecuente, sumala ahí: ahorra invocaciones del plan Free.
- Realtime de Supabase solo para chat y `solicitudes` (matches); el resto es por request.
- Textos de usuario: siempre pasar por `escapeHtml()` / `escapeAttr()` antes de insertarlos con `innerHTML`.
- **Formato del foro** (sección FORMATO DE PUBLICACIONES): markdown liviano propio (`renderizarFormato`: títulos, negrita,
  cursiva, listas, citas, cuadros `> [!nota|importante|consejo]`, tablas, código, separadores). Escapa primero y
  después inserta etiquetas propias: no agregues reglas que inserten texto sin escapar. Resúmenes con `quitarFormato`.
  Barra de botones + vista previa: `montarBarraFormato(textarea)`.
- **Material**: los sitios admitidos los manda la API en `listarMateriales` (`sitios`); la web los usa para avisar y
  mostrar «Abrir en Canva». Para sumar un sitio se edita solo `SITIOS_MATERIAL` en la API. Se puede reportar un material.
- **Encuestas del foro** (sección ENCUESTAS DEL FORO): `crearHilo` con `encuesta`, `verHilo` devuelve `hilo.encuesta`, `votarEncuesta`.
- `index.html` tiene una **Content Security Policy** en `<meta>`: un CDN, embed o dominio nuevo hay que sumarlo ahí o no carga.
- **Cloudflare** está delante de GitHub Pages (proxy): agrega HSTS, `X-Frame-Options`, `frame-ancestors`, `nosniff` y
  `Permissions-Policy` con una regla de Transform (Rules → Response Header). RUM/Web Analytics desactivado a propósito.
- **CAPTCHA**: login, registro, recuperación y cambio de contraseña usan Cloudflare Turnstile (`TURNSTILE_SITE_KEY`,
  sección CAPTCHA de `app.js`). Una llamada nueva a `signInWithPassword`/`signUp`/`resetPasswordForEmail` necesita `captchaToken`.
- **Ranking**: moderadores pueden esconder (`ocultarPuntaje`, reversible desde «Puntajes escondidos») o anular (`quitarPuntaje`, borra) puntajes sospechosos, con llave y auditoría. «Estadísticas de este modo» (`estadisticasRanking`) muestra el ritmo típico por duración y marca los inusuales.
- **Inicio**: portada (`.portadaInicio`: saludo según la hora, fecha y accesos rápidos `[data-accion-inicio]`), «Tu actividad» (`renderizarNovedades`) y «Explorá MedMar» (tarjetas).
- supabase-js va con versión fija + `integrity` (SRI). Para actualizarlo: cambiar la versión en la URL y recalcular con
  `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`.
- Las escrituras a la base van siempre por la API: las políticas RLS no permiten escribir desde el navegador.
- Reportes anónimos (vista `#vistaReportes`): van a una planilla de Drive por Apps Script, no a Supabase.
  `REPORTES_URL` en `app.js` (vacía = la tarjeta no aparece). Ver `tools/reportes-apps-script/README.md`.
- Al cambiar `css/styles.css` o `js/app.js`, subí el `?v=AAAAMMDD` en `index.html` para romper la caché de los usuarios,
  y actualizá `FRONTEND_VERSION` en `app.js`.

## Probar

```bash
npm run dev:web      # http://localhost:5500 (las rutas son absolutas: /css, /js, /assets)
```

Abrí la página en el navegador integrado y revisá la consola. Ojo: el local apunta a la base de **producción**;
no crees datos de prueba sin avisar.

## Deuda técnica conocida

- `js/app.js` es un único archivo grande. Partirlo en varios scripts requiere cuidar el orden de carga
  (hay código de nivel superior que llama funciones declaradas más abajo). Ver `docs/roadmap.md`.
- La sección Juegos (`#vistaJuegos`) todavía es un placeholder: falta enlazar `/juegos/<slug>/` y el ranking.
