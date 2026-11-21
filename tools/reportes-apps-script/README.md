# Reportes anónimos → Google Sheet

La web (Inicio → **Sugerencias y reportes**) y el juego (menú de pausa y fin de partida) mandan reportes
anónimos a un Apps Script que agrega una fila por reporte en una planilla de tu Drive.
**No se envía email, usuario ni IP**: solo tipo, sección, mensaje y contexto técnico (página, versión, dispositivo).

## Instalar (una sola vez, ~5 minutos)

1. En Google Drive, con la cuenta de MedMar, creá una planilla nueva. Por ejemplo, "MedMar · Reportes".
2. En la planilla abrí **Extensiones → Apps Script**. Borrá el código de ejemplo y pegá todo [`Code.gs`](Code.gs). Guardá.
3. Arriba elegí la función **`configurar`** y tocá **Ejecutar**. Google va a pedir permisos sobre la planilla:
   aceptalos. Se crea la hoja "Reportes" con encabezados, colores por tipo, filtro y la lista de estados.
4. **Implementar → Nueva implementación → tipo "Aplicación web"**:
   - *Ejecutar como*: **Yo**.
   - *Quién tiene acceso*: **Cualquier usuario**. Hace falta para que lleguen reportes de gente sin cuenta de
     Google; el script solo agrega filas, no deja leer nada.
5. Copiá la **URL de la aplicación web** (termina en `/exec`) y pasámela, o pegala vos en los dos lugares que
   dicen `REPORTES_URL`:
   - `web/js/app.js`
   - `games/inmune-survivors/game.js`

   Mientras `REPORTES_URL` esté vacía, la web y el juego no muestran la opción de reportar.
6. Para probar: en el editor de Apps Script ejecutá **`probar`** y fijate que aparezca una fila (después borrala).

## Leer y ordenar

- Cada fila tiene **Fecha, Tipo, Sección, Mensaje, Contexto, Estado y Notas**.
- *Estado* es una lista (Nuevo / Revisando / Resuelto / Descartado). Los nuevos se ven en rojo y los resueltos en verde.
- Usá el filtro del encabezado para ver solo bugs o solo lo nuevo.

## Actualizar el script

Pegá la versión nueva de `Code.gs` y andá a **Implementar → Administrar implementaciones → editar (lápiz) →
Versión: nueva → Implementar**. Así la URL no cambia.

## Límites y seguridad

- **Anti-spam**: tope de 300 reportes por día en total, un campo oculto que delata bots y, en el navegador, un
  mínimo de 30 s entre envíos y 10 por día.
- **Texto plano**: un mensaje que empieza con `=` o `+` se guarda como texto, no como fórmula.
- **Respuesta**: el navegador manda el reporte sin leer la respuesta (`no-cors`, que es lo que permite Apps Script).
  Si Google rechaza el envío, el usuario no se entera; en la planilla se ve qué llegó.
