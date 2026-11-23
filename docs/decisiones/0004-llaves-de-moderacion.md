# 0004 — Llaves de moderación (segundo factor criptográfico)

Fecha: 2026-11-24 · Estado: aceptada

## Contexto

Hasta ahora moderar dependía solo de la cuenta: `profiles.is_moderator` / `is_admin`. Si alguien robaba la
sesión de un moderador (cookie, token, contraseña filtrada), heredaba todo: borrar contenido, aprobar material,
dar roles. Se pidió un mecanismo que exija, además de la cuenta, algo que la persona tenga (una «llave»).

## Decisión

Cada acción de moderación o administración exige **tres cosas**: la cuenta con el rol, una **llave registrada y
activa** de esa misma cuenta, y un **token de moderación vigente** obtenido firmando un desafío con esa llave.

- **La llave** es un par ECDSA P-256 generado en el navegador (WebCrypto). La privada se guarda en un archivo
  `.medmarkey` cifrado con la contraseña de la llave (PBKDF2-SHA256, 600 000 iteraciones → AES-GCM 256, con la
  huella como dato asociado). Ni el archivo ni la contraseña se mandan al servidor. Al abrirse, la llave privada se
  importa como **no exportable**.
- **El servidor** guarda solo la llave pública y su **huella** (primeros 8 bytes del SHA-256, `A1B2-C3D4-E5F6-0718`)
  en `llaves_moderacion`, sin acceso desde el navegador.
- **Desbloquear**: `desafioModeracion` devuelve un desafío firmado con HMAC (2 min, atado al usuario) →
  el navegador lo firma con la llave → `abrirSesionModeracion` verifica la firma contra la pública registrada y
  devuelve un **token HMAC de 30 min** (usuario + llave + rol + vencimiento). Los HMAC usan una clave derivada de la
  secret key de Supabase, igual que las entradas de partida del juego.
- **Cada acción** (`autorizarModeracion`) verifica el token y vuelve a consultar en la base que la llave siga activa,
  que sea del usuario y que el rol de la cuenta coincida. Revocar una llave corta todas sus sesiones al instante.
- **Comodidad**: mientras la pestaña está abierta, el token se renueva solo (se firma otro desafío). Opcionalmente,
  «Mantener desbloqueado 2 h» guarda la llave privada **no exportable** en IndexedDB de ese dispositivo; se borra al
  bloquear o al cerrar sesión (la UI advierte no usarlo en computadoras compartidas).
- **Desafíos de un solo uso** (el nonce queda en `idempotency_keys`) y llaves públicas validadas como punto de la curva.
- **Aprobar una llave** exige que el admin escriba la huella que le pasó la persona por otro canal (no basta un clic).
  Una llave de admin solo la revoca un admin con su llave (o SQL); la propia de moderador se puede revocar con la
  cuenta, y en ese caso se avisa a los admins.
- **Denuncias** solo se leen por la API (se quitó la política de SELECT directo para moderadores).
- **Raíz de confianza**: las llaves de **admin** solo se activan con SQL desde el dashboard de Supabase (la web genera
  el archivo y el `insert` con la parte pública). Las de **moderador** las registra el propio moderador (quedan
  `pendiente`) y las aprueba un admin con su llave, después de comparar la huella por otro canal.
- **Auditoría**: `registro_moderacion` anota cada desbloqueo, firma inválida y acción de moderación (180 días).

## Consecuencias

- Robar solo la cuenta de un moderador o admin no permite moderar ni escalar privilegios: falta el archivo y su
  contraseña, y una cuenta robada no puede activar llaves nuevas (moderador → necesita aprobación de un admin con
  llave; admin → solo por SQL).
- Perder el archivo o la contraseña no tiene recuperación: se revoca la llave (la propia se puede revocar solo con la
  cuenta) y se crea otra. Conviene que el admin tenga dos llaves en dispositivos distintos.
- Si se rota la secret key de Supabase, los tokens de moderación en curso dejan de valer: hay que desbloquear de nuevo.
- Riesgo residual: un dispositivo comprometido con la moderación desbloqueada (o recordada 2 h) permite moderar
  mientras dure; por eso existe «Bloquear», la ventana corta de 2 h y la auditoría.
