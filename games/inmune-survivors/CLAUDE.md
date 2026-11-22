# Inmune Survivors

Survivor de arena (estilo "bullet heaven") educativo: un progenitor hematopoyético defiende un tejido
infectado. Ataque automático; el jugador solo se mueve. Subir de nivel = responder una pregunta de
inmunología/microbiología (acierto → mejora de vía; error → oleada extra). Versión actual: **3.8**. Modos: **Sandbox infinito** y **Foco por núcleo**,
con ranking en MedMar.

## Archivos

- `index.html` — entrada, UI de menús/HUD en HTML+CSS, carga Phaser 3.90 (cdnjs) y los scripts con `?build=`.
- `game.js` — escena Phaser `Arena` (~1.900 líneas, muchas muy largas) + tablas de datos al principio:
  `INFECTIONS`, `TISSUE_VISUALS`, `INFECTION_DIFFICULTIES`, `EVOLUTION_DIFFICULTIES`, `MORPHOLOGY`,
  `BOSS_MORPHOLOGIES`, `QUESTION_BANK` (83 preguntas), `PLAUSIBLE_OPTIONS`, `EVOLUTION_STRATEGIES`.
- `src/config/game-balance.js` — límites, multiplicadores y efectos por vía (fuente única de verdad de las tarjetas).
- `src/core/runtime-services.js` — `Rng`, `Clock`, `Storage` inyectables (tests reproducibles).
- `src/core/lab-actions.js` — acciones del modo Laboratorio.
- `src/core/modos.js` — modos de juego (agentes, pesos por familia, tejido y jefes de cada núcleo), fórmula del
  puntaje y topes de plausibilidad. **La fórmula y los topes están duplicados en `supabase/functions/api`
  (`guardarPuntaje`)**: si cambian, cambialos en los dos lados.
- `src/data/agentes.js` — catálogo ADN 2026: 114 agentes por núcleo, morfologías, rasgos y jefes. `src/data/fichas.js` —
  fichas validadas (clase, cuadro, dato clave). Cambiar contenido médico → `revisor-contenido-medico` + validación del autor.
  Cada enemigo común toma una especie de su familia y su textura se "hornea" una vez (`getSpeciesTexture`).
- `tests/*.test.cjs` — `node:test` sobre los módulos de `src/` y sobre la escena completa.
- `tests/helpers/arena-harness.cjs` — corre la escena `Arena` real en Node con Phaser simulado y RNG con semilla
  (`createScene({ seed })`, `flushTweens()`). Usalo para reproducir bugs y simular partidas sin navegador.
  Los bugs conocidos van como tests `{ todo }` (el deploy corre `npm test`: un test rojo bloquea la web).
- `docs/diagnostico-2026-11.md` — diagnóstico vigente (bugs JUEGO-xx, arquitectura, rendimiento móvil, tests).
- `docs/diagnostico-v3.4.md` (texto del PDF) — diagnóstico técnico y guía de diseño: fórmulas, bugs conocidos, propuestas.
- `docs/catalogo-preguntas.md` — catálogo legible de preguntas y respuestas.
- `CHANGELOG.md` (v3.1+) y `README.txt` (historial anterior y controles).
- `iniciar_juego.py`, `INICIAR_LOCAL.bat`, `INICIAR_MOVIL.bat` — servidores locales (PC y prueba en celular por Wi-Fi).

## Cómo trabajar

- Para ubicar código: `Grep` por nombre de método o constante y leé por rangos (`offset`/`limit`). No leas `game.js` entero.
- **Dirección de la refactorización**: sacar lógica pura de `Arena` hacia `src/` (patrón UMD como `game-balance.js`)
  y cubrirla con tests. El texto que ve el jugador debe derivarse de los mismos datos que aplican el efecto
  (el diagnóstico encontró mejoras cuyo texto no coincide con lo que hacen).
- Aleatoriedad y tiempo siempre vía `this.rng` / `this.clock` (runtime-services), no `Math.random()`/`Date.now()` directos.
- Rendimiento móvil es prioridad: respetá topes de enemigos/efectos, reutilizá texturas, evitá redibujar por frame.
- Preguntas: el contenido médico debe ser correcto y estar validado con bibliografía. Para agregar o revisar
  preguntas, usá el subagente `revisor-contenido-medico`. Mantené sincronizado `docs/catalogo-preguntas.md`.

## Verificar

```bash
npm test                 # desde la raíz
npm run check
npm run dev:juego        # http://localhost:5501 → probar en el navegador integrado (escritorio y viewport móvil)
```

Para probar mecánicas sin jugar: modo **Laboratorio** desde el menú (habilidades, stats, enemigos, jefes, focos).

## Publicar una versión

Skill `/publicar-juego`: sube `?build=` en `index.html` y `iniciar_juego.py`, agrega sección al `CHANGELOG.md`, corre checks.
