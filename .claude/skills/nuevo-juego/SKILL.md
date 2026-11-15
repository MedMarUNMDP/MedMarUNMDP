---
name: nuevo-juego
description: Crea el esqueleto de un juego educativo nuevo con Phaser en games/<slug>/ siguiendo el contrato común de MedMar. Usar cuando el usuario quiera empezar un juego nuevo.
argument-hint: "<slug> <idea del juego>"
disable-model-invocation: true
---

# Nuevo juego

Pedido: $ARGUMENTS

Leé primero `games/CLAUDE.md` (contrato) y usá `games/inmune-survivors/` como referencia de estructura.

1. Acordá con el usuario: slug (kebab-case), objetivo pedagógico, materia/año de la carrera, mecánica principal,
   controles PC + móvil. Si hay dudas de diseño, preguntá antes de generar código.
2. Creá:
   - `games/<slug>/index.html` — Phaser 3.90 desde cdnjs (misma versión que el resto), scripts con `?build=0.1.0`,
     rutas relativas, viewport móvil, UI de menú mínima.
   - `games/<slug>/src/config/` y `src/core/` — lógica pura en UMD (`module.exports` + `globalThis.Nombre`).
   - `games/<slug>/game.js` — escenas Phaser que consumen `src/`.
   - `games/<slug>/tests/<algo>.test.cjs` — al menos un test con `node:test`.
   - `games/<slug>/CLAUDE.md` — qué es, archivos, cómo probar (corto, como el de inmune-survivors).
   - `games/<slug>/CHANGELOG.md` con `## v0.1.0`.
   - `games/<slug>/docs/` para diseño y banco de preguntas si aplica.
3. Agregá el juego a la tabla de `games/CLAUDE.md` y un script `dev:<slug>` en `package.json` si conviene.
4. Verificá: `npm test`, `npm run check`, y abrilo con `python -m http.server` en el navegador integrado.
5. El workflow `.github/workflows/pages.yml` publica automáticamente cada carpeta de `games/` en `/juegos/<slug>/`.
