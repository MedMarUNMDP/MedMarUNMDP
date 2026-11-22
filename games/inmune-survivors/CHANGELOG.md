# Changelog — Inmune Survivors

Formato: la versión más nueva arriba. Al publicar una versión, agregá una sección nueva acá y subí `?build=` en index.html (ver CLAUDE.md del juego). El historial previo a v3.1 está en `README.txt`.

## v3.7.2

- Se saca el halo circular de las especies con cápsula y la membrana de las inclusiones: se veían como burbujas
  alrededor del enemigo. Todas las especies vuelven a tener solo el contorno de su forma.

## v3.7.1

- **Contornos**: la silueta se arma con una máscara sólida. Las zonas semitransparentes (halo de la cápsula, bordes
  suaves) dejaban un disco relleno en vez de un anillo. Se borró una mancha suelta de `virus_spiked.webp` que aparecía
  como un punto al lado del virus.
- **Pseudópodos**: apuntan al patógeno fagocitable más cercano (hasta 220 px más allá del alcance) y lo siguen. Giran y
  se estiran de forma gradual (suavizado exponencial) en vez de saltar. Al alcance lo rodean y aparece la mira.
- **Fagocitosis aprovechada**: gránulos, anticuerpos y citocinas no apuntan a patógenos que podés englobar. Solo les
  disparan si se juntan 4 o más cerca, porque la fagocitosis engloba de a uno.

## v3.7

**Agentes de ADN**
- Cada enemigo común es una especie concreta del catálogo de la cátedra (114 agentes, `src/data/agentes.js`), elegida
  dentro de su familia; los gusanos solo toman especies con forma de gusano.
- Texturas por especie horneadas una sola vez a partir de la pieza base, con variación por código: tinte, estiramiento,
  par/cadena/racimo, cápsula e inclusiones, espora terminal. En pantalla cada enemigo sigue siendo una sola imagen.
- La primera vez que aparece una especie en la partida se muestra su nombre (etiqueta y aviso "NUEVO AGENTE").
- Bestiario en la pausa y al terminar: agentes vistos, cuántos eliminaste y su ficha (qué es, qué produce, dato clave),
  validada por el revisor médico y por el autor.

## v3.6

**Fagocitosis**
- Pseudópodos orgánicos: tubos que se afinan, con una onda que viaja y punta redondeada. Sin blanco tantean
  alrededor de la membrana; con un patógeno fagocitable cerca, los dos se estiran y lo rodean.
- El blanco fijado lleva una mira giratoria y el ícono de fagocitable crece cuando está al alcance. Las primeras
  veces aparece "FAGOCITABLE · ACERCATE" y, al desbloquear Fagocitosis, un aviso explica qué buscan los pseudópodos.

**Subir de nivel**
- Cada tarjeta de vía muestra a la vista qué cambia en cada habilidad que tenés (antes había que tocar íconos chicos).

**Pantallas**
- Nitidez: el canvas se dibuja a la densidad de la pantalla (hasta ×2 en PC y ×1,5 en celular; ×1 en gama baja).
  El HUD va en su propia cámara para conservar sus posiciones.
- En PC con mouse y pantalla ancha el área de juego es apaisada; en celular sigue vertical.
- Safari: pantalla completa con la API `webkit` en Mac/iPad. En iPhone (que no la permite) el botón explica cómo
  agregar el juego a la pantalla de inicio, desde donde abre sin barras (manifest + meta de Apple).

**Movimiento**
- Parallax: capas de partículas y manchas que se mueven a distinta velocidad que la cámara y fluyen solas.
- Enemigos con animación propia: aparición con rebote, bacterias que se tambalean, virus que giran y laten, hongos
  que respiran y se hinchan antes de soltar esporas, parásitos que ondulan y jefes que respiran.

**Reportes**
- Botón "Reportar o sugerir" en la pausa y al terminar la partida: reportes anónimos a una planilla de Drive
  (se activa al configurar `REPORTES_URL`; ver `tools/reportes-apps-script/README.md`).

## v3.5.1

- Todas las imágenes pasan a WebP en su resolución original: sprites con calidad 90 (alfa al 100 %) y tejidos con
  calidad 95. `assets/` baja de ~17 MB a ~2,7 MB y una partida descarga ~1,5 MB de imágenes en vez de ~7,6 MB.
  Se compararon recortes al 200 % y a la escala del juego, sin diferencias visibles. Cómo regenerarlas: `assets/README.md`.
- Se borraron los PNG reemplazados y la imagen sin uso `parasite_segmented_reference`.
- Test `tests/assets.test.cjs`: sin PNG/JPG, cada textura con su WebP y ningún archivo de más de 300 KB.

## v3.5

Correcciones del diagnóstico 2026-11 (`docs/diagnostico-2026-11.md`) y controles de PC.

**Errores**
1. Subir de nivel ya no congela la partida (JUEGO-01): la selección de pregunta llamaba al azar sin el generador.
2. Estallido respiratorio activado por Fagocitosis nivel 3 ya no hace daño NaN (JUEGO-02): su nivel arranca en 1.
3. Volver al menú y empezar otra partida ya no puede dejar la arena en negro (JUEGO-14): el juego no se redimensiona
   a 0×0 mientras está oculto (tamaño mínimo de Phaser) y el loop duerme en el menú.
4. "Jugar otra vez" ya no acumula listeners de redimensión (JUEGO-06).

**Jugabilidad**
5. Jefes: siguen emergiendo en el centro de la arena; el aviso ahora lo dice y durante 1,6 s de entrada no hacen
   daño por contacto (antes podían aparecer encima del jugador y pegarle).
6. Homeostasis y Quimiotaxis solo ofrecen mejoras de habilidades que el jugador tiene; las generales (vida,
   defensa, velocidad, recolección) y las de Desgranulación siempre están (JUEGO-05).
7. Fagocitosis expansiva permite englobar patógenos grandes (brutos y élite) desde la primera vez (JUEGO-04).
8. Topes únicos en `LIMITS`: recarga mínima de fagocitosis 280 ms, de NETosis 2,7 s y hasta 7 redes simultáneas,
   vengan de la mejora que vengan.
9. Textos que no coincidían con el efecto: Barrera reforzada (−7 %), NETosis (+10 % de radio), Diferenciación y
   Reconocimiento de patrones (ahora incluyen el nivel), y el historial de evoluciones muestra el antes → después real.
10. Pregunta del frotis delgado: opciones plausibles reescritas para que respondan esa pregunta (revisadas con
    `revisor-contenido-medico`, OMS *Basic Malaria Microscopy*).

**Controles**
11. PC: ESC o P pausan y reanudan; mantener apretado el mouse mueve la célula hacia el puntero.
12. La partida se pausa sola al cambiar de app o pestaña.

**Otros**
13. Phaser con SRI y Content Security Policy (el juego comparte origen con la web).
14. Toda la aleatoriedad pasa por el generador inyectable (`this.rng`).
15. Se quitó el link roto al catálogo, el emoji de Parasitaria se ve en todos los sistemas y las versiones quedaron
    unificadas en 3.5.
16. Tests: arnés que corre la escena real en Node (`tests/helpers/arena-harness.cjs`) y 15 tests de escena.

## v3.4

INMUNE SURVIVORS v3.4 — CORRECCIONES DE VÍAS Y DESGRANULACIÓN

1. Las tarjetas de habilidades se generan desde una única tabla de efectos reales por vía. Solo aparecen si la habilidad está activa y esa vía modifica efectivamente alguno de sus parámetros.
2. Colaboración T-B queda asociada exclusivamente a Homeostasis, donde aumenta en +1 la capacidad de linfocitos B hasta el máximo de 8. Ya no aparece en Quimiotaxis ni Citotoxicidad.
3. Desgranulación aparece en las tres vías:
   - Homeostasis: +1 proyectil por descarga, hasta 10.
   - Quimiotaxis: intervalo de disparo ×0,96 (cadencia aproximada +4,17%), respetando el mínimo de 180 ms.
   - Citotoxicidad: daño por gránulo ×1,07 (+7%).
4. Se eliminaron previsualizaciones de efectos que no estaban implementados realmente en la aplicación de la vía. Se evita mostrar tarjetas sin efecto o con cifras engañosas.

Validación: node --check game.js y prueba de integridad del ZIP. No se realizó una prueba visual interactiva en navegador.

## v3.3

INMUNE SURVIVORS v3.3 — CAMBIOS

1. JEFES +50%
- Se multiplica por 1,5 la escala de los cuatro jefes.
- Se amplía proporcionalmente el ancho y longitud del helminto jefe.
- Los enemigos comunes mantienen un límite de escala y un tamaño visual máximo inferior al de los jefes; también se limita la longitud de helmintos no jefe.

2. PSEUDÓPODOS PERSISTENTES
- Al desbloquear Fagocitosis aparecen dos prolongaciones alrededor del jugador de forma permanente.
- Se orientan y extienden parcialmente hacia un objetivo fagocitable cercano; durante la acción de fagocitosis la animación de captura existente sigue encargándose del contacto.

3. INFORMACIÓN NUMÉRICA DE LAS MEJORAS
- El panel de detalle ahora separa ESTADO ACTUAL y EFECTO DE ESTA MEJORA.
- Para las habilidades con efecto directo se muestran valores antes/después, unidades y porcentaje o incremento concreto.
- Se explicita cuando una vía no modifica directamente una habilidad.

4. DESGRANULACIÓN: TRES VÍAS COMPLEMENTARIAS
- Citotoxicidad: +7% daño de cada gránulo; no cambia cadencia ni penetración.
- Quimiotaxis: reduce el intervalo de ataque un 4% (aumenta la cadencia aproximadamente 4,17%); no cambia el daño ni la penetración.
- Homeostasis tisular: +1 objetivo de penetración por gránulo (máximo 8); no cambia el daño ni la cadencia.
- Las mejoras secundarias de otras habilidades de cada vía se conservan.

5. COLABORACIÓN T-B
- Al desbloquearse aparecen 2 linfocitos B como base.
- Se suma 1 adicional cada 8 bajas, hasta el límite de la habilidad.

PRUEBAS
- Sintaxis JavaScript validada con `node --check game.js`.
- No se ejecutó una partida completa en navegador; se recomienda probar en juego los cuatro jefes, pseudópodos y la progresión de las tres vías.

## v3.2

INMUNE SURVIVORS v3.2 — CAMBIOS

1. INMUNOGLOBULINAS (LINFOCITOS B)
- Los proyectiles de anticuerpos fijan un objetivo y realizan seguimiento curvo durante el vuelo.
- Si el objetivo muere antes del impacto, buscan otro enemigo cercano.
- Al tocar al enemigo se adhieren a su superficie y aplican daño periódico durante más tiempo; ya no hacen el daño de impacto inicial además del daño adherido.

2. JERARQUÍA VISUAL DE TAMAÑOS
- Se refuerza la escala visual general: parásitos > bacterias >= hongos >= virus.
- Se mantiene variación por arquetipo (runner, estándar, brute y élite) y por escalado de partida.

3. PRIORIDAD DE DISPARO Y FAGOCITOSIS
- Cuando hay un enemigo realmente fagocitable dentro del radio y la fagocitosis está lista, el sistema de disparo automático deja de priorizarlo.
- Se restringe la selección de fagocitosis a enemigos marcados como elegibles, evitando ignorar disparos hacia enemigos que no pueden englobarse.

4. POLARIZACIÓN FUNCIONAL M1/M2
- Se exige un mínimo de 90 segundos continuos en M1 antes de poder pasar a M2.
- También se exige una cantidad de bajas creciente con el tiempo: comienza en 34 y aumenta gradualmente (hasta un máximo de 180).
- M2 dura 24 segundos; luego vuelve a M1 y reinicia el período mínimo de ataque.

5. PSEUDÓPODOS DE FAGOCITOSIS
- Al activar la fagocitosis, dos prolongaciones visuales se extienden hacia el objetivo seleccionado.
- La animación se dirige exclusivamente al objetivo de esa activación. Si el blanco muere o deja de ser válido antes del contacto, no se fagocita otro por error.

6. HELMINTO ANCESTRAL
- El contacto del jefe helminto limita el daño a un máximo del 22% de la salud máxima del jugador por impacto (sin superar el daño base del ataque).

7. PROGRESIÓN DE PREGUNTAS Y MULTIRRESISTENCIA
- Al agotarse el banco, las preguntas vuelven a habilitarse si todavía no se derrotaron los cuatro jefes únicos de la partida.
- Multirresistencia solo se activa cuando se registraron las bajas de Colonia primordial, Virión titánico, Micelio ancestral y Helminto colosal durante esa misma partida.

VALIDACIÓN
- Se verificó la sintaxis de game.js con `node --check`.
- No se realizó una prueba visual automatizada en navegador ni una partida completa; se recomienda validar especialmente el vuelo/adherencia de anticuerpos, la animación de pseudópodos y la progresión hasta Multirresistencia.

## v3.1

Inmune Survivors v3.1 — ajustes de jefes, macrófagos y estrategia

CAMBIOS
- El biofilm del jefe Colonia primordial ahora deja una huella circular y dura 26 segundos.
- El tamaño de los enemigos aumenta junto con su vida, con un tope de crecimiento de alrededor de 48% conforme avanza la partida (tope alcanzado antes de 10 minutos).
- Polarización M2 de macrófagos exige 24 bajas, dura 30 segundos, suspende el daño y pone a las células en órbita alrededor del jugador mientras lo curan poco a poco con un halo verde azulado leve. Luego vuelven a M1 y deben acumularse otras 24 bajas.
- Al tocar un sprite de habilidad en el menú de estrategia, su descripción y efecto aparecen en un panel debajo de las tarjetas; el texto de la mejora básica sigue visible en su tarjeta.
- El símbolo de Quimiotaxis ahora es una flecha de dirección más simple y legible.
- Las inmunoglobulinas orientan sus regiones Fab hacia la dirección de movimiento.
- Los linfocitos B orbitan más lejos y cada uno dispara inmunoglobulinas desde su propia posición.
- El marcador de fagocitosis pulsa lentamente entre 40% y 80% de opacidad.
- Los proyectiles de esporas comunes tienen halo y brillo interior más legibles sin aumentar su tamaño central.
- Los agentes más rápidos pueden atravesar grupos con más facilidad; la separación suave evita que una aglomeración impulse enemigos hacia el jugador.
- El helminto primordial gira con menor velocidad angular para hacer sus cambios de rumbo más previsibles.

CONTROLES
PC: WASD o flechas; ataque automático; botón Pausar para ver el informe. Móvil: tocar y arrastrar para moverse; Pausar/Salir quedan en el borde inferior.

VALIDACIÓN
Sintaxis JavaScript comprobada con Node.js. El modo M2 y el movimiento necesitan validación final dentro de una partida en teléfono y escritorio.
