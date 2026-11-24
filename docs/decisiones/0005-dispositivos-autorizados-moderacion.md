# 0005 — Dispositivos autorizados para moderar

Fecha: 2026-11-23 · Estado: aceptada · Modifica: [0004](0004-llaves-de-moderacion.md)

## Contexto

Con la 0004, cada desbloqueo pedía el archivo `.medmarkey` y su contraseña (o «mantener 2 h»). Es seguro pero
incómodo para quien modera todos los días. Se pidió que el archivo sirva para **autorizar un dispositivo** una vez, y
que desde ahí moderar con esa cuenta en ese dispositivo no tenga trabas, sin perder la protección contra robo de
cuenta o de sesión.

## Decisión

- **Autorizar**: al desbloquear con el archivo, el navegador crea su **propio par ECDSA P-256** con la privada **no
  exportable**, guardada en IndexedDB bajo el `userId`. La llave del archivo firma
  `medmar-dispositivo-v1|<desafío>|<huella del dispositivo>` y la API (`autorizarDispositivo`) la registra como fila
  `tipo = 'dispositivo'`, hija (`padre_id`) de la llave del archivo, activa y con el mismo rol.
- **Usar**: el desbloqueo pasa a ser automático: el dispositivo firma el desafío de siempre (`abrirSesionModeracion`)
  y recibe el token de 30 min, que se renueva solo. Solo se usa si la sesión es de la misma cuenta.
- **Límites**:
  - un dispositivo no puede autorizar a otro (solo la llave del archivo);
  - vence si pasa **60 días sin usarse**;
  - cae si se revoca su archivo;
  - hay un máximo de 6 por cuenta (se revoca el más viejo).
- **Acciones críticas** (`autorizarModeracion(..., critica = true)`: aprobar llaves, dar y quitar roles) exigen una
  sesión abierta con la llave del **archivo**. La web lo pide sola (`archivo_requerido`). Durante esa pestaña se
  recuerda en memoria.
- **Visibilidad**:
  - cada autorización avisa en la campana de la propia cuenta y queda en el registro de moderación;
  - «Mi llave» lista los dispositivos y permite revocarlos con la cuenta, porque revocar quita permisos y nunca los da;
  - «Olvidar este dispositivo» lo revoca en el servidor y lo borra del navegador.
- Cerrar la sesión de la cuenta **no** borra la autorización del dispositivo.

## Consecuencias

- Robar la contraseña o la sesión de la cuenta y usarla desde **otro** dispositivo sigue sin permitir moderar.
- Riesgo aceptado: quien controle el navegador autorizado con la sesión iniciada (por ejemplo, una computadora
  compartida o XSS en medmar.com.ar) puede moderar mientras tanto. Lo mitigan:
  - la CSP estricta y el aviso de no autorizar computadoras compartidas;
  - el vencimiento por inactividad y la revocación por dispositivo;
  - que no se puedan hacer acciones críticas sin el archivo.
- Las autorizaciones viejas de «mantener 2 h» se descartan solas al leerlas.
