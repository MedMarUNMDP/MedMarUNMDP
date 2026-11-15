---
name: publicar-juego
description: Prepara una versión nueva de un juego de games/ (sube el build, actualiza CHANGELOG, corre tests y checks). Usar cuando el usuario diga que una versión de un juego está lista o pida "subir versión" o "release".
argument-hint: "<slug-del-juego> <versión X.Y.Z>"
disable-model-invocation: true
---

# Publicar versión de juego

Pedido: $ARGUMENTS (si falta el slug, usá `inmune-survivors`; si falta la versión, proponé la siguiente menor).

1. Leé `games/<slug>/CHANGELOG.md` y `git log` desde la última versión para armar el resumen de cambios.
2. Reemplazá el `?build=` de **todos** los `<script>` de `games/<slug>/index.html` por la versión nueva.
   Si existe `iniciar_juego.py`, actualizá la versión en la URL y en el mensaje.
3. Agregá arriba en `CHANGELOG.md` una sección `## vX.Y.Z` con: cambios para el jugador, cambios técnicos
   y **cómo se validó** (ser honesto: qué se probó en navegador y qué no).
4. Corré `npm test` y `npm run check`. Si fallan, pará y reportá.
5. Probá el juego con `npm run dev:juego` en el navegador integrado: menú, una partida corta, modo Laboratorio,
   consola sin errores; repetí con viewport móvil.
6. Proponé el mensaje de commit (`juego(<slug>): vX.Y.Z — resumen`). No hagas push: publicar es decisión del usuario.
