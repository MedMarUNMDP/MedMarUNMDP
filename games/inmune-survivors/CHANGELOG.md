# Changelog — Inmune Survivors

Formato: la versión más nueva arriba. Al publicar una versión, agregá una sección nueva acá y subí `?build=` en index.html (ver CLAUDE.md del juego). El historial previo a v3.1 está en `README.txt`.

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
