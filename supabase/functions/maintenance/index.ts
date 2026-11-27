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

// Intentos máximos por mail antes de dejarlo en 'error'.
const MAX_INTENTOS = 8
// Si falta la configuración de Gmail o Google rechaza el refresh token, las filas vuelven a 'pendiente' y se
// reintentan recién después de esta pausa (cada corrida del cron es una invocación: no hace falta martillar).
const PAUSA_SIN_GMAIL_MS = 30 * 60_000

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

function mensajeError(err: unknown) {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return String(err)
}

function adminClient() {
  if (!SUPABASE_URL || !SECRET_KEY) throw new Error('supabase_admin_secret_missing')
  return createClient(SUPABASE_URL, SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
}

type Admin = ReturnType<typeof adminClient>

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

// Error de configuración de Gmail (faltan secretos o Google no da access token): no es culpa de ningún mail en
// particular, así que no debe gastar intentos de la cola.
class GmailConfigError extends Error {}

async function gmailAccessToken() {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new GmailConfigError('gmail_secrets_missing')
  }
  const body = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    client_secret: GMAIL_CLIENT_SECRET,
    refresh_token: GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  })
  let res: Response
  try {
    res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch (err) {
    throw new GmailConfigError('gmail_token_red:' + mensajeError(err))
  }
  const data = await res.json().catch(() => ({}))
  // La respuesta de error de Google trae solo `error` y `error_description` (nunca el token): se puede loguear.
  if (!res.ok || !data.access_token) {
    throw new GmailConfigError(`gmail_token_error:${res.status}:${String(data.error || '')}:${String(data.error_description || '')}`)
  }
  return String(data.access_token)
}

async function sendGmail(token: string, to: string, subject: string, body: string) {
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

// Update de una fila de la cola con un reintento. Devuelve true si quedó guardado.
async function actualizarFila(admin: Admin, id: string, cambios: Record<string, unknown>, etiqueta: string) {
  for (let intento = 1; intento <= 2; intento++) {
    const { error } = await admin.from('notificacion_queue').update(cambios).eq('id', id)
    if (!error) return true
    console.error(etiqueta, id, 'intento', intento, error.message)
  }
  return false
}

// Devuelve a 'pendiente' las filas reclamadas sin gastarles el intento que les sumó claim_notification_batch.
async function liberarFilas(admin: Admin, rows: Array<Record<string, unknown>>, motivo: string) {
  const proximo = new Date(Date.now() + PAUSA_SIN_GMAIL_MS).toISOString()
  // Agrupadas por el valor de intentos para hacer un update por grupo (y no uno por fila).
  const porIntentos = new Map<number, string[]>()
  for (const row of rows) {
    const previos = Math.max(0, Number(row.intentos || 1) - 1)
    porIntentos.set(previos, [...(porIntentos.get(previos) || []), String(row.id)])
  }
  for (const [intentos, ids] of porIntentos) {
    const { error } = await admin.from('notificacion_queue').update({
      status: 'pendiente',
      intentos,
      ultimo_error: motivo.slice(0, 500),
      next_attempt_at: proximo,
    }).in('id', ids).eq('status', 'procesando')
    // Si esto falla, claim_notification_batch las vuelve a tomar solas a los 10 minutos (con un intento de más).
    if (error) console.error('cola_liberar_fallo', ids.length, error.message)
  }
}

async function marcarFallo(admin: Admin, id: string, attempts: number, motivo: string) {
  const delayMs = Math.min(60 * 60_000, 30_000 * (2 ** Math.min(attempts - 1, 6)))
  await actualizarFila(admin, id, {
    status: attempts >= MAX_INTENTOS ? 'error' : 'pendiente',
    ultimo_error: motivo.slice(0, 500),
    next_attempt_at: attempts >= MAX_INTENTOS ? null : new Date(Date.now() + delayMs).toISOString(),
  }, 'cola_fallo_no_guardado')
}

async function processEmails(admin: Admin) {
  const { data: rows, error } = await admin.rpc('claim_notification_batch', { p_limit: 20 })
  if (error) throw error
  const filas = (rows || []) as Array<Record<string, unknown>>
  if (!filas.length) return { sent: 0, failed: 0, seen: 0 }

  // Un solo access token por corrida. Si no se puede obtener, se corta el lote sin gastar intentos.
  let token: string
  try {
    token = await gmailAccessToken()
  } catch (err) {
    const motivo = mensajeError(err)
    console.error('gmail_no_disponible', motivo)
    await liberarFilas(admin, filas, motivo)
    return { sent: 0, failed: 0, seen: filas.length, liberadas: filas.length, error: 'gmail_no_disponible' }
  }

  let sent = 0
  let failed = 0
  let sinEstado = 0
  for (let i = 0; i < filas.length; i++) {
    const row = filas[i]
    const id = String(row.id)
    const attempts = Number(row.intentos || 1)

    // Ya se mandó en una corrida anterior pero el estado no llegó a guardarse: no reenviar.
    if (row.sent_at) {
      await actualizarFila(admin, id, { status: 'enviado', ultimo_error: null, next_attempt_at: null }, 'cola_enviado_no_guardado')
      continue
    }

    const { data: authUser, error: userError } = await admin.auth.admin.getUserById(String(row.user_id))
    if (userError || !authUser.user?.email) {
      await marcarFallo(admin, id, attempts, 'user_email_not_found')
      failed++
      continue
    }

    try {
      await sendGmail(token, String(authUser.user.email), String(row.asunto), String(row.cuerpo))
    } catch (err) {
      await marcarFallo(admin, id, attempts, mensajeError(err))
      failed++
      continue
    }

    // El mail ya salió: guardar el estado (con un reintento). Si igual no se guarda, la fila queda en 'procesando'
    // y claim_notification_batch la volvería a tomar en 10 minutos y la reenviaría; se loguea para revisarlo.
    sent++
    const ok = await actualizarFila(admin, id, {
      status: 'enviado',
      sent_at: new Date().toISOString(),
      ultimo_error: null,
      next_attempt_at: null,
    }, 'cola_enviado_no_guardado')
    if (!ok) {
      sinEstado++
      // Si la base no responde, no seguir mandando mails cuyo estado tampoco se podría guardar: las filas que
      // faltan vuelven a 'pendiente' sin gastar intento (y las que sí, quedan como antes).
      await liberarFilas(admin, filas.slice(i + 1).filter((r) => !r.sent_at), 'cola_sin_base')
      break
    }
  }
  return { sent, failed, seen: filas.length, ...(sinEstado ? { sinEstado } : {}) }
}

// Bajas de cuenta vencidas (pedidas con solicitarBaja hace 30 días o más y no canceladas). Se borra el usuario de Auth:
// profiles, publicaciones, chats, solicitudes, votos, puntajes, clasificados, etc. caen en cascada. Antes, sus fotos.
async function procesarBajas(admin: Admin) {
  const { data, error } = await admin.from('profiles').select('id,is_admin')
    .lte('baja_programada_para', new Date().toISOString())
    .order('baja_programada_para', { ascending: true }).limit(20)
  if (error) throw error
  let borradas = 0
  for (const p of data || []) {
    const id = String(p.id)
    if (p.is_admin) { console.warn('baja_admin_omitida', id); continue }
    try {
      const { data: fotos } = await admin.storage.from('profile-photos').list(id, { limit: 100 })
      const rutas = (fotos || []).map((o: { name: string }) => id + '/' + o.name)
      if (rutas.length) await admin.storage.from('profile-photos').remove(rutas)
    } catch (err) { console.warn('baja_fotos', id, String(err)) }
    const { error: delError } = await admin.auth.admin.deleteUser(id)
    if (delError) { console.error('baja_fallida', id, delError.message); continue }
    borradas++
  }
  return { borradas, vistas: (data || []).length }
}

// Autoriza la llamada del cron. Falla cerrada: sin token válido no se procesa nada.
// El token vive en Supabase Vault (`medmar_cron_secret`, creado por la migración de cron) y pg_cron lo manda en
// el header; también se acepta `MEDMAR_CRON_SECRET` (secret de la Edge Function) por compatibilidad.
async function autorizado(req: Request, admin: Admin) {
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

// Cada tarea en su propio try/catch: si falla una, la otra corre igual.
async function tarea<T>(nombre: string, fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn()
  } catch (err) {
    console.error('tarea_fallida', nombre, mensajeError(err))
    return { error: nombre + '_error' }
  }
}

async function run(req: Request) {
  const admin = adminClient()
  if (!(await autorizado(req, admin))) return json({ ok: false, error: 'no_autorizado' }, 401)
  const emails = await tarea('emails', () => processEmails(admin))
  const bajas = await tarea('bajas', () => procesarBajas(admin))
  const ok = !('error' in emails) && !('error' in bajas)
  return json({ ok, emails, bajas, timestamp: new Date().toISOString() }, ok ? 200 : 500)
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