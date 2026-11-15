# Inmune Survivors — Diagnóstico técnico (noviembre 2026)

Revisión de la versión publicada (v3.4, `?build=3.4.1`) hecha el 2026-11-15. Complementa el
[diagnóstico v3.4](diagnostico-v3.4.md), que sigue siendo la referencia para fórmulas, balance y diseño de
habilidades: acá se verifica qué sigue roto de aquel documento y se agrega lo nuevo.

> **Actualización: v3.5 (2026-11-15).** Corregidos JUEGO-01, 02, 04, 05, 06, 07, 08, 09, 10, 11, 12 y 13, los topes
> duplicados, Phaser sin SRI/CSP y un bug nuevo que apareció al probar:
> - **JUEGO-14**: al volver al menú en el celular se sale de pantalla completa y Phaser se redimensionaba a 0×0 con el
>   juego oculto, así que la siguiente partida se veía negra ("Framebuffer status: Incomplete Attachment"). También
>   pasaba en v3.4. Se corrigió con `scale.min` y durmiendo el loop en el menú.
>
> **JUEGO-03 no era un bug**: los jefes emergen en el centro por diseño. Se corrigió el aviso, que decía "desde fuera
> de la arena", y se agregaron 1,6 s de entrada sin daño por contacto.
>
> Homeostasis y Quimiotaxis son vías de atributos generales: solo ofrecen mejoras de habilidades que el jugador
> tiene, más las generales y las de Desgranulación.
>
> Siguen pendientes (ver el roadmap): peso de assets, nitidez HiDPI, pools de objetos, ritmo de XP, la pista de la
> opción más larga en el banco de preguntas y el refactor por etapas.

**Método**
- Lectura del código: `game.js`, `index.html`, `src/` y tests.
- Pruebas en el navegador integrado: escritorio y viewport de celular de 375×812, menú, partida, Laboratorio
  y reinicio.
- Un **arnés nuevo** (`tests/helpers/arena-harness.cjs`) carga la escena `Arena` real en Node con Phaser simulado
  y RNG con semilla. Con él se simularon partidas completas con un bot y se escribieron tests de la escena
  (`tests/arena-simulacion.test.cjs`).
- Análisis del banco de preguntas y de los assets.

---

## 0. Resumen

| | |
|---|---|
| **Estado** | **El juego se congela en la primera subida de nivel** (JUEGO-01). Pasa en la versión publicada en medmar.com.ar/juegos/inmune-survivors/. Hoy no se nota porque la web no linkea el juego. |
| **Bugs del diagnóstico v3.4** | El NaN de Estallido respiratorio sigue sin corregir (JUEGO-02). T-B, el progreso fraccionario de macrófagos y los botones del Laboratorio ya están corregidos. |
| **Arquitectura** | Una clase `Arena` de ~1.450 líneas mezcla simulación, render, reglas, textos y Laboratorio. El código está en líneas de hasta 2.248 caracteres. La separación con la UI (eventos `is:*`) y los servicios inyectables (`Rng`, `Clock`, `Storage`) van en la dirección correcta. |
| **Móvil** | La primera partida descarga **~7,6 MB** (casi todo PNG; el fondo de tejido solo pesa 1,7 MB). El canvas no usa la densidad de pantalla, así que se ve borroso en celulares. No se pausa al cambiar de app. |
| **PC** | Solo hay teclado (WASD/flechas). `ESC` está registrada pero no pausa, y con mouse no te podés mover. |
| **Contenido** | En el 70 % de las preguntas la respuesta correcta es la opción más larga, una pista que se puede explotar. Hay una pregunta cuyas opciones "plausibles" responden otra cosa (JUEGO-08). |
| **Ritmo** | En simulaciones de 40 min salen solo 5–14 preguntas y nunca se llega a la multirresistencia (§6). |
| **Tests** | Antes: 8 tests sobre `src/`, ninguno sobre la escena. Ahora: 14 en total. 3 nuevos pasan; los otros 3 nuevos quedan como `todo` y reproducen JUEGO-01, 02 y 03. |

---

## 1. Arquitectura actual

```
index.html  ─ menú, HUD y modales en HTML/CSS (34 KB, CSS inline)
  ├─ Phaser 3.90 (cdnjs, sin SRI)
  ├─ src/core/runtime-services.js   Rng · Clock · Storage inyectables (UMD)
  ├─ src/config/game-balance.js     efectos por vía (fuente única de las tarjetas)
  ├─ src/core/lab-actions.js        acciones del Laboratorio
  └─ game.js (IIFE, 1.921 líneas, 219 KB)
       ├─ tablas de datos: INFECTIONS, MORPHOLOGY, QUESTION_BANK (83), PLAUSIBLE_OPTIONS, EVOLUTION_STRATEGIES…
       ├─ class Arena extends Phaser.Scene   (~100 métodos: spawn, combate, IA, habilidades, preguntas, HUD, lab)
       └─ código de menú/DOM: listeners de botones, render de modales, pantalla completa
            ↑ eventos window 'is:*' (question, upgrades, pause, game-over…)  ↓ window.IS_ACTIONS
```

### Decisiones de diseño que están bien
- **Puente UI ↔ escena por eventos**: la escena emite `is:*` y el DOM dibuja los modales. Los modales en HTML son
  accesibles, nítidos y fáciles de estilar en móvil. Es mejor que dibujar UI dentro del canvas.
- **Servicios inyectables** (`Rng`, `Clock`, `Storage`): permiten simulaciones deterministas. El arnés nuevo se
  apoya en esto.
- **Topes por dispositivo**: enemigos (42–68), ADN (64/96) y textos flotantes (14/24) según núcleos, memoria y
  tipo de puntero. También hay topes de gusanos simultáneos.
- **Delta acotado** (`dt` ≤ 42 ms): evita saltos y túneles cuando un frame tarda mucho.
- **Texturas de silueta cacheadas** por textura (`getEnemyOutlineTexture`) en vez de dibujarlas por frame.

### Decisiones dudosas
| Tema | Qué pasa | Por qué importa |
|---|---|---|
| Clase dios | `Arena` concentra spawn, IA de 5 familias, combate, 14 habilidades, preguntas, colonias, HUD, textos de tarjetas y Laboratorio. | Cada cambio toca el mismo archivo. Un error en un subsistema rompe todo el loop (pasó con JUEGO-01). |
| Código "minificado a mano" | Hay métodos enteros en una línea; la más larga tiene 2.248 caracteres. | Los diffs de git no se pueden revisar, los stack traces apuntan a una línea con 20 sentencias y Claude/colaboradores tienen que leer bloques enormes. |
| Estado disperso con defaults repetidos | `this.macrophageCap`, `this.complementChance`, `this.differentiationBonus`… viven fuera de `stats` y se leen con `\|\| valorPorDefecto` en varios lugares. | El default puede no coincidir entre lugares (fue la causa del bug de T-B) y no hay un estado inicial único. |
| Topes duplicados e inconsistentes | Recarga mínima de fagocitosis: **280** (evolución), **300** (Devorador), **350** (vía y alternancia), **360** (Ritmo fagocítico). NETosis: **2700**, **2800**, **3300**. Redes: máximo **6** (vía) o **7** (evolución). | El mismo atributo tiene topes distintos según de dónde venga la mejora. `LIMITS` de `game-balance.js` existe pero no se usa en `game.js`. |
| Mejoras que no hacen nada | Las básicas de Homeostasis (radio y ritmo de fagocitosis, curación) y de Quimiotaxis (red) se aplican aunque la habilidad no esté desbloqueada. | El jugador elige una mejora y no cambia nada, el mismo problema que v3.4 corrigió solo para las tarjetas de habilidades. |
| Variables globales mutables | `W` y `H` son `let` del módulo y las modifican el resize y el menú. | Un segundo juego o escena compartiría el tamaño. Es difícil de testear. |
| Datos + motor + DOM en un archivo | El banco de preguntas (con su contenido médico), la escena y los listeners de botones viven en el mismo IIFE. | Revisar contenido médico obliga a tocar el archivo del motor; no se puede cargar el banco sin el juego. |
| Laboratorio público | El modo de pruebas está en el menú de producción. | Está bien para un prototipo. Cuando haya ranking, las partidas del Laboratorio no deben poder enviar puntaje. |

---

## 2. Bugs y comportamientos inesperados

Severidad: **Crítica** = rompe la partida; **Alta** = el jugador lo nota y lo perjudica; **Media** = raro o
inconsistente; **Baja** = detalle.

| # | Sev. | Qué pasa | Dónde | Evidencia |
|---|---|---|---|---|
| JUEGO-01 | **Crítica** | **La partida se congela en la primera subida de nivel.** `selectUnusedQuestion` llama `randomItem(lista)` pero la firma es `randomItem(rng, lista)` → `TypeError: rng.pick is not a function`. Como `openQuestion` ya puso `questionPaused = true` y descontó la XP, la escena queda en pausa sin modal. | `game.js` `selectUnusedQuestion` | Reproducido en el navegador (Laboratorio → "Probar" pregunta) y en el arnés. En la simulación el bot llega a la primera pregunta entre los 67 y 74 s de juego. Test `todo` JUEGO-01. |
| JUEGO-02 | **Alta** | **Estallido respiratorio con daño NaN** (ya informado en v3.4, sigue igual). Fagocitosis nivel 3 activa `respiratory_burst` sin definir su nivel; el radio tiene un valor por defecto, pero el daño hace `7 + undefined*4`. Los enemigos alcanzados quedan con vida `NaN` y no mueren nunca, y `damageTotal`/DPS pasan a NaN. | `doPhagocytosis`, `applySkillEvolution` | Test `todo` JUEGO-02 (falla por NaN). |
| JUEGO-03 | **Alta** | **Los jefes aparecen en el centro de la arena**, que es donde empieza el jugador. El aviso dice "se aproxima desde fuera de la arena". Si estás en el centro, el jefe aparece encima tuyo y pega por contacto. | `spawnBoss` (`spawnAt = CENTER`) | Test `todo` JUEGO-03: distancia 0 px. |
| JUEGO-04 | Media | **"Fagocitosis expansiva" no habilita nada la primera vez.** Los tamaños de enemigo son 0 y 2 (no hay 1), y la mejora sube de a +1 (ya estaba en v3.4). | `archetypes` en `spawnEnemy`, `EVOLUTION_STRATEGIES` | Lectura de código. |
| JUEGO-05 | Media | **Mejoras sin efecto** si la habilidad no está desbloqueada (ver §1). | `EVOLUTION_STRATEGIES.basics` | Lectura de código. |
| JUEGO-06 | Media | **El listener de resize se acumula en cada partida.** `createCamera` registra `this.scale.on(RESIZE)` en el ScaleManager global y nunca lo saca: cada "Jugar otra vez" suma uno que mantiene viva la escena anterior. No tira errores, pero es una fuga de memoria. | `createCamera` | Probado en el navegador con 2 reinicios + resize: sin errores, los listeners quedan. |
| JUEGO-07 | Media | **Textos que no coinciden con el efecto** (ya en v3.4): "Barrera reforzada −10 %" aplica −7 %; "NETosis +8 %" aplica ×1,10. | `EVOLUTION_STRATEGIES`, `skillOptionLabel` | Lectura de código. |
| JUEGO-08 | Media | **Pregunta con opciones de otra pregunta.** En `hard-blood-smear-quant-01` ("¿Qué uso principal tiene el frotis delgado…?"), en Estudiante/Infectólogo las opciones plausibles explican *cómo se calcula* la parasitemia. La "correcta" no responde la pregunta. | `PLAUSIBLE_OPTIONS` | Análisis automático: es la única de las 37 con opciones plausibles sin relación con la respuesta original. |
| JUEGO-09 | Media | **No se pausa al salir de la app o cambiar de pestaña.** Phaser deja de dibujar, pero al volver la partida sigue al instante, sin el menú de pausa. En PC, `ESC` está registrada y no hace nada. | `createControls` (`ESC`, `E` sin uso), `update` | Lectura de código. |
| JUEGO-10 | Media | **Aleatoriedad fuera del `Rng`.** `Phaser.Math.FloatBetween` (2 usos: esporas del jefe) usa `Math.random`. | `spawnBossSpore` | `grep`. Rompe la reproducibilidad que buscan los servicios inyectables. |
| JUEGO-11 | Baja | **Link roto** "Ver preguntas y respuestas" → `./CATALOGO_PREGUNTAS_v1.9.md` (404). Además, el catálogo vive en `docs/`, que no se publica. | `index.html` | `curl` → 404. |
| JUEGO-12 | Baja | **Versiones mezcladas**: cabecera de `game.js` "v2.9", `iniciar_juego.py` "v2.9", `.bat` "v3.0", título "v3.4", `?build=3.4.1`. | varios | `grep`. |
| JUEGO-13 | Baja | **Emoji 🪱 (Parasitaria)** se ve como un cuadrado en sistemas sin Unicode 13 (Windows 10 y Android viejos). | `index.html` | Visto en el navegador integrado. |

### Ya corregidos desde v3.4 (verificado)
- T-B: el tope inicial ahora sube de 2 a 3 (`increaseBCellCap`, cubierto por test).
- Homeostasis ya no suma 0,05 al tope de macrófagos (el efecto se eliminó de `PATH_EFFECTS`).
- Los botones de atributos del Laboratorio escriben en la escena y no en `stats` (`lab-actions`, cubierto por test).

---

## 3. Rendimiento y experiencia móvil

| Tema | Hallazgo | Propuesta |
|---|---|---|
| **Peso de carga** | La primera partida transfiere **~7,6 MB** (38 recursos): tejido 1,7 MB (PNG 1254² que se muestra recortado), 4 jefes + 4 focos de ~350 KB c/u y 12 microbios PNG de ~150–240 KB. En `assets/` hay 16 archivos sin usar (~0,5 MB): webp que no se cargan y `parasite_segmented_reference`. | Pasar todo a WebP a 256–512 px. Los webp de tejido ya existen (20–36 KB). Estimado: **< 1 MB** por partida. Borrar los duplicados. |
| **Nitidez** | Phaser 3.60+ ignora la opción `resolution`, así que el canvas se dibuja en píxeles CSS (375×812 con DPR 2): todo se ve escalado y borroso. Solo los textos usan `setResolution(2)`. | Tamaño de juego = CSS × min(DPR, 2) con `zoom` 1/DPR, o aceptar la borrosidad a cambio de rendimiento, pero que sea una decisión explícita. |
| **Asignaciones por frame** | Cada golpe, baja, estela o burbuja crea un `circle`/`graphics` nuevo con su tween y lo destruye. No hay pools. | Pools para proyectiles, partículas y textos (Phaser `Group` con `get`/`killAndHide`). Reduce las pausas del recolector en gama baja. |
| **Algoritmos** | Separación de enemigos O(n²) (68² ≈ 4.600 pares por frame) y colisión de proyectiles O(balas × enemigos). | Con los topes actuales alcanza. Si se suben los topes, usar una grilla espacial simple. |
| **Simulación** | El paso de simulación depende del frame rate (`dt` con tope de 42 ms): bajo 24 fps el juego va en cámara lenta. | Aceptable para el género. Documentarlo o usar un paso fijo con acumulador. |
| **Phaser completo** | Se carga el build completo (~1,2 MB min), pero el juego no usa física ni otros sistemas grandes. | Evaluar un build a medida (sin Arcade/Matter) o al menos cachearlo bien. |
| **Pausa automática** | Ver JUEGO-09. | `visibilitychange`/`blur` → `pauseGame()`. |

### PC
- Solo teclado. Agregar: pausa con `ESC`/`P`, y movimiento con mouse (mantener apretado y la célula sigue al
  puntero) para quien juega con trackpad.
- El joystick virtual solo aparece con toques. Eso está bien, pero el texto de ayuda del menú debería decir
  qué controles hay en cada plataforma.

---

## 4. Seguridad (mismo origen que la web)

El juego se sirve en `medmar.com.ar/juegos/…`, **el mismo origen que la red social**: comparte el
`localStorage` donde supabase-js guarda la sesión. Un script comprometido en el juego podría leer el token
de cualquier usuario logueado.

- **Phaser se carga de cdnjs sin `integrity` (SRI)** y sin CSP. La web ya usa SRI + CSP: el juego debería
  hacer lo mismo antes de enlazarlo desde la web.
- Los modales usan `textContent` para las preguntas (bien). Los `innerHTML` que hay son con datos del propio
  código (SVG de íconos, Laboratorio).
- El puntaje es local (`localStorage` `is_best_*`). Para el ranking, la validación de plausibilidad en el
  servidor que propone `games/CLAUDE.md` sigue siendo necesaria: cualquier puntaje del cliente se puede falsificar.

---

## 5. Contenido educativo

- **83 preguntas** (25 fáciles, 28 normales, 30 difíciles). No hay IDs duplicados ni índices fuera de rango, y
  todas tienen explicación y fuente.
- **La respuesta correcta es la única opción más larga en el 70 % de los casos**: 58 de 83, contando las opciones
  plausibles (sin ellas, 63). Es la pista clásica de "elegí la más larga" y le resta valor a la evaluación.
  `PLAUSIBLE_OPTIONS` mejora algunas, pero no alcanza. Conviene igualar las longitudes de las opciones.
- **Temas desbalanceados**: Parasitología 16, Virología 14 y Bacteriología 12, contra 1 de Epidemiología y
  1 de Patogenia.
- Cada pregunta muestra "Pregunta provisional: verificar contra la bibliografía". Antes de usar el juego como
  recurso formal, hay que pasar el banco por el subagente `revisor-contenido-medico`.

---

## 6. Simulación de partidas (arnés nuevo)

Bot simple: se aleja de los enemigos y va al ADN más cercano. RNG con semilla 1 y 2. Como JUEGO-01 congela la
partida, para estas corridas se parcheó `selectUnusedQuestion` en memoria (el juego no se modificó).

**Bot real** (muere): sobrevive entre 77 y 211 s, con 1–2 preguntas y 31–158 bajas. Una persona juega mejor que
este bot, así que **no sirve para medir balance**. Lo que sí muestra es que la primera pregunta llega a los
~67–74 s, que es justo cuando aparece JUEGO-01.

**Bot invulnerable** (estrés de sistemas, hasta 40 min de juego): ver resultados abajo.

| Vía elegida | Infección | Bajas | Jefes | Preguntas | Mejoras de vía | Focos | Habilidades al final |
|---|---|---|---|---|---|---|---|
| Homeostasis | viral | 1.465 | 5 | 13 | 12 | 0 | solo Desgranulación |
| Homeostasis | fúngica | 952 | 8 | 10 | 7 | 6 | 6 habilidades |
| Citotoxicidad | fúngica | 825 | 9 | 9 | 7 | 2 | Desgranulación, Anticuerpos |
| Citotoxicidad | parasitaria | 1.636 | 6 | 14 | 11 | 0 | solo Desgranulación |
| Quimiotaxis | parasitaria | 256 | 2 | 5 | 2 | 0 | solo Desgranulación |
| Quimiotaxis | bacteriana | 524 | 9 | 10 | 4 | 5 | 6 habilidades |
| Alternada | bacteriana | 1.503 | 8 | 13 | 9 | 4 | 5 habilidades |
| Alternada | viral | 870 | 6 | 10 | 5 | 0 | solo Desgranulación |

Lo que confirman 8 partidas de 40 minutos (~11 min de CPU en total):
- **Estabilidad**: ningún error, ningún NaN en `stats` ni en la vida de los enemigos (fuera del caso de JUEGO-02,
  que el bot no llegó a disparar). El tope de enemigos se respeta: el máximo fue 69, que es el tope de 68 más el
  margen que tienen los jefes. El ADN en pantalla nunca pasó de 40 (tope 96).
- **Ritmo de preguntas muy lento**: entre **5 y 14 preguntas en 40 minutos**, porque la XP pedida crece hasta
  ~1.500. La multirresistencia (que exige agotar el banco y vencer los cuatro jefes) **no se alcanzó en ninguna
  partida**. El diagnóstico v3.4 calculaba 25–30 pausas por partida: con la curva actual, una persona real
  difícilmente vea el final del juego. Conviene medir el tiempo por pregunta con jugadores reales.
- **Mejoras desperdiciadas (JUEGO-05)**: en 4 de las 8 partidas la única habilidad fue Desgranulación. Por
  ejemplo, "Homeostasis/viral" eligió 12 mejoras de Homeostasis, que en su mayoría mejoran la fagocitosis, sin
  tener fagocitosis.
- **Pocos jefes**: entre 2 y 9 en 40 minutos (el primero llega a los 4 min y después cada 4 min).

Estas corridas son con el jugador invulnerable y un bot sin estrategia: sirven para la estabilidad y para el
ritmo de XP, no para medir la dificultad.

---

## 7. Tests

| Archivo | Qué cubre |
|---|---|
| `tests/helpers/arena-harness.cjs` (nuevo) | Carga `game.js` en `vm` con Phaser simulado: objetos comodín encadenables, tweens que se completan a mano con `flushTweens()`, RNG mulberry32 con semilla y DOM mínimo. Sin dependencias. |
| `tests/arena-simulacion.test.cjs` (nuevo) | Estado inicial · determinismo (misma semilla → misma partida) · 45 s de partida respetan los topes y no hay NaN · **todo**: JUEGO-01, 02 y 03. |
| `tests/gameplay-rules.test.cjs` | Efectos de vía, T-B y Laboratorio (`src/`). |
| `tests/runtime-services.test.cjs` | `Rng`/`Storage`. |
| `tests/baseline-regression.test.cjs` | Cantidad de preguntas por dificultad y Phaser 3.90 en el HTML. |

Los bugs conocidos son tests `todo`: `node --test` los corre y los informa, pero no fallan. El deploy de
Pages corre `npm test`, así que un test rojo bloquearía también la web. Al corregir un bug, se le saca el `todo`.

**Límites del arnés**: no prueba el render, el input real ni la UI HTML, y los tweens se resuelven al instante.
Para eso hace falta un test de humo en navegador (Playwright), que ya está en el roadmap de la web.

**Próximos tests sugeridos**:
- invariantes por mejora (cada tarjeta cambia al menos un número de `stats` o de la escena);
- topes únicos (ninguna recarga baja de `LIMITS`);
- banco de preguntas (la correcta no siempre es la más larga, opciones plausibles relacionadas);
- tiempo hasta cada pregunta por dificultad.

---

## 8. Refactorización propuesta (por etapas, sin cambiar el juego)

1. **Corregir JUEGO-01/02/03** y sacarles el `todo` a sus tests. Son cambios de una o dos líneas.
2. **Formatear `game.js`** (un método por bloque, una sentencia por línea) sin cambiar la lógica. Con el arnés y
   los tests de simulación se verifica que la partida con semilla dé el mismo resultado antes y después.
3. **Extraer datos** a `src/data/` (preguntas, morfologías, estrategias) en UMD. El banco queda revisable aparte y
   se puede testear su calidad.
4. **Estado inicial único** (`createInitialState()` en `src/`): todos los atributos de habilidades con su valor
   inicial y un solo lugar para los topes (`LIMITS`). Las mejoras leen y escriben ahí, sin `|| default`.
5. **Sistemas** como propone §10 del diagnóstico v3.4 (Spawn, Combate, Habilidades, Progresión, Preguntas),
   cada uno con tests sobre el arnés.
6. **Rendimiento móvil**: WebP, pools, nitidez y pausa automática (§3).
7. **Integración con MedMar**: SRI + CSP, enlace desde `#vistaJuegos` y ranking con validación en el servidor.
