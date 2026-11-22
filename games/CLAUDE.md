# games/ — Juegos educativos de MedMar

Cada juego es una carpeta **autocontenida y estática** (`games/<slug>/`) que se publica en
`https://medmar.com.ar/juegos/<slug>/`. Juegos actuales:

| Slug | Estado | Motor |
|---|---|---|
| `inmune-survivors` | en desarrollo (v3.8) | Phaser 3.90 por CDN |

## Contrato común de un juego

- `index.html` como entrada; rutas **relativas** (`./src/...`, `./assets/...`) para que funcione bajo `/juegos/<slug>/`.
- Phaser desde cdnjs con versión fija. Sin bundler ni npm, salvo que se decida lo contrario en un ADR.
- Lógica testeable separada de Phaser en `src/` con patrón UMD (`module.exports` + `globalThis.X`), tests en
  `tests/*.test.cjs` con `node:test`. `npm test` en la raíz corre los de todos los juegos.
- Cache-busting con `?build=X.Y.Z` en cada `<script>` del `index.html`.
- `CHANGELOG.md` con la versión más nueva arriba; documentación de diseño en `docs/`.
- Nada de secretos. Archivos de desarrollo local (`*.bat`, `*.py`, `tests/`, `docs/`) no se publican (ver workflow).
- Assets: preferí `.webp`; los `.png` de 1–2 MB pesan en móviles y en el egress.

## Integración con la web

Los juegos se sirven en el mismo origen que la web, así que pueden leer la sesión de Supabase
(supabase-js guarda la sesión en `localStorage`). El ranking usa la acción `guardarPuntaje` del API
(recalcula el puntaje y valida plausibilidad) y la tabla `puntajes_juegos` (mejor puntaje por usuario, juego y modo; RLS
de solo lectura). La web lo muestra en `#vistaJuegos` con `rankingJuego`. El juego carga supabase-js (con SRI) recién al
terminar una partida. Nunca escribir puntajes directo a la tabla desde el juego.

Skills: `/nuevo-juego` (scaffold con este contrato) y `/publicar-juego` (versión + checks).
