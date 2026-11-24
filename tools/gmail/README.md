# Mails de MedMar (Gmail)

La función `maintenance` manda los mails de MedMar con la Gmail API usando la cuenta de MedMar:

- «Se encontró un intercambio de comisión»;
- avisos al equipo de moderación: denuncias, aportes y reportes nuevos (como mucho un mail por tema cada 4 horas por
  persona; cada uno los puede apagar en Moderación → Mi llave).

Para eso necesita cinco secrets en Supabase: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`,
`GMAIL_FROM_EMAIL` y `GMAIL_FROM_NAME`. Si faltan, los mails quedan en la cola con el error `gmail_secrets_missing`.

## 1. Preparar Google Cloud (una sola vez)

Entrá a <https://console.cloud.google.com> con la cuenta de MedMar y elegí (o creá) un proyecto.

1. **Habilitar la Gmail API**: APIs y servicios → Biblioteca → «Gmail API» → Habilitar.
2. **Pantalla de consentimiento** (en la consola nueva se llama *Google Auth Platform*):
   - tipo de usuario **Externo**, nombre «MedMar» y el email de MedMar;
   - en *Público* (Audience) tocá **Publicar app** para que quede **En producción**. Si queda «En prueba», Google
     vence la autorización a los 7 días y los mails dejan de salir.
3. **Cliente OAuth**: Credenciales (o *Clientes*) → Crear → ID de cliente de OAuth → tipo **App de escritorio** →
   nombre «MedMar mails». Copiá el **ID de cliente** y el **secreto**.

## 2. Autorizar y guardar los secrets

En una terminal, desde la carpeta del repo:

```powershell
node tools/gmail/obtener-credenciales.mjs
```

El script:

1. te pide el ID y el secreto (el secreto no se ve al pegarlo);
2. abre el navegador para que entres con la cuenta de MedMar y aceptes **solo el permiso de enviar mails**. Como la app
   no está verificada por Google, aparece un aviso: tocá *Configuración avanzada → Ir a MedMar*. Es tu propia app.
3. manda un mail de prueba a esa misma cuenta;
4. guarda los cinco secrets en Supabase con la CLI (usa tu `supabase login`) y borra el archivo temporal.

No imprime ni guarda los secretos en ningún lado. No hace falta volver a desplegar `maintenance`: toma los secrets nuevos sola.

## Si algo falla

- **No llega nada**: en Supabase → Table Editor → `notificacion_queue` mirá la columna `ultimo_error`.
  - `gmail_secrets_missing`: faltan los secrets, corré el script.
  - `gmail_token_error … invalid_grant`: se venció o se revocó la autorización (por ejemplo, la app quedó «En prueba»).
    Corré el script de nuevo.
- **«No entregó un refresh token»**: quitá el acceso de la app en <https://myaccount.google.com/permissions> y corré el
  script otra vez.
- **Cupo**: una cuenta de Gmail común manda unos 500 mails por día. Los avisos al equipo están agrupados para no acercarse.
- **Rotar el secreto del cliente**: creá uno nuevo en Google Cloud y corré el script de nuevo.
