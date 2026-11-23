import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
function readSupabaseSecretKey() {
  const named = Deno.env.get('SUPABASE_SECRET_KEYS') || ''
  if (named) {
    try {
      const parsed = JSON.parse(named)
      if (parsed?.default) return String(parsed.default)
    } catch (_) {}
  }
  return Deno.env.get('MEDMAR_SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
}

const SECRET_KEY = readSupabaseSecretKey()
const CRON_SECRET = Deno.env.get('MEDMAR_CRON_SECRET') || ''
const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID') || ''
const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET') || ''
const GMAIL_REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN') || ''
const GMAIL_FROM_EMAIL = Deno.env.get('GMAIL_FROM_EMAIL') || 'MedMarUNMDP@gmail.com'
const GMAIL_FROM_NAME = Deno.env.get('GMAIL_FROM_NAME') || 'MedMarUNMDP'

// Lo llama solo pg_cron, nunca un navegador: sin cabeceras CORS.
const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
}

function compararSeguro(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b)
  let dif = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) dif |= (x[i] || 0) ^ (y[i] || 0)
  return dif === 0
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function adminClient() {
  if (!SUPABASE_URL || !SECRET_KEY) throw new Error('supabase_admin_secret_missing')
  return createClient(SUPABASE_URL, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}

function base64url(bytes: Uint8Array) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function utf8Base64url(value: string) {
  return base64url(new TextEncoder().encode(value))
}

async function gmailAccessToken() {
  const body = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    client_secret: GMAIL_CLIENT_SECRET,
    refresh_token: GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) throw new Error(`gmail_token_error:${JSON.stringify(data)}`)
  return String(data.access_token)
}

async function sendGmail(to: string, subject: string, body: string) {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error('gmail_secrets_missing')
  }
  const token = await gmailAccessToken()
  const mime = [
    `From: ${GMAIL_FROM_NAME} <${GMAIL_FROM_EMAIL}>`,
    `To: ${to}`,
    // RFC 2047: el asunto lleva tildes ("comisión"); sin codificar, algunos clientes lo muestran roto.
    `Subject: =?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(subject.replace(/[\r\n]+/g, ' '))))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n')
  const raw = utf8Base64url(mime)
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`gmail_send_error:${JSON.stringify(data)}`)
  return data
}

async function processEmails(admin: ReturnType<typeof adminClient>) {
  const { data: rows, error } = await admin.rpc('claim_notification_batch', { p_limit: 20 })
  if (error) throw error

  let sent = 0
  let failed = 0
  for (const row of rows || []) {
    const attempts = Number(row.intentos || 1)
    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(String(row.user_id))
    if (userError || !authUser.user?.email) {
      await admin.from('notificacion_queue').update({
        status: attempts >= 8 ? 'error' : 'pendiente',
        ultimo_error: 'user_email_not_found',
        next_attempt_at: attempts >= 8 ? null : new Date(Date.now() + Math.min(60 * 60_000, 30_000 * (2 ** Math.min(attempts, 6)))).toISOString(),
      }).eq('id', row.id)
      failed++
      continue
    }

    try {
      await sendGmail(String(authUser.user.email), String(row.asunto), String(row.cuerpo))
      await admin.from('notificacion_queue').update({
        status: 'enviado',
        sent_at: new Date().toISOString(),
        ultimo_error: null,
        next_attempt_at: null,
      }).eq('id', row.id)
      sent++
    } catch (err) {
      const delayMs = Math.min(60 * 60_000, 30_000 * (2 ** Math.min(attempts - 1, 6)))
      await admin.from('notificacion_queue').update({
        status: attempts >= 8 ? 'error' : 'pendiente',
        ultimo_error: String(err instanceof Error ? err.message : err),
        next_attempt_at: attempts >= 8 ? null : new Date(Date.now() + delayMs).toISOString(),
      }).eq('id', row.id)
      failed++
    }
  }
  return { sent, failed, seen: (rows || []).length }
}

// Autoriza la llamada del cron. Falla cerrada: sin token válido no se procesa nada.
// El token vive en Supabase Vault (`medmar_cron_secret`, creado por la migración de cron) y pg_cron lo manda en
// el header; también se acepta `MEDMAR_CRON_SECRET` (secret de la Edge Function) por compatibilidad.
async function autorizado(req: Request, admin: ReturnType<typeof adminClient>) {
  const token = req.headers.get('x-medmar-cron-secret') || ''
  if (token.length < 32 || token.length > 256) return false
  if (CRON_SECRET && compararSeguro(token, CRON_SECRET)) return true
  const { data, error } = await admin.rpc('cron_token_valido', { p_token: token })
  if (error) {
    console.error('cron_token_check_failed', error.message)
    return false
  }
  return data === true
}

async function run(req: Request) {
  const admin = adminClient()
  if (!(await autorizado(req, admin))) return json({ ok: false, error: 'no_autorizado' }, 401)
  const emails = await processEmails(admin)
  return json({ ok: true, emails, timestamp: new Date().toISOString() })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    return await run(req)
  } catch (err) {
    console.error(err)
    return json({ ok: false, error: 'maintenance_error' }, 500)
  }
})
