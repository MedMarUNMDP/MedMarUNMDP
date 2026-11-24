// Carga las credenciales de Gmail que usa la función `maintenance` para mandar los mails de MedMar
// (intercambios encontrados y avisos al equipo de moderación). Ver tools/gmail/README.md.
//
// Uso (en tu terminal, desde la raíz del repo):   node tools/gmail/obtener-credenciales.mjs
//
// 1. Pide el ID y el secreto del cliente OAuth (el secreto no se muestra mientras lo pegás).
// 2. Abre el navegador para que autorices a MedMar a *enviar* mails con la cuenta de MedMar (permiso gmail.send).
// 3. Manda un mail de prueba a esa misma cuenta.
// 4. Guarda GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_FROM_EMAIL y GMAIL_FROM_NAME como secrets
//    de las Edge Functions con la CLI de Supabase (usa tu `supabase login`).
//
// Nada se imprime ni se guarda en el repo: el archivo temporal para la CLI se borra al terminar.

import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { execFile, spawnSync } from 'node:child_process'

const PROJECT_REF = 'ekfwdrsehhmrqxxlefyx'
const PUERTO = 53682
const REDIRECT = `http://127.0.0.1:${PUERTO}`
const SCOPE = 'https://www.googleapis.com/auth/gmail.send'

function preguntar(texto, { oculto = false, porDefecto = '' } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    if (oculto) {
      // Nunca escribe lo tipeado: el prompt tal cual y un asterisco por carácter (también al redibujar la línea).
      rl._writeToOutput = (s) => {
        if (s.startsWith(texto)) rl.output.write(texto + '*'.repeat(s.length - texto.length))
        else if (/^\x1b/.test(s) || s === '\r\n' || s === '\n') rl.output.write(s)
        else rl.output.write('*'.repeat(s.length))
      }
    }
    rl.question(texto, (r) => { rl.close(); if (oculto) process.stdout.write('\n'); resolve(r.trim() || porDefecto) })
  })
}

function base64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

function esperarCodigo(estado) {
  return new Promise((resolve, reject) => {
    const servidor = http.createServer((req, res) => {
      const url = new URL(req.url, REDIRECT)
      if (url.pathname !== '/') { res.writeHead(404); res.end(); return }
      const error = url.searchParams.get('error')
      const codigo = url.searchParams.get('code')
      const ok = !error && codigo && url.searchParams.get('state') === estado
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(ok
        ? '<h2>Listo. Ya podés cerrar esta pestaña y volver a la terminal.</h2>'
        : '<h2>No se pudo autorizar. Volvé a la terminal.</h2>')
      servidor.close()
      if (ok) resolve(codigo)
      else reject(new Error(error ? 'Google respondió: ' + error : 'respuesta inválida (state distinto)'))
    })
    servidor.on('error', reject)
    servidor.listen(PUERTO, '127.0.0.1')
    setTimeout(() => { servidor.close(); reject(new Error('pasaron 5 minutos sin autorizar')) }, 5 * 60_000).unref()
  })
}

async function enviarPrueba(accessToken, desde) {
  const asunto = 'MedMar · Prueba de envío'
  const mime = [
    `From: MedMar <${desde}>`, `To: ${desde}`,
    `Subject: =?UTF-8?B?${Buffer.from(asunto).toString('base64')}?=`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '',
    'Si te llegó este mail, MedMar ya puede mandar avisos por correo.',
  ].join('\r\n')
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: base64url(Buffer.from(mime)) }),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error('Gmail rechazó el mail de prueba: ' + (d.error?.message || res.status) +
      (res.status === 403 ? ' (¿habilitaste la Gmail API en el proyecto de Google Cloud?)' : ''))
  }
}

async function main() {
  console.log('\nCredenciales de Gmail para MedMar (ver tools/gmail/README.md)\n')
  const clientId = await preguntar('ID de cliente OAuth (termina en .apps.googleusercontent.com): ')
  if (!/\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error('ese no parece un ID de cliente de Google')
  const clientSecret = await preguntar('Secreto del cliente (no se ve al pegarlo): ', { oculto: true })
  if (clientSecret.length < 10) throw new Error('falta el secreto del cliente')
  const desde = await preguntar('Cuenta que manda los mails [MedMarUNMDP@gmail.com]: ', { porDefecto: 'MedMarUNMDP@gmail.com' })

  const estado = base64url(crypto.randomBytes(24))
  const verificador = base64url(crypto.randomBytes(48))
  const desafio = base64url(crypto.createHash('sha256').update(verificador).digest())
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: clientId, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPE,
    access_type: 'offline', prompt: 'consent', state: estado, login_hint: desde,
    code_challenge: desafio, code_challenge_method: 'S256',
  })
  const codigoPromesa = esperarCodigo(estado)
  console.log('\nSe abre el navegador. Entrá con ' + desde + ' y aceptá el permiso para enviar mails.')
  console.log('Si no se abre, copiá este enlace en el navegador:\n\n' + url + '\n')
  if (process.platform === 'win32') execFile('rundll32', ['url.dll,FileProtocolHandler', url], () => {})
  else execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], () => {})
  const codigo = await codigoPromesa

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code: codigo, client_id: clientId, client_secret: clientSecret, redirect_uri: REDIRECT,
      grant_type: 'authorization_code', code_verifier: verificador }),
  })
  const tokens = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok) throw new Error('Google no entregó el token: ' + (tokens.error_description || tokens.error || tokenRes.status))
  if (!tokens.refresh_token) throw new Error('Google no entregó un refresh token. Quitá el acceso de la app en myaccount.google.com/permissions y volvé a correr el script.')

  console.log('Autorizado. Mandando un mail de prueba a ' + desde + '…')
  await enviarPrueba(tokens.access_token, desde)
  console.log('Mail de prueba enviado.')

  const archivo = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'medmar-gmail-')), 'secrets.env')
  const valor = (v) => '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
  try {
    fs.writeFileSync(archivo, [
      'GMAIL_CLIENT_ID=' + valor(clientId),
      'GMAIL_CLIENT_SECRET=' + valor(clientSecret),
      'GMAIL_REFRESH_TOKEN=' + valor(tokens.refresh_token),
      'GMAIL_FROM_EMAIL=' + valor(desde),
      'GMAIL_FROM_NAME=' + valor('MedMar'),
    ].join('\n') + '\n', { mode: 0o600 })
    console.log('\nGuardando los secrets en Supabase (CLI)…')
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    const r = spawnSync(npx, ['-y', 'supabase@2.48.3', 'secrets', 'set', '--project-ref', PROJECT_REF, '--env-file', archivo],
      { stdio: 'inherit', shell: process.platform === 'win32' })
    if (r.status !== 0) throw new Error('la CLI de Supabase no pudo guardar los secrets (¿hiciste supabase login?)')
  } finally {
    fs.rmSync(path.dirname(archivo), { recursive: true, force: true })
  }
  console.log('\nListo: MedMar ya puede mandar mails. Fijate que te haya llegado el de prueba a ' + desde + '.\n')
}

main().catch((e) => { console.error('\nNo se pudo completar: ' + (e?.message || e) + '\n'); process.exit(1) })
