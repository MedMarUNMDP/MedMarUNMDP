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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-medmar-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
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
    `Subject: ${subject}`,
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

async function run(req: Request) {
  if (CRON_SECRET) {
    const secret = req.headers.get('x-medmar-cron-secret') || ''
    if (secret !== CRON_SECRET) return json({ ok: false, error: 'no_autorizado' }, 200)
  }
  const admin = adminClient()
  const emails = await processEmails(admin)
  return json({ ok: true, emails, timestamp: new Date().toISOString() })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    return await run(req)
  } catch (err) {
    console.error(err)
    return json({ ok: false, error: 'maintenance_error', detalle: String(err instanceof Error ? err.message : err) }, 200)
  }
})
