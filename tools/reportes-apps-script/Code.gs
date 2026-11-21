/**
 * MedMar — receptor de reportes anónimos (bugs, sugerencias, correcciones).
 *
 * Corre como "Aplicación web" de Google Apps Script en la cuenta de MedMar y agrega una fila por reporte
 * en la hoja "Reportes" de la planilla donde está pegado. No guarda email, usuario ni IP: el formulario
 * de la web y del juego solo manda tipo, sección, mensaje y contexto técnico (página, versión, dispositivo).
 *
 * Instalación y actualización: ver README.md en esta carpeta.
 */

const HOJA = 'Reportes';
const TIPOS = ['Bug', 'Sugerencia', 'Corrección de contenido', 'Otro'];
const ESTADOS = ['Nuevo', 'Revisando', 'Resuelto', 'Descartado'];
const MAX_POR_DIA = 300;        // tope global anti-spam (no hay forma de identificar al remitente)
const MAX_MENSAJE = 2000;

/** Recibe el POST del formulario. El cuerpo es JSON enviado como text/plain (evita el preflight CORS). */
function doPost(e) {
  try {
    const datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (datos.website) return respuesta({ ok: true }); // honeypot: los bots completan el campo oculto

    const tipo = TIPOS.indexOf(datos.tipo) >= 0 ? datos.tipo : 'Otro';
    const seccion = limpiar(datos.seccion, 60) || 'General';
    const mensaje = limpiar(datos.mensaje, MAX_MENSAJE);
    if (mensaje.length < 10) return respuesta({ ok: false, error: 'mensaje_corto' });

    const contexto = [limpiar(datos.origen, 40), limpiar(datos.version, 60), limpiar(datos.detalle, 300), limpiar(datos.dispositivo, 160)]
      .filter(String).join(' · ');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (!dentroDelTopeDiario()) return respuesta({ ok: false, error: 'limite_diario' });
      const hoja = obtenerHoja();
      hoja.appendRow([new Date(), tipo, seccion, mensaje, contexto, 'Nuevo', '']);
    } finally {
      lock.releaseLock();
    }
    return respuesta({ ok: true });
  } catch (err) {
    console.error(err);
    return respuesta({ ok: false, error: 'servidor' });
  }
}

/** Ejecutalo una vez a mano (menú Ejecutar) para crear y formatear la hoja. Se puede repetir sin perder datos. */
function configurar() {
  const hoja = obtenerHoja();
  const columnas = ['Fecha', 'Tipo', 'Sección', 'Mensaje', 'Contexto', 'Estado', 'Notas'];
  hoja.getRange(1, 1, 1, columnas.length).setValues([columnas])
    .setFontWeight('bold').setBackground('#123A38').setFontColor('#FFFFFF').setVerticalAlignment('middle');
  hoja.setFrozenRows(1);
  hoja.setRowHeight(1, 32);
  [150, 170, 120, 520, 280, 110, 260].forEach((ancho, i) => hoja.setColumnWidth(i + 1, ancho));
  hoja.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
  hoja.getRange('D:E').setWrap(true);
  hoja.getRange('G:G').setWrap(true);
  hoja.getRange('A:G').setVerticalAlignment('top');

  // Estado como lista desplegable para ir marcando lo revisado.
  const reglaEstado = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build();
  hoja.getRange('F2:F').setDataValidation(reglaEstado);

  // Colores por tipo y estado para leer de un vistazo.
  const colores = { 'Bug': '#FDE2E1', 'Sugerencia': '#E3F1FD', 'Corrección de contenido': '#FFF4D6', 'Otro': '#EEEEEE' };
  const reglas = Object.keys(colores).map((tipo) => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(tipo).setBackground(colores[tipo]).setRanges([hoja.getRange('B2:B')]).build());
  reglas.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Nuevo').setBold(true).setFontColor('#B3261E').setRanges([hoja.getRange('F2:F')]).build());
  reglas.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Resuelto').setFontColor('#1E7B4F').setRanges([hoja.getRange('F2:F')]).build());
  hoja.setConditionalFormatRules(reglas);

  if (!hoja.getFilter()) hoja.getRange(1, 1, Math.max(2, hoja.getLastRow()), columnas.length).createFilter();
}

/** Para probar desde el editor: agrega un reporte de ejemplo (borralo después). */
function probar() {
  const r = doPost({ postData: { contents: JSON.stringify({ tipo: 'Bug', seccion: 'Prueba', mensaje: 'Reporte de prueba desde el editor de Apps Script.', origen: 'editor' }) } });
  console.log(r.getContent());
}

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  return libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
}

function dentroDelTopeDiario() {
  const props = PropertiesService.getScriptProperties();
  const hoy = Utilities.formatDate(new Date(), 'America/Argentina/Buenos_Aires', 'yyyy-MM-dd');
  const clave = 'enviados_' + hoy;
  const enviados = Number(props.getProperty(clave) || 0);
  if (enviados >= MAX_POR_DIA) return false;
  props.setProperty(clave, String(enviados + 1));
  return true;
}

/** Texto plano, sin fórmulas: un mensaje que empieza con "=" o "+" no se ejecuta en la planilla. */
function limpiar(valor, max) {
  let texto = String(valor == null ? '' : valor).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;
  return texto;
}

function respuesta(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
