INMUNE SURVIVORS — ACTUALIZACIÓN DE HABILIDADES

Ver CAMBIOS_v3.0.txt para las novedades y controles de esta entrega.

INMUNE SURVIVORS v2.9 — VISTA MEJORADA Y HUD ADAPTABLE

NOVEDADES v2.9
- Contorno de enemigos siguiendo la silueta real del sprite, con color según la vida y un grosor moderado.
- Cámara móvil un poco más alejada para mostrar más arena.
- Colisiones de contacto ligeramente más pequeñas para dar más margen de movimiento.
- HUD y notificaciones recalculados según el ancho real del lienzo; la barra de experiencia ya no desborda paneles estrechos.
- Si el navegador pierde pantalla completa al minimizar o cambiar de aplicación, aparece un botón para recuperarla; al volver también se refresca el tamaño visible.

INMUNE SURVIVORS v2.8 — EVOLUCIÓN CELULAR Y RENDIMIENTO

HISTORIAL v2.8
- Restaurados los emblemas de Homeostasis, Citotoxicidad y Quimiotaxis en la elección de vía principal.
- Los sprites superpuestos muestran centrada cada habilidad afectada. Al seleccionar una, se consultan sus parámetros actuales y el cambio concreto de la próxima mejora.
- Las evoluciones por focos indican el nivel y el impacto numérico o porcentual de cada mejora.
- Inicio de Internado más gradual, con menos presión de enemigos durante los primeros minutos.
- El indicador de fagocitosis ahora anima dos cuadros ilustrados del proceso de englobamiento.
- Inmunorregulación genera ondas locales visibles sin colorear ni destellar toda la pantalla.
- Pausa y derrota incluyen daño, DPS promedio y estimado, bajas, jefes, focos, preguntas y registro de mejoras.
- Se redujo trabajo de renderizado móvil: resolución adaptada al dispositivo, solo se carga el fondo usado, se limita la cantidad de enemigos/efectos, se comparte la textura de ADN y se reducen búsquedas repetidas.

CONTROLES Y PRUEBA
- PC: WASD o flechas (o mantené apretado el mouse) para moverte; el ataque es automático. ESC, P o PAUSAR muestran el informe y permiten continuar o regresar al menú.
- Móvil: joystick flotante al tocar y arrastrar dentro de la arena; desaparece al soltar. El juego solicita pantalla completa.
- Para jugar en la PC ejecutá INICIAR_LOCAL.bat. Para probar desde el móvil en la misma red Wi-Fi ejecutá INICIAR_MOVIL.bat y abrí en el celular la dirección local que muestra la ventana.
- Para probar evolución sin esperar, entrá al modo Laboratorio y usá los controles de pregunta, vía principal y evolutiva.

VALIDACIÓN DE ESTA VERSIÓN
- Sintaxis de JavaScript validada con Node.js.
- Carga y revisión visual en navegador de escritorio; no se midieron FPS en un teléfono físico. Las mejoras de rendimiento son preventivas y se basan en los costos visibles en el código, por lo que dispositivos y navegadores distintos pueden dar resultados diferentes.

HISTORIAL DE LA VERSIÓN 1.9
- Se hizo Ambulatorio más accesible y se aumentó el impacto de las primeras mejoras para que las primeras elecciones ayuden más a sobrevivir y se perciban mejor en pantalla:
  - Ambulatorio: vida enemiga ×0,60, daño ×0,72, velocidad ×0,86, oleadas ×0,70 e intervalo de aparición más largo.
  - Homeostasis: primera mejora +32 de vida máxima y actual; segunda +18% de radio de fagocitosis.
  - Desgranulación: primera mejora +25% de daño y gránulos visualmente mayores/cambiados de color; segunda aumenta aproximadamente 11% la frecuencia de disparo.
  - Quimiotaxis: primera mejora +15% de velocidad; segunda +32 al radio de recolección de ADN/ARN.
  - También se amplió la primera mejora de radio NETótico.
- El banco tiene 83 preguntas y ahora se organiza primero por dificultad general: FÁCIL, NORMAL y DIFÍCIL. La dificultad general organiza el banco y las temáticas son subcategorías. FÁCIL está pensado para nivel secundario: defensas del cuerpo, microorganismos, contagio, prevención, vacunas y antibióticos básicos, sin detalles clínicos o moleculares.
- El selector de evolución define el banco de la partida: No cursé = FÁCIL; Estudiante = NORMAL; Infectólogo = DIFÍCIL. El nivel elegido no sube automáticamente durante la partida.
- La selección de preguntas es aleatoria sin repetición y procura repartirlas entre temáticas; si hay alternativa, evita repetir la misma temática consecutivamente.
- Se mejoraron distractores de preguntas normales y difíciles seleccionadas para que sean más plausibles. Las opciones se mezclan al mostrar cada pregunta.
- La dificultad de infección continúa separada de la académica. Sus multiplicadores se multiplican para el puntaje.
- En v1.9 se actualizó el iniciador y el identificador de caché.

CANTIDAD DE PREGUNTAS
- FÁCIL: 25
- NORMAL: 28
- DIFÍCIL: 30
- TOTAL: 83

El archivo CATALOGO_PREGUNTAS_v1.9.md enumera todas las preguntas y sus respuestas correctas agrupadas por categoría y temática.

PROGRESIÓN
Cada respuesta correcta permite elegir entre Homeostasis (supervivencia), Desgranulación (ataque) y Quimiotaxis (agilidad). Cada elección aplica una mejora básica; cada tercera elección de una misma vía también aplica una evolución avanzada, sin abrir una segunda ventana. Las mejoras avanzadas recorren una secuencia temática fija. Alternar de vía respecto de la elección previa da una sinergia menor.

DIFICULTADES
Infección: Ambulatorio (−40% vida enemiga, −28% daño, −14% velocidad y oleadas más breves/espaciadas, ×0,75), Internado (estándar, ×1,00) e Inmunosuprimido (más vida, daño, velocidad y densidad, ×1,50).

Evolución/preguntas: No cursé (FÁCIL, ×0,75; pensado para nivel secundario y sin cursada previa, con inmunología básica, microorganismos y prevención), Estudiante (NORMAL, ×1,00) e Infectólogo (DIFÍCIL, ×1,50). La categoría de preguntas permanece fija durante esa partida y el tema varía. El puntaje combina los dos multiplicadores; por ejemplo, Inmunosuprimido + Infectólogo = ×2,25.

ANIMACIÓN DE FLECHAS Y FOCOS
- Las flechas de foco y jefe ahora son más grandes, contrastadas y pulsantes; conservan indicadores separados si apuntan en direcciones cercanas.
- Cada foco usa un sprite cenital temático (viral, bacteriano, micótico o parasitario), con silueta orgánica asimétrica ajustada al diámetro interactivo de 144 unidades (radio 72), sin partes que sobresalgan; un contorno suave señala la zona segura; al permanecer sobre ella se reduce 45% el daño recibido durante la sanación.

CONTROLES
- PC: WASD o flechas para moverte. El progenitor hematopoyético comienza con desgranulación automática. Al iniciar, la página centra la arena en la ventana del navegador.
- Móvil: tocá y arrastrá en cualquier parte de la arena; el joystick flotante aparece bajo el dedo y se oculta al soltar. La partida solicita pantalla completa; en navegadores que no lo permitan usa una vista inmersiva a pantalla completa.
- Pausar: botón PAUSAR en la franja superior. La ventana muestra puntaje y tiempo y permite continuar o volver al menú.
- Acercate a la doble hélice para recoger ADN/ARN; quedate sobre el núcleo de una colonia para sanarla.

EJECUCIÓN EN PC
1. Extraé la carpeta completa del ZIP.
2. Ejecutá INICIAR_LOCAL.bat.
3. Requiere Python 3 y conexión a internet para cargar Phaser desde CDN.

PRUEBA DESDE EL CELULAR (MISMA RED WI-FI)
1. En la PC, ejecutá INICIAR_MOVIL.bat y dejá abierta la ventana.
2. Si Windows pregunta por el acceso de red de Python, permitilo en redes privadas.
3. La ventana mostrará una dirección como http://192.168.1.20:8000/?build=2.0.0.
4. En el celular conectado al mismo Wi-Fi, abrí esa dirección en el navegador.
5. Tocá y arrastrá en cualquier parte de la arena para moverte: el joystick aparece bajo el dedo y se oculta al soltar. El ataque es automático.
6. Para terminar, cerrá la pestaña y presioná Ctrl+C en la ventana de la PC.

Si el celular no abre la dirección, confirmá que ambos dispositivos estén en el mismo Wi-Fi, que la PC no esté usando una red de invitados y que el firewall permita Python en redes privadas. No uses la IP 127.0.0.1 desde el teléfono: esa dirección apunta al propio teléfono.

NOTAS
Las preguntas son provisionales y necesitan validación completa con la bibliografía autorizada antes de usarse como material educativo formal. Las referencias de las nuevas preguntas técnicas incluyen recursos oficiales del CDC (DPDx, malaria, giardiasis, amebiasis, leishmaniasis, aspergilosis e influenza), junto con contenidos temáticos del cuadernillo y microbiología general.


NOVEDADES v2.0
- El jugador pasa a ser un progenitor hematopoyético; empieza únicamente con desgranulación.
- La vía principal de ataque se llama Citotoxicidad. Homeostasis y Quimiotaxis siguen como vías numéricas básicas.
- Sanar cada foco ofrece tres opciones evolutivas. Favorece mejoras de habilidades conocidas, con posibilidad aleatoria de desbloquear una nueva.
- Habilidades incorporadas: Fagocitosis, NETosis, Inmunorregulación, Diferenciación celular, Anticuerpos, Complemento, Colaboración T-B, Macrófagos, Perfil diferencial, Reconocimiento de patrones, Citocinas y Polarización funcional. El estallido respiratorio mejora la Fagocitosis.
- Las habilidades y sus proyectiles se acumulan; no sustituyen la desgranulación ni otras armas.
- Nueva opción en el menú: ABRIR LABORATORIO DE PRUEBAS. La modalidad desactiva preguntas, oleadas, jefes y focos automáticos, y mantiene el desplazamiento y combate activos.

LABORATORIO DE PRUEBAS
- Añadir / +nivel: elegí una habilidad del selector para desbloquearla o aumentar su nivel. Estallido respiratorio se puede probar de forma independiente.
- Quitar: remueve la habilidad elegida.
- + / − en estadísticas: sube o baja el parámetro de a un paso. La velocidad de ataque se ajusta reduciendo/aumentando el intervalo.
- Elegí una familia y usá Enemigo o Grande para generar agentes. Jefe genera el siguiente jefe de la secuencia; Foco crea una colonia sanable manualmente.
- Curar restaura la vida máxima. Limpiar elimina los enemigos visibles.
- El panel permanece sobre la arena para iterar cambios sin salir de la partida.


ACTUALIZACIÓN v2.1
- Marcadores de fagocitosis y radio de referencia solo se muestran al desbloquear Fagocitosis. Los objetivos compatibles reciben un indicador animado pequeño sobre el cuerpo.
- Los linfocitos B, macrófagos, anticuerpos y componentes del complemento tienen siluetas vectoriales diferenciadas dentro del juego.
- Los macrófagos aceleran al contacto, aplican el impacto y salen en una embestida breve para mantener el movimiento fluido.

HISTORIAL v2.8
- Los enemigos comunes ya no muestran barras de vida; los jefes conservan la suya.
- Un contorno de vida cambia gradualmente de verde a amarillo y rojo.
- El área lógica de juego se adapta al tamaño visible que informa el navegador del teléfono y vuelve a ajustarse al rotar o redimensionar.
- Las mejoras usan el término células amigas y solo ofrecen Perfil diferencial o Polarización funcional tras desbloquear Colaboración T-B o Activación de macrófagos.
- Se aumentó la potencia inicial y el impacto de evoluciones de daño y proyectiles para varias habilidades.


