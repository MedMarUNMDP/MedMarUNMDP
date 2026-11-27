# 0006 — Sanciones: strikes, suspensiones y bloqueo por dispositivo

**Fecha:** 2026-11-29 · **Estado:** aceptada

## Contexto

Quitar contenido no alcanzaba para quien rompe las normas de forma reiterada. Hacía falta suspender cuentas con un
criterio claro y previsible, mostrarle a la persona el motivo y el plazo, y darle una instancia de descargo.

## Decisión

- **Tres strikes.** Cada uno suspende 30 días. El tercero, contando solo los de los últimos 12 meses que no se
  anularon, es **permanente**. Los strikes vencen al año: siguen en el historial, pero dejan de sumar.
- **Dos alcances, a elección del moderador:**
  - **Parcial** (el que se usa por defecto): no deja publicar en el foro ni en Compra venta, ni cambiar el seudónimo
    o la foto, ni mandar aportes. Los chats y el intercambio de comisiones siguen funcionando.
  - **Total**: además bloquea los chats, las comisiones, los likes, los votos y el ranking.
- **Bloqueo en un solo lugar.** Lo aplica la API, antes del `switch` de `handle()`
  (`RESTRICCION_SANCION` + `exigirSinSancion`). Como las escrituras pasan solo por la API (ADR 0002), no hay otra
  forma de saltearlo.
- **Bloqueo por dispositivo**, opcional y elegido por el moderador (de forma automática la sanción es solo de la
  cuenta):
  - Cada navegador genera un UUID al azar, lo guarda en `localStorage` (`medmar:dispositivo`) y lo manda en cada
    pedido como `dispositivoId`.
  - La API solo guarda su SHA-256 (`dispositivos_cuenta`) y lo anota en cada `bootstrap`.
  - Cuando la sanción incluye dispositivos, se copian a `dispositivos_sancionados` los navegadores que la cuenta usó
    en los últimos 90 días. Desde ahí la sanción alcanza a cualquier cuenta que entre en esos navegadores, y sigue
    vigente aunque la cuenta original se dé de baja.
- **Sin IP ni fingerprinting.** La red de la facultad comparte IP, así que bloquear por IP alcanzaría a cientos de
  estudiantes. El fingerprinting del navegador es invasivo y poco confiable.
- **Descargo.** En un baneo permanente la persona puede mandar **un** descargo a partir de los 30 días
  (`apelaciones.sancion_id` es único). Le llega al equipo por la campana y por mail.
- **Levantar o anular.** Un moderador puede **levantar** una sanción: termina, pero el strike sigue contando. También
  puede **anularla**: termina y además deja de contar. No se puede sancionar a moderadores ni administradores, ni
  revisar las sanciones propias. Todo queda en `registro_moderacion`.

## Consecuencias

- Quien borra los datos del sitio, usa otro navegador o una ventana privada esquiva el bloqueo por dispositivo.
  Es un freno para el usuario común, no una barrera absoluta.
- Cada acción bloqueable suma dos lecturas a la base, y cada `bootstrap` suma un upsert. Es un costo bajo para el
  plan Free.
- Los Términos (sección 10) ya prevén suspensiones y bajas. Si se quiere detallar el sistema de strikes ahí, hay que
  subir `TERMINOS_VERSION`.
