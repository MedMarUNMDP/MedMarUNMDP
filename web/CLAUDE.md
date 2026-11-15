# web/ — Frontend de MedMar

Sitio estático servido en https://medmar.com.ar (GitHub Pages). Sin framework, sin build, sin npm.

## Archivos

- `index.html` — solo estructura (pantallas y modales). Cada vista es un `<div id="vista…">` que se muestra/oculta por JS.
- `css/styles.css` — todos los estilos. Secciones marcadas con `/* ---------- NOMBRE ---------- */`.
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
- `index.html` tiene una **Content Security Policy** en `<meta>`: un CDN, embed o dominio nuevo hay que sumarlo ahí o no carga.
- supabase-js va con versión fija + `integrity` (SRI). Para actualizarlo: cambiar la versión en la URL y recalcular con
  `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`.
- Las escrituras a la base van siempre por la API: las políticas RLS no permiten escribir desde el navegador.
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
