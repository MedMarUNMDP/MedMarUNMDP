<!-- Texto extraído automáticamente de diagnostico-v3.4.pdf (las tablas pueden verse desalineadas; ante dudas, el PDF es la fuente). -->

Inmune Survivors v3.4 — Diagnóstico
técnico y guía de diseño
Análisis estático de game.js  (1.937 líneas), index.html , iniciar_juego.py , README y
notas de versión. No ejecuté el juego en un navegador ni medí FPS: todo sale de leer el
código y de calcular sus fórmulas. Lo que es inferencia lo marco como tal. Los números de
línea son aproximados.
1. Resumen ejecutivo
Inmune Survivors es un survivor de arena (estilo Vampire Survivors) en el que un
progenitor hematopoyético defiende un tejido infectado. El ataque es automático, el
jugador sólo se mueve, y el motor de progresión no es un nivel clásico sino una pregunta
de inmunología o microbiología: acertar da una mejora, fallar invoca una oleada extra.
Cuando se agota el banco de preguntas el tejido entra en Multirresistencia, una crisis sin
salida que cierra la partida.
Lo mejor del proyecto: idea pedagógica bien integrada al loop, tablas de datos para
morfologías, infecciones y vías (parte del código ya es data-driven), ajuste de rendimiento
para móviles (topes de enemigos, texturas cacheadas, contornos generados una vez) y un
modo Laboratorio para probar.
Hallazgos más importantes (detalle en las secciones 7 a 9):
1. Bug probable de NaN  en Estallido respiratorio. Al activarse por Fagocitosis nivel 3 el
daño se calcula con un nivel indefinido; los enemigos alcanzados quedarían con vida
NaN  y no morirían por daño.
2. Varias mejoras no hacen lo que prometen: Colaboración T-B (primera mejora), cap de
macrófagos, «Redes simultáneas», «Fagocitosis expansiva», Perfil diferencial sobre
linfocitos B y «Barrera reforzada».
3. La clase Arena  concentra ~1.490 líneas y ~100 métodos (render, input, HUD, IA,
combate, progresión, preguntas, puntaje, persistencia y depuración). Viola SRP, OCP y
DIP de forma sistemática.
4. La verdad está duplicada: el texto de cada mejora se escribe a mano junto a la lógica
que la aplica y deriva (por eso hay discrepancias numéricas).
5. Rendimiento: sin object pooling ni partición espacial; los gusanos jefe redibujan ~225
segmentos cada 36 ms y se testean segmento a segmento contra cada proyectil.
6. Sin pruebas automáticas (sólo node --check ) y versiones inconsistentes entre
archivos.
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 1 of 17

2. Qué es el juego
2.1 Bucle principal
1. Te movés por una arena circular (radio 1.110 en un mundo de 3.000×3.000). El disparo
es automático al enemigo más cercano dentro de 260 px.
2. Los patógenos aparecen fuera de pantalla, te persiguen y te dañan por contacto. Al
morir sueltan ADN/ARN (XP).
3. Al llenar la barra de XP el juego se pausa y aparece una pregunta. Acierto: elegís una
de tres vías (Homeostasis, Citotoxicidad o Quimiotaxis). Error: no hay mejora y
aparece una oleada extra.
4. Cada ~52 s aparece un foco infeccioso: pisarlo 1,4 s lo sana, te cura y abre una
elección de habilidad (nueva o evolución).
5. Cada 240 s llega un jefe. Cuando se acaban las preguntas comienza Multirresistencia
y la partida sólo puede terminar en derrota; el puntaje decide.
2.2 Configuración de partida
Infección (familia dominante de enemigos y mapa):
Dificultad de infección (combate):
Dificultad de evolución (banco de preguntas): No cursé = FÁCIL (25 preguntas, ×0,75),
Estudiante = NORMAL (28, ×1,00), Infectólogo = DIFÍCIL (30, ×1,50). Son 83 preguntas en
12 temáticas; 37 tienen distractores reescritos «más plausibles» que se usan sólo fuera de
FÁCIL. La dificultad académica no afecta el combate.
Infección Bacterias Virus Hongos Parásitos Mapas posibles
Bacteriana 68 % 13 % 12 % 7 % Endotelio vascular, Mucosa epitelial
Viral 12 % 67 % 10 % 11 % Epitelio respiratorio, Tejido nervioso
Fúngica 13 % 12 % 65 % 10 % Dermis, Epitelio alveolar
Parasitaria 12 % 12 % 11 % 65 % Músculo, Epitelio intestinal, Tejido nervioso
Nivel Vida
enemiga
Daño Velocidad Intervalo de
aparición
Tamaño de
oleadas
Mult.
puntaje
Ambulatorio ×0,60 ×0,72 ×0,86 ×1,38 (más lento) ×0,70 ×0,75
Internado ×0,94 ×0,94 ×1,00 ×1,22 ×0,82 ×1,00
Inmunosuprimido ×1,48 ×1,28 ×1,08 ×0,82 (más rápido) ×1,22 ×1,50
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 2 of 17

Puntaje: (bajas×10 + segundos×2 + aciertos×25) × mult. infección × mult.
evolución  (máximo ×2,25). El récord se guarda en localStorage  por combinación de
configuración.
2.3 Estadísticas base del jugador
3. Mecánicas en detalle
3.1 Enemigos
Arquetipos (desbloqueo por tiempo; multiplican tamaño / vida / velocidad / daño):
Parámetro Valor Parámetro Valor
Vida 100 Velocidad 190
Daño de gránulo 21 Intervalo de disparo 520 ms (1,92/s)
Alcance 260 px Velocidad de proyectil 470
Proyectiles / perforación 1 / 0 Invulnerabilidad tras golpe 620 ms
Radio de recolección 82 px Fagocitosis (radio / recarga) 50 px (+23) / 0,8 s
NETosis (radio / recarga) 88 px / 10,8 s XP para la primera pregunta 150
Familia Vida / velocidad / daño
base
Comportamiento
Bacteria 28 / 54 / 10 Persigue con leve zigzag. Es fagocitable.
Virus 19 / 83 / 8 Rápido, zigzag amplio, rota. No fagocitable.
Hongo 42 / 35 / 10 Se detiene a ~145 px y escupe esporas (a ≤340 px,
máx. 12 proyectiles en pantalla, 8 de daño,
cadencia 2,6 s bajando a 1,15 s). Es fagocitable.
Parásito 78 / 78 / 14 Deriva con rumbo y giro gradual. Los helmintos
(nematodo, cestodo) serpentean con una cola de
hasta ~56 segmentos y velocidad de crucero 192–
210; máximo 3 a la vez (2 en equipos modestos).
Arquetipo Desde Tamaño Vida Velocidad Daño
Estándar 0 s 1,00 1,00 1,00 1,00
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 3 of 17

Jerarquía visual de tamaño: parásitos > bacterias ≥ hongos ≥ virus. Los enemigos
comunes tienen tope de tamaño (≈1,55×) muy por debajo de los jefes. El contorno de cada
enemigo cambia de verde a amarillo y rojo según su vida (sin barra de vida salvo en jefes).
3.2 Jefes (cada 240 s, en secuencia cíclica)
Vida del jefe = máx(500, DPS estimado × 38 × (1 + 0,12·presión) × factores) : el
diseño apunta a ~38 s de combate sin importar cuán fuerte seas. Daño del jefe = daño
base × 5,2 (para una Colonia a los 4 min son ~75 por contacto, casi toda la vida inicial).
Recompensa: 160 XP + 80 por jefe previo.
3.3 Daño recibido
daño = daño enemigo × (0,55 si estás sobre un foco) × (1 − mín(28 %, 3,5 % ×
nivel de defensa)) , seguido de 620 ms de invulnerabilidad. Consecuencia de diseño: la
densidad de enemigos no multiplica el daño que recibís; lo que mata es el tamaño de cada
golpe, que escala con el tiempo.
Arquetipo Desde Tamaño Vida Velocidad Daño
Corredor 25 s 0,82 0,56 1,58 0,72
Bruto 55 s 1,43 2,35 0,72 1,35
Élite 95 s 1,17 1,90 1,20 1,48
Jefe Mecánica propia
Colonia primordial (bacteria) Deja biofilm circular (radio 58–76) cada 1,55 s; cada
zona dura 26 s y daña 7 + 0,012·t cada 0,96 s.
Virión titánico (virus) Cada 10,2 s gema 3 mini-viriones veloces (5 en
crisis).
Micelio ancestral (hongo) Estacionario, lanza 3 esporas teledirigidas cada
2,85 s (5 cada 1,85 s en crisis). El jugador puede
destruirlas a tiros.
Helminto colosal (nematodo) Cuerpo de ~225 segmentos; el daño de contacto
está limitado al 22 % de tu vida máxima; roba el 32
% del ADN que toca y se cura con el 18 % de lo
robado.
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 4 of 17

3.4 Focos infecciosos
Primero a los 38 s y luego cada 52 s; máximo 2 simultáneos, 65 s de vida. Sanar (1,4 s en el
centro, radio 72) cura 18 PV (×multiplicador de curación), da XP igual al 32 % de la barra y
abre la elección de habilidad. Un foco desatendido estalla en mín(13, 5 + t/85 +
2·presión) × mult. oleadas  patógenos. Sobre el foco recibís 45 % menos daño.
3.5 XP y preguntas
Baja normal: 12 XP base (27 si es fagocitada); jefe: 160+. El 25 % es instantáneo y el 75
% cae como gota de ADN (30 s de vida, imán por radio, máx. 64–96 gotas que se
fusionan).
Costo por pregunta: 150 la primera, luego 260 + 65·n + 12·n^1,35  (337, 421, 508,
598… 1.179 en la décima). Agotar el banco requiere del orden de 37.000 a 55.000 XP
acumulados (estimación).
Las preguntas no se repiten; se reparten entre temáticas evitando la misma dos veces
seguidas. Fallar una suma mín(12, 6 + t/80)  enemigos (un tercio brutos).
3.6 Multirresistencia (fase final)
Se activa al agotar el banco (en «No cursé» sólo si ya cayeron los cuatro jefes; si no, el
banco se rehabilita). Aparecen 3 jefes de golpe y luego uno cada 28 s (con 42 % de chance
de un segundo cada 34 s). Aparición cada ≥180 ms, 5–10 enemigos por tanda, tope de
enemigos 96, vida enemiga hasta ×5,2 y daño hasta ×3,1. No hay más preguntas, sólo focos
y habilidades. No existe condición de victoria.
4. Sistemas de escalado
Todo parte de cuatro curvas y un «director» adaptativo.
Magnitud Fórmula
Vida enemiga base × arquetipo × [1 + (t/115)^1,22 ×
0,52] × (1 + 0,31·P) × mult. dificultad
Daño enemigo base × arquetipo × [1 + (t/240)^0,72 ×
0,45] × (1 + 0,18·P) × mult. dificultad
Velocidad × (1 + mín(1,10, 0,065 × ⌊ t/45 ⌋ ))  × azar
0,87–1,13
Aparición intervalo máx(470, 1.380 − 2,75·t) / (1 +
0,2·P) × mult.  ms; 1 enemigo/tanda (<55 s), 2
(<145 s), luego 3 (+ ⌊ 0,72·P ⌋ , máx. 4)
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 5 of 17

Valores calculados (Internado, P = 0):
Una bacteria estándar pasa de ~33 de vida (min 1) a ~129 (min 10) y ~195 (min 15) con P = 0;
con P = 1 llega a ~169 en el minuto 10. El piso de aparición se alcanza hacia los 5,5 min, y
desde ahí el único freno es el tope de enemigos (42–68; 96 en crisis).
Lectura de diseño: el director sube el tamaño de los enemigos y la cadencia de aparición
cuando tu build mejora. Es un sistema de rubber banding explícito: protege contra builds
desbocados, pero reduce la sensación de poder (ver sección 8).
5. Las tres vías de mejora
Cada acierto permite elegir una vía. Se aplica una mejora básica (ciclo de 5 por vía) y, en
cada tercera elección de la misma vía, además una evolución avanzada (ciclo de 4).
Además cada elección ejecuta un escalado principal y, si cambiás de vía respecto de la
elección anterior, una sinergia.
Magnitud Fórmula
Brotes primer brote a 65 s, luego cada ~68 s (levemente
menos); tamaño mín(12, 3 + t/90 + 1,2·P) ×
mult.
Presión de build P clamp(log2(0,55·ofensa + 0,28·aguante +
0,17·movilidad) × 0,32, 0, 1,45) , suavizada a
0,20/s
Minuto Vida × Daño × Velocidad × Intervalo de aparición Enemigos/tanda
0 1,00 1,00 1,00 1.684 ms 1
2 1,55 1,27 1,13 1.281 ms 2
5 2,68 1,53 1,39 677 ms 3
10 4,90 1,87 1,84 573 ms (piso) 3
15 7,40 2,17 2,10 (tope) 573 ms 3
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 6 of 17

Sinergia por alternar: Homeostasis +4 % radio y −2 % recarga de Fagocitosis;
Citotoxicidad +4 % daño; Quimiotaxis +0,5 de daño de red y +3 % radio.
Topes relevantes: defensa máxima útil 28 % (nivel 8); proyectiles 10; perforación 8 (cada
perforación resta 22 % de daño); cadencia mínima 180 ms (alcanzable tras ~26 elecciones
de Quimiotaxis).
6. Las 13 habilidades de foco
Al sanar un foco se ofrecen 3 opciones al azar entre las habilidades (nuevas o
evoluciones). Perfil diferencial sólo aparece con Colaboración T-B o macrófagos, y
Polarización sólo con macrófagos.
Vía Mejoras básicas (en
orden)
Evoluciones
avanzadas (en
orden)
Escalado principal
por elección
Homeostasis
(supervivencia)
+32 vida · +18 %
radio fagocitosis ·
−3,5 % daño recibido
· +2 curación por
fagocitosis ·
fagocitosis 8 % más
frecuente
+1 tier englobable y
+18 % radio · +30 %
curación recibida · −7
% daño recibido
(texto dice 10 %) ·
fagocitosis 18 % más
rápida y +5 curación
+1 gránulo por
descarga (tope 10);
+4 % radio y −2 %
recarga de
Fagocitosis; +5 %
daño de anticuerpos;
+1 linfocito B; +0,05
macrófago
Citotoxicidad
(ataque)
+30 % daño · +15 % ·
+8 % velocidad de
proyectil · +15 % · +9
%
+2 gránulos en
abanico · +1
perforación ·
explosión en bajas
(+28 px, +11 daño) ·
+2 gránulos
+7 % daño de gránulo
Quimiotaxis
(agilidad)
+15 % velocidad ·
+32 px recolección ·
+15 % radio de red ·
NETosis 7 % más
rápida · +1
daño/pulso
+1 red simultánea ·
red más frecuente y
+22 % radio · +55 px
recolección y +10 %
velocidad · +35 %
daño y +25 %
duración de red
intervalo de disparo
×0,96 (mín 180 ms);
+4 % radio y −2 %
recarga de NETosis;
−2 % recarga de
Fagocitosis y
anticuerpos
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 7 of 17

# Habilidad Qué hace Cada evolución Topes /
observaciones
1 Fagocitosis Engloba al patógeno
elegible más
cercano (bacterias y
hongos no jefe,
tamaño ≤ tier
permitido) a ≤ radio
+ 23 px. Recarga 0,8
s, 27 XP en vez de 12,
cura phagoHeal .
Mientras está lista,
el disparo ignora
esos blancos. Dos
pseudópodos
permanentes
apuntan al blanco.
+9 radio ·
recarga ×0,90
(mín 0,28 s) · +1
curación desde
nivel 2 · nivel 3
activa Estallido
Ver §9 (tier y
NaN).
2 Estallido
respiratorio
Cada fagocitosis
genera un pulso en
área: radio 95 +
17·nivel, daño 7 +
4·nivel.
Sólo desde
Laboratorio
Bug de NaN (§9).
3 NETosis Cada 10,8 s sale una
célula auxiliar (vive
4,4 s) que corre al
enemigo más
cercano y despliega
una red: radio 88, 7,6
s, 5,5 de daño cada
0,43 s; se agota al
registrar 8 bajas.
+10 % radio ·
+2,2 daño ·
recarga ×0,90
(mín 2,7 s) · +1
«red simultánea»
«Simultáneas»
casi inerte (§9).
4 Inmunorregulación Pulso global cada 15
s: 4 de daño a todos
los enemigos.
+3 daño ·
intervalo ×0,88
(mín 5,5 s)
Daño plano:
obsoleto desde el
minuto ~5.
5 Diferenciación
celular
Bajas consecutivas
de la misma familia
dan daño extra
mín(90 %, racha ×
bono × nivel) ,
bono base 5,5 %.
+2 puntos de
bono
El nivel multiplica
y además suma:
escala de forma
cuadrática.
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 8 of 17

# Habilidad Qué hace Cada evolución Topes /
observaciones
6 Anticuerpos Cada 1,9 s lanza 2
inmunoglobulinas
teledirigidas (giran
5,5 rad/s; si el blanco
muere buscan otro).
Al impactar se
adhieren y hacen 42
% del daño base
cada 0,43 s durante
5,2 s + 1,5 s por nivel;
sin daño inicial.
+4 daño ·
intervalo ×0,85
(mín 0,5 s) · +1
proyectil desde
nivel 2
Máx. 5
proyectiles.
7 Complemento 18 % de los impactos
de gránulo
encadenan a otro
enemigo a ≤125 px
con 35 % del daño.
+7 puntos de
probabilidad
Tope 70 %.
8 Colaboración T-B Linfocitos B
orbitales: 2 al
desbloquear, +1 cada
8 bajas hasta el tope.
Cada uno dispara
desde su posición
cada 1,75 −
0,15·nivel  s (mín
0,7 s), daño 7 +
2·nivel .
+1 de capacidad Tope 8. Primera
mejora sin efecto
(§9).
9 Activación de
macrófagos
Persiguen enemigos
(hasta 440 px) y
embisten: 16 +
5·nivel de daño por
contacto, ciclo de
0,5 s con 0,33 s de
embestida.
+1 macrófago Tope 5; el
escalado de
Homeostasis lo
rompe (§9).
10 Perfil diferencial +25 % de daño de
macrófagos.
+25 puntos
porcentuales
No afecta a los
linfocitos B (§9).
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 9 of 17

7. Diagnóstico de código
7.1 Principios SOLID
# Habilidad Qué hace Cada evolución Topes /
observaciones
11 Reconocimiento de
patrones
La familia dominante
en 220 px recibe
×(1 + mín(45 %, n
× 4,5 % × nivel)) .
+45 px de radio Con 10 enemigos
ya satura el tope
en nivel 1.
12 Citocinas Cada 5,4 s dispara 1
proyectil de 6 de
daño.
+3 daño ·
intervalo ×0,84
(mín 0,75 s) · +1
proyectil desde
nivel 2
Máx. 4
proyectiles; daño
plano.
13 Polarización
funcional
Requiere
macrófagos. Tras ≥
90 s en M1 y 34 +
0,11·t  bajas (máx.
180) pasa a M2 por
24 s: los macrófagos
orbitan sin dañar y
curan 0,6 % de la
vida máxima cada
0,85 s. Luego vuelve
a M1.
No escala La curación ignora
el multiplicador
de curación.
Principio Estado Evidencia y consecuencia
S · Responsabilidad única Crítico Arena  (líneas ~292–1780) mezcla render,
entrada, HUD, IA, combate, progresión,
preguntas, puntaje, persistencia y
depuración. spawnEnemy  (~90 líneas)
construye ~60 propiedades; killEnemy
mezcla XP, lógica de polarización M2, VFX,
explosión en cadena y contabilidad de redes;
updateColonies  mezcla UI, recompensas y
generación de enemigos.
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 10 of 17

7.2 DRY (no repetir)
Doble fuente de verdad de las mejoras. applyPrincipalSkillScaling  aplica y
getPathSkillPreview  describe por separado; las notas de v3.4 dicen «tabla única»,
pero siguen siendo dos estructuras. De ahí salen las discrepancias de la sección 9.
Valores por defecto repetidos con ||  en 3 sitios por habilidad ( bCellCap||2  en la
vista, ||1  en la aplicación). Ya produjo un bug.
Patrón damageEnemy(...); if(e.hp<=0) killEnemy(...)  repetido al menos 8 veces
(regulación, anticuerpos, explosión, complemento, redes, macrófagos, estallido,
impacto). Debe ser un único applyDamage() .
Principio Estado Evidencia y consecuencia
O · Abierto/cerrado Deficiente Agregar una habilidad obliga a editar al
menos 8 lugares con cadenas
if(id==='…') : applySkillEvolution ,
skillEvolutionDelta ,
formatAbilityCurrent ,
getPathSkillPreview , skillOptionLabel ,
updateSpecialSkills , debugSkillNames ,
debugSkillProps . Lo positivo:
EVOLUTION_STRATEGIES , MORPHOLOGY  e
INFECTIONS  sí son tablas de datos.
L · Sustitución de Liskov No aplica /
frágil
No hay jerarquía de entidades: los enemigos
son objetos planos con banderas ( isBoss ,
isWorm , stationary , minion ) y el código
ramifica por bandera. Un comportamiento
nuevo exige tocar varias funciones.
I · Segregación de
interfaces
Deficiente La UI consume window.IS_ACTIONS  (todas
las acciones del juego, incluidas las de
depuración) y una docena de eventos
globales con nombres string.
D · Inversión de
dependencias
Deficiente La lógica de juego depende de window ,
document  ( document.hidden  dentro de
update ), localStorage  (en finishGame ),
Math.random  y de la constante
QUESTION_BANK . No se puede probar sin
navegador ni reproducir una partida (sin
semilla).
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 11 of 17

Código de depuración duplicado: renderSkillProps / renderProps  y los mapas
props / debugSkillProps ; una rama spawn-count  repetida en debugAction ; el
formateador fmt  se redefine en tres funciones.
Destrucción de focos copiada en dos ramas (sanado y desborde); nombres de
habilidades definidos en dos tablas.
Números mágicos: cientos de constantes de balance incrustadas en las fórmulas
(0,31, 0,18, 38, 0,12, 1.400, 52.000…). Ninguna tiene nombre.
7.3 KISS y YAGNI (código muerto o innecesario)
swarmLevel  / swarmVolley  (arma heredada que nunca se activa), waveExtra  (se
suma y no se lee), xpMultiplier  (constante 1), dodgeWindow  (constante).
Rama M2 dentro del contacto del macrófago (inalcanzable: el modo M2 retorna
antes); this.updateHud()  tras un return  en updateColonies ; this.kills += 0 .
Estado implícito: bCellCap , macrophageCap , complementChance , patternRadius ,
differentiationBonus , minionDamageBonus  se crean perezosamente fuera de
create() . Deberían vivir en un objeto skillState  con valores iniciales declarados.
7.4 Rendimiento (inferido por lectura, no medido)
Punto Problema Mejora
Proyectiles y
VFX
Cada disparo, destello, número flotante y
burstEffect  crea objetos Phaser y
tweens nuevos; no hay pooling → presión
de GC. Los textos usan Text  (canvas por
texto).
Pool de proyectiles y anillos
( Group  con setActive ), un
emisor de partículas,
BitmapText  para números.
Colisiones Cada proyectil recorre todos los enemigos
cada cuadro; findIndex  sobre
proyectiles enemigos por cada bala;
ayudantes y macrófagos escanean todos
los enemigos.
Cuadrícula espacial (celda
~96 px) compartida por
colisión, selección de blanco y
separación (hoy
separateEnemies  es O(n²)
cada 80 ms).
Gusanos Un jefe tiene ~225 segmentos: drawWorm
hace ~675 fillCircle  cada 36 ms y cada
proyectil, red o búsqueda de blanco itera
todos los segmentos.
Menos muestras (paso 10 → 18
px), caja envolvente previa,
dibujar con Rope / Mesh  o
RenderTexture .
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 12 of 17

El código ya tiene buenas prácticas parciales (topes por dispositivo, un solo
generateTexture  de ADN, silueta cacheada, throttle de HUD a 140 ms y de repulsión a 80
ms); el trabajo pendiente es extenderlas.
7.5 Robustez y mantenimiento
localStorage  sin try/catch  en finishGame : en modo privado de algunos
navegadores lanza una excepción justo al terminar la partida.
Phaser desde CDN sin integridad (SRI) y sin modo offline.
Sin tests. Sólo se ejecuta node --check ; las notas de cada versión admiten que no se
probó la partida completa.
Versiones inconsistentes: el comentario de game.js  dice v2.9, index.html  carga
game.js?build=3.2.0  y el título dice v3.4, el lanzador imprime v2.9.0 y el README
mezcla historiales v1.9 a v2.9.
Documentación contradictoria: v3.3 describe Homeostasis como «+1 penetración» y
v3.4 como «+1 proyectil»; el README y v3.1 dicen que M2 dura 30 s con 24 bajas, el
código (v3.2) usa 90 s mínimos, 34→180 bajas y 24 s.
Accesibilidad: el estado de vida se codifica sólo por color (verde/amarillo/rojo) y los
textos flotantes miden 9–10 px.
Punto Problema Mejora
Búsquedas updateXpDrops  hace enemies.find  por
cuadro; cada spawn consulta dos veces
textures.get().getSourceImage() ; se
asignan arreglos nuevos con filter  en
cada cuadro.
Cachear jefe vivo y tamaños
de textura; reutilizar arreglos.
Contornos Un sprite extra por enemigo (el doble de
draw calls).
Tinte por shader o un único
pipeline de contorno.
Activos El ZIP pesa 17 MB y contiene PNG y WebP
de muchos sprites; los fondos PNG pesan
~1,7 MB cada uno.
Atlas de texturas, un solo
formato (WebP/AVIF) y borrar
duplicados.
Matemática ~31 Math.hypot  y 18 dist2  en rutas
calientes.
Comparar con distancias al
cuadrado.
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 13 of 17

8. Diagnóstico de diseño y balance
1. Homeostasis rotulada como supervivencia pero es la vía ofensiva más fuerte. Cada
elección suma +1 proyectil (hasta 10) y escala 4 habilidades. Con 10 gránulos y
Citotoxicidad, el DPS se dispara; las otras vías compiten en desventaja.
2. Daño plano contra enemigos que escalan ×4,9 en 10 minutos. Inmunorregulación (4),
Citocinas (6), Anticuerpos (10), redes (5,5) y linfocitos B (7+2·nivel) crecen por sumas
pequeñas mientras la vida enemiga crece por multiplicación: pasan a ser decorativas
salvo que escalen con attackDamage .
3. Anti-progresión. La presión P multiplica vida y daño enemigos, y la vida del jefe sale
de tu DPS estimado. Castiga invertir en ataque. Además getPlayerDpsEstimate
ignora anticuerpos, citocinas, macrófagos, estallido, complemento y regulación, por lo
que los builds basados en ellas enfrentan jefes más blandos de lo diseñado.
4. Mejoras desperdiciadas. El menú sigue ofreciendo habilidades en su tope
(Colaboración T-B 8, Complemento 70 %, proyectiles 10) y vías cuyo parámetro ya
está al máximo.
5. Selección «ponderada» que no pondera. weighted  es sólo la concatenación de
evoluciones y desbloqueos y se sortea de forma uniforme; el README promete
favorecer mejoras de habilidades conocidas.
6. Sin victoria. La partida siempre termina en derrota (Multirresistencia). Falta un
objetivo explícito (sanar la infección tras N jefes o sobrevivir X minutos de crisis) y un
cierre pedagógico (resumen de temas acertados/fallados).
7. Ritmo. 25–30 pausas por partida; el modo FÁCIL puede reiniciar el banco para llegar a
los cuatro jefes. Conviene medir el tiempo real de partida por dificultad.
8. Daño recibido plano por golpe. Con 620 ms de invulnerabilidad, el límite de daño por
segundo está dado por el golpe más grande, no por la cantidad de enemigos: reduce el
valor de matar rápido y favorece vida/defensa.
9. Laboratorio parcial. +nivel  sube el nivel pero no aplica los cambios de estadísticas
reales de la habilidad, así que no reproduce la progresión (y por eso no atrapa el bug
de NaN).
9. Inconsistencias confirmadas por lectura del código
# Severidad Ubicación Qué pasa Corrección sugerida
1 Alta doPhagocytosis  (~l. 968) 7 + skillLevels.respiratory_burst
* 4  es NaN  cuando Estallido se activa
por Fagocitosis nivel 3 (el nivel de
Estallido nunca se define). Verifiqué la
aritmética con Node. Consecuencia:
vida NaN , enemigos que no mueren por
daño, damageTotal  y DPS en NaN .
Función getSkillLevel(id)
con valor por defecto 1 y usarla
en radio y daño.
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 14 of 17

# Severidad Ubicación Qué pasa Corrección sugerida
2 Media applySkillEvolution  (l. 1078) Colaboración T-B usa (bCellCap||1)+1
= 2 en la primera evolución; el tope
inicial ya es 2. La tarjeta promete «2 →
3».
Unificar el valor inicial (2) en un
solo lugar.
3 Media applyPrincipalSkillScaling  (l.
1676)
Homeostasis suma 0,05 al cap de
macrófagos. Con cap inicial 1 pasa a 1,05
y el while(length < cap)  crea un
segundo macrófago; después necesita
~19 elecciones más para el siguiente.
Contador entero separado del
progreso fraccionario.
4 Media updateHelpers  / update «Redes simultáneas» sube
maxNetHelpers , pero sólo sale 1
ayudante por recarga y vive 4,4 s; sólo
habría más de uno si la recarga baja de
4,4 s.
Contar redes activas o permitir
varias por recarga.
5 Media phagoMaxTier Los tiers existentes son 0
(estándar/corredor) y 2 (bruto/
élite/jefe). La primera «Fagocitosis
expansiva» sube a 1: no habilita ningún
enemigo nuevo. El tier 2 sólo llega en la
elección 15 de Homeostasis (el ciclo
avanzado vuelve al índice 0).
Reasignar tiers (0/1/2) o hacer
que la mejora suba +2.
6 Media damageEnemy Perfil diferencial sólo escala
source==='minion'  (macrófagos); los
disparos de linfocitos B usan
'antibodies' .
Fuente 'ally'  común para
células amigas.
7 Baja Texto de mejoras «Barrera reforzada» dice −10 % pero
aplica +2 de nivel = −7 %; «NETosis +8 %
de radio» aplica ×1,10; Diferenciación y
Patrones muestran el bono sin el factor
de nivel.
Derivar el texto del mismo dato
que aplica el efecto.
8 Baja debugAction skillstat  escribe complementChance ,
macrophageCap  y bCellCap  en
this.stats , pero el juego los lee de
this.* : los botones no hacen nada.
Mover todo a skillState .
9 Baja Docs y versiones Ver §7.5. Una sola fuente de versión
( package.json  o constante) y
changelog único.
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 15 of 17

10. Plan de mejoras priorizado
10.1 Arquitectura objetivo (sin cambiar el juego)
src/
  config/    balance.js · enemies.js · bosses.js · paths.js · difficulty.js
  skills/    index.js (registro) · fagocitosis.js · anticuerpos.js · …
  entities/  EnemyFactory · behaviors/{chase,worm,stationary,ranged}.js · 
boss/{biofilm,spawn,spores,steal}.js
  systems/   SpawnDirector · CombatSystem · ProjectileSystem · SkillSystem · 
ProgressionSystem · QuestionSystem · FocusSystem
  infra/     EventBus · Storage · Rng (con semilla) · Clock
  ui/        Hud · QuestionDialog · UpgradeDialog · PauseReport · DebugPanel
Las habilidades se declaran una sola vez y de ahí salen aplicación, vista previa, texto y
depuración:
// skills/anticuerpos.js
export default {
  id: 'antibodies', name: 'Secreción de anticuerpos',
  base:  { damage: 10, interval: 1900, count: 2 },
  levels: [
    { effects: [mul('interval', .85), add('damage', 4)] },
    { effects: [mul('interval', .85), add('damage', 4), add('count', 1, { 
max: 5 })] },
  ],
  update(ctx, dt) { /* disparo */ },
};
// apply() y preview() recorren el mismo arreglo `effects`.
Esto cumple OCP (una habilidad nueva = un archivo), DRY (una sola fuente) y elimina de
raíz las discrepancias texto/lógica.
10.2 Hoja de ruta
Fase Contenido Esfuerzo
estimado
Impacto
0 · Hotfix Bugs 1 a 6 de la sección 9, try/catch
en localStorage , unificar versión.
0,5–1 día Alto
1 · Limpieza applyDamage()  único, constantes con
nombre en config/ , borrar código
muerto, skillState  explícito, unificar
depuración.
2–3 días Alto
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 16 of 17

10.3 Verificación pendiente
Reproducir el bug 1 en una partida real: evolucionar Fagocitosis tres veces, fagocitar
con enemigos cerca y observar si dejan de morir por daño.
Medir FPS y tiempo de cuadro con un jefe helminto y 60+ enemigos en un teléfono
modesto.
Revisar el contenido de las 83 preguntas contra la bibliografía (el propio código lo
marca como provisional); este análisis sólo contó y clasificó.
Fase Contenido Esfuerzo
estimado
Impacto
2 ·
Rendimiento
Pools de proyectiles y VFX, cuadrícula
espacial, gusanos con menos
segmentos y broad-phase, atlas y
limpieza de assets. Medir antes y
después (FPS, ms/cuadro en móvil
real).
3–5 días Alto en
móviles
3 ·
Arquitectura
Extraer sistemas de Arena , registro de
habilidades, comportamientos de
enemigos, bus de eventos tipado,
módulos ES.
1–2 semanas Alto a largo
plazo
4 · Pruebas Lógica pura (escalado, director, daño)
con Node o Vitest; RNG con semilla;
simulador sin cabeza que juegue 1.000
partidas con builds fijos para calibrar.
3–4 días Alto (balance)
5 · Balance Mover el +1 proyectil fuera de
Homeostasis o limitarlo; escalar
habilidades con attackDamage ; usar
DPS medido (ventana de 20 s) en la
vida de jefes; no ofrecer opciones en
tope; condición de victoria y resumen
por temática.
Iterativo Alto
Inmune Survivors v3.4 — Diagnóstico técnico y guía de diseño
Page 17 of 17