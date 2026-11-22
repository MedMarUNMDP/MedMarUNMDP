import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const PUBLISHABLE_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
const SECRET_KEY = Deno.env.get('MEDMAR_SUPABASE_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_TITLE = 140
const MAX_CONTENT = 5000
const MAX_MESSAGE = 2000
const MAX_CHAT_MESSAGES = 500
const MAX_TAGS = 5
const MAX_TAG_LENGTH = 24
const MAX_CYCLE = 50
const CHAT_DAYS = 14

const RATE_LIMITS: Record<string, [number, number]> = {
  guardar: [8, 600],
  editar: [12, 600],
  borrar: [20, 600],
  misSolicitudes: [30, 300],
  misIntercambios: [30, 300],
  miPerfil: [30, 300],
  obtenerChat: [120, 300],
  enviarMensaje: [120, 300],
  actualizarPseudonimo: [5, 3600],
  actualizarFoto: [5, 3600],
  crearHilo: [5, 600],
  listarHilos: [60, 300],
  listarEtiquetas: [20, 300],
  foroBootstrap: [60, 300],
  verHilo: [120, 300],
  crearRespuesta: [20, 600],
  borrarHilo: [20, 600],
  borrarRespuesta: [40, 600],
  denunciar: [5, 1800],
  toggleLike: [100, 600],
  listarDenuncias: [30, 300],
  resolverDenuncia: [30, 600],
  listarModeradores: [20, 3600],
  asignarModerador: [10, 3600],
  quitarModerador: [10, 3600],
  completarPerfil: [8, 3600],
  resolverImagen: [30, 300],
  soyModerador: [30, 300],
  bootstrap: [30, 300],
  iniciarPartida: [60, 3600],
  guardarPuntaje: [30, 3600],
  rankingJuego: [60, 300],
}

const ALLOWED_HOSTS = [
  'youtube.com','youtu.be','youtube-nocookie.com',
  'docs.google.com','drive.google.com','forms.google.com','sheets.google.com','slides.google.com',
  'classroom.google.com','sites.google.com','scholar.google.com',
  'unmdp.edu.ar','doi.org','pubmed.ncbi.nlm.nih.gov','pmc.ncbi.nlm.nih.gov','scielo.org',
  'sciencedirect.com','springer.com','link.springer.com','nature.com','wiley.com','bmj.com',
  'jamanetwork.com','plos.org','frontiersin.org','cochranelibrary.com','thelancet.com',
  'arxiv.org','biorxiv.org','medrxiv.org','acs.org','ieeexplore.ieee.org',
  'open.spotify.com','spotify.com','steampowered.com','steamcommunity.com',
  'prnt.sc','lightshot.com','lightshot.org','pinetools.com','screenapp.io','imgur.com','imgur.io','ibb.co','postimg.cc','imgbb.com','imageshack.com','imgbox.com',
]

// CORS: solo los orígenes del sitio (y el servidor local de desarrollo) pueden llamar a la API desde un navegador.
// https://supabase.com/docs/guides/functions/cors
const ALLOWED_ORIGINS = new Set([
  'https://medmar.com.ar',
  'https://www.medmar.com.ar',
  'https://medmarunmdp.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
])
const MAX_BODY_BYTES = 1_000_000
const MAX_MATERIA = 120
const MAX_PHOTO_BYTES = 256 * 1024
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || ''
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://medmar.com.ar',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}

function uuidOrEmpty(value: unknown) {
  const text = String(value || '').trim()
  return UUID_RE.test(text) ? text.toLowerCase() : ''
}

function validMateria(value: string) {
  return value.length > 0 && value.length <= MAX_MATERIA && /^[\p{L}\p{N} ,.°()'-]+$/u.test(value)
}

function pgCode(error: unknown) {
  return String((error as { code?: string } | null)?.code || '')
}

function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function userClient(authHeader: string): SupabaseClient {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireUser(req: Request): Promise<{ user: User; client: SupabaseClient } | { error: Response }> {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return { error: json({ ok: false, error: 'sesion_invalida' }, 200) }
  const client = userClient(auth)
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) return { error: json({ ok: false, error: 'sesion_invalida' }, 200) }
  return { user: data.user, client }
}

async function rateLimit(admin: SupabaseClient, action: string, userId: string) {
  const rule = RATE_LIMITS[action]
  if (!rule) return null
  const { data, error } = await admin.rpc('consume_rate_limit', {
    p_bucket_key: `${action}:${userId}`,
    p_limit: rule[0],
    p_window_seconds: rule[1],
  })
  if (error) {
    // Falla abierta a propósito (disponibilidad), pero queda registrado en los logs de la función.
    console.error('rate_limit_unavailable', action, error.message)
    return null
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.allowed) return json({ ok: false, error: 'rate_limit', retryAfter: Number(row?.retry_after || 1) }, 200)
  return null
}

async function rateLimitKey(admin: SupabaseClient, bucket: string, limit: number, windowSeconds: number) {
  const { data, error } = await admin.rpc('consume_rate_limit', {
    p_bucket_key: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) return null
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.allowed) return json({ ok: false, error: 'rate_limit', retryAfter: Number(row?.retry_after || 1) }, 200)
  return null
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function genericCredentialError() {
  return json({ ok: false, error: 'credenciales_invalidas' }, 200)
}

async function legacyLogin(admin: SupabaseClient, emailRaw: string, password: string) {
  const email = String(emailRaw || '').trim().toLowerCase()
  if (!email || !password || email.length > 254) return genericCredentialError()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return genericCredentialError()

  const rl = await rateLimitKey(admin, `legacyLogin:${await sha256Hex(email)}`, 5, 600)
  if (rl) return rl

  const { data: rows, error } = await admin.rpc('get_legacy_password', { p_email: email })
  if (error) throw error
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row || row.migrated_at) return json({ ok: true, handled: false }, 200)

  const computed = await sha256Hex(password + '|' + String(row.legacy_salt || ''))
  if (computed.toLowerCase() !== String(row.legacy_hash || '').toLowerCase()) return genericCredentialError()

  let targetUser: User | null = null
  for (let page = 1; page <= 10; page++) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (listError) throw listError
    targetUser = (data.users || []).find((u: any) => String(u.email || '').toLowerCase() === email) || null
    if (targetUser || !(data.users || []).length || (data.users || []).length < 1000) break
  }

  if (!targetUser) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { migrated_from_medmar: true },
    })
    if (createError || !created.user) throw createError || new Error('legacy_create_user_failed')
    targetUser = created.user
  } else {
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(targetUser.id, { password, email_confirm: true })
    if (updateError || !updated.user) throw updateError || new Error('legacy_update_user_failed')
  }

  await admin.rpc('mark_legacy_password_migrated', { p_email: email })
  return json({ ok: true, handled: true, migrated: true }, 200)
}

function validOperationId(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function cleanTags(raw: unknown) {
  // En minúsculas: el filtro por etiqueta compara en minúsculas (`contains`), así una etiqueta "Anatomía" no queda inencontrable.
  const text = String(raw || '').normalize('NFC').toLowerCase()
  return [...new Set(text.split(',')
    .map(x => x.replace(/[^\p{L}\p{N} _-]/gu, '').trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH))
    .filter(Boolean))]
    .slice(0, MAX_TAGS)
}

function safeLink(raw: unknown) {
  const value = String(raw || '').trim()
  if (!value) return ''
  try {
    const u = new URL(value)
    const host = u.hostname.toLowerCase().replace(/\.$/, '')
    const allowed = ALLOWED_HOSTS.some(d => host === d || host.endsWith(`.${d}`))
    if (u.protocol !== 'https:' || u.username || u.password || !allowed) return ''
    return u.toString()
  } catch {
    return ''
  }
}

function extractUrls(text: string) {
  return [...new Set((String(text || '').match(/https?:\/\/[^\s<>\"']+/gi) || []).map(x => x.replace(/[),.;!?]+$/g, '')))].slice(0, 10)
}

function validateContentLinks(text: string) {
  const urls = extractUrls(text)
  for (const raw of urls) {
    if (!safeLink(raw)) return { ok: false, urls, invalid: raw }
  }
  return { ok: true, urls, invalid: '' }
}

const IMAGE_PAGE_HOSTS = ['prnt.sc','lightshot.com','lightshot.org','pinetools.com','screenapp.io','imgur.com','imgur.io','ibb.co','postimg.cc','imgbb.com','imageshack.com','imgbox.com']
function isPrivateOrLocalHost(host: string) {
  const h = host.toLowerCase().replace(/\.$/, '')
  return h === 'localhost' || h.endsWith('.localhost') || h === '::1' || h.startsWith('127.') || h.startsWith('10.') || h.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '0.0.0.0'
}

async function resolveExternalImage(raw: string) {
  const safe = safeLink(raw)
  if (!safe) return ''
  let current = new URL(safe)
  const initialHost = current.hostname.toLowerCase()
  if (!IMAGE_PAGE_HOSTS.some(d => initialHost === d || initialHost.endsWith('.' + d))) return ''
  for (let i = 0; i < 4; i++) {
    if (current.protocol !== 'https:' || current.username || current.password || isPrivateOrLocalHost(current.hostname)) return ''
    const response = await fetch(current.toString(), { redirect: 'manual', signal: AbortSignal.timeout(4500), headers: { 'User-Agent': 'MedMarPreview/1.0', 'Accept': 'text/html,image/*;q=0.8' } })
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location')
      if (!location) return ''
      const next = new URL(location, current)
      if (!safeLink(next.toString())) return ''
      current = next
      continue
    }
    const type = (response.headers.get('content-type') || '').toLowerCase()
    if (type.startsWith('image/')) return current.toString()
    if (!type.includes('text/html')) return ''
    const html = (await response.text()).slice(0, 1_000_000)
    const candidates = [...html.matchAll(/<meta[^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"'][^>]+content=[\"']([^\"']+)[\"'][^>]*>/gi), ...html.matchAll(/<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"'][^>]*>/gi)]
    const value = candidates[0]?.[1]
    if (!value) return ''
    const imageUrl = new URL(value.replace(/&amp;/g, '&'), current)
    if (imageUrl.protocol !== 'https:' || imageUrl.username || imageUrl.password || isPrivateOrLocalHost(imageUrl.hostname)) return ''
    const imageHost = imageUrl.hostname.toLowerCase()
    const allowedImage = !!safeLink(imageUrl.toString())
    return allowedImage ? imageUrl.toString() : ''
  }
  return ''
}

async function profileMap(client: SupabaseClient, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map<string, any>()
  const { data, error } = await client.from('profiles').select('id,pseudonimo,foto_url,is_moderator').in('id', unique)
  if (error) throw error
  return new Map((data || []).map(p => [String(p.id), p]))
}

async function isModerator(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.rpc('is_moderator', { uid: userId })
  if (error) return false
  return !!data
}

async function isAdmin(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.rpc('is_admin', { uid: userId })
  if (error) return false
  return !!data
}

async function saveIdempotent(admin: SupabaseClient, userId: string, action: string, operationId: string, response: any) {
  await admin.from('idempotency_keys').upsert({ user_id: userId, operation_id: operationId, action, response }, { onConflict: 'user_id,operation_id' })
}

async function getIdempotent(admin: SupabaseClient, userId: string, operationId: string) {
  const { data } = await admin.from('idempotency_keys').select('response').eq('user_id', userId).eq('operation_id', operationId).maybeSingle()
  return data?.response ?? null
}

async function findCycle(admin: SupabaseClient, materia: string) {
  const { data, error } = await admin.from('solicitudes')
    .select('id,user_id,materia,tengo,busco,status,created_at,operation_id')
    .eq('status', 'activa')
    .eq('materia', materia)
    .order('created_at', { ascending: true })
    .limit(5000)
  if (error) throw error
  const base = (data || []).map(r => ({ ...r, email: String(r.user_id) }))
  const byTengo = new Map<number, any[]>()
  for (const o of base) {
    if (!byTengo.has(Number(o.tengo))) byTengo.set(Number(o.tengo), [])
    byTengo.get(Number(o.tengo))!.push(o)
  }
  let best: any[] | null = null

  function dfs(start: any, current: any, seen: Set<string>, path: any[]) {
    if (path.length > MAX_CYCLE || best && path.length >= best.length) return
    const candidates = byTengo.get(Number(current.busco)) || []
    for (const next of candidates) {
      if (next.user_id === start.user_id) {
        if (path.length >= 2 && (!best || path.length > best.length)) best = [...path]
        continue
      }
      if (seen.has(next.user_id)) continue
      seen.add(next.user_id)
      dfs(start, next, seen, [...path, next])
      seen.delete(next.user_id)
    }
  }

  for (const start of base) {
    dfs(start, start, new Set([start.user_id]), [start])
  }
  return best
}

async function maybeMatch(admin: SupabaseClient, userId: string, materia: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const cycle = await findCycle(admin, materia)
    if (!cycle) return { matched: false }
    const ids = cycle.map(x => x.id)
    const { data, error } = await admin.rpc('finalize_exchange', { p_request_ids: ids, p_materia: materia })
    if (error) throw error
    if (data?.ok) return { matched: true, intercambioId: data.intercambioId, conversacionId: data.conversacionId }
  }
  const { data } = await admin.from('solicitudes').select('status,exchange_id').eq('user_id', userId).eq('materia', materia).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  if (data?.status === 'completada') return { matched: true, intercambioId: data.exchange_id }
  return { matched: false }
}

async function bootstrap(user: User, client: SupabaseClient, admin: SupabaseClient) {
  const rl = await rateLimit(admin, 'bootstrap', user.id)
  if (rl) return rl

  const [{ data: profile, error: profileError }, { data: solicitudes, error: reqError }, { data: exchanges, error: exError }] = await Promise.all([
    client.from('profiles').select('id,pseudonimo,foto_url,is_moderator,is_admin,profile_completed').eq('id', user.id).single(),
    client.from('solicitudes').select('id,materia,tengo,busco,status,created_at,updated_at,completed_at,exchange_id').eq('user_id', user.id).eq('status', 'activa').order('created_at', { ascending: false }),
    client.from('intercambio_participantes').select('intercambio_id,solicitud_id,user_id,tengo,busco,intercambios!inner(id,materia,created_at,completed_at)').eq('user_id', user.id),
  ])
  if (profileError) throw profileError
  if (reqError) throw reqError
  if (exError) throw exError

  const exchangeIds = [...new Set((exchanges || []).map((x: any) => String(x.intercambio_id)))]
  const { data: parts } = exchangeIds.length
    ? await client.from('intercambio_participantes').select('intercambio_id,user_id,tengo,busco').in('intercambio_id', exchangeIds)
    : { data: [] }
  const ids = (parts || []).map((p: any) => String(p.user_id))
  const pmap = await profileMap(client, ids)
  const conversations = exchangeIds.length
    ? (await client.from('conversaciones').select('id,intercambio_id').in('intercambio_id', exchangeIds)).data || []
    : []
  const convMap = new Map(conversations.map((c: any) => [String(c.intercambio_id), String(c.id)]))

  const exchangeMap = new Map<string, any>()
  for (const ex of exchanges || []) {
    const exId = String(ex.intercambio_id)
    if (!exchangeMap.has(exId)) {
      const raw = ex.intercambios
      exchangeMap.set(exId, {
        id: exId,
        materia: raw.materia,
        fecha: raw.completed_at || raw.created_at,
        conversacionId: convMap.get(exId) || null,
        participantes: [],
      })
    }
  }
  for (const p of parts || []) {
    const ex = exchangeMap.get(String(p.intercambio_id))
    if (!ex) continue
    const prof = pmap.get(String(p.user_id))
    ex.participantes.push({
      pseudonimo: prof?.pseudonimo || 'Estudiante',
      foto: prof?.foto_url || '',
      esVos: String(p.user_id) === user.id,
      tengo: Number(p.tengo),
      busco: Number(p.busco),
    })
  }

  return json({ ok: true, data: {
    perfil: { pseudonimo: profile.pseudonimo, foto: profile.foto_url || '', profileCompleted: profile.profile_completed !== false },
    solicitudes: solicitudes || [],
    intercambios: [...exchangeMap.values()],
    rol: { esModerador: !!profile.is_moderator, esAdmin: !!profile.is_admin },
  }})
}

async function foroBootstrap(user: User, client: SupabaseClient, admin: SupabaseClient, etiqueta: string) {
  const rl = await rateLimit(admin, 'foroBootstrap', user.id)
  if (rl) return rl
  const [tagsRes, threadsRes] = await Promise.all([
    client.from('hilos').select('etiquetas').order('created_at', { ascending: false }).limit(1000),
    getThreadPage(client, user.id, etiqueta, 0),
  ])
  if (tagsRes.error) throw tagsRes.error
  const rawTags: string[] = (tagsRes.data || []).flatMap((r: any): string[] =>
    Array.isArray(r.etiquetas)
      ? r.etiquetas.filter((tag: unknown): tag is string => typeof tag === 'string')
      : []
  )
  const tags: string[] = Array.from(new Set<string>(rawTags)).sort((a: string, b: string) => a.localeCompare(b, 'es'))
  return json({ ok: true, esModerador: await isModerator(admin, user.id), data: { etiquetas: tags, ...threadsRes } })
}

async function getThreadPage(client: SupabaseClient, userId: string, etiqueta: string, offset: number, busqueda = '') {
  const limit = 20
  let q = client.from('hilos').select('id,autor_id,es_anonimo,titulo,contenido,etiquetas,link,is_sensitive,created_at,respuestas', { count: 'exact' })
    .order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  if (etiqueta) q = q.contains('etiquetas', [etiqueta])
  const termino = String(busqueda || '').normalize('NFKC').replace(/[^\p{L}\p{N}\s_-]/gu, ' ').trim().replace(/\s+/g, ' ').slice(0, 80)
  if (termino) {
    const patron = `%${termino.replace(/[\\%_]/g, '\\$&')}%`
    q = q.or(`titulo.ilike.${patron},contenido.ilike.${patron}`)
  }
  const { data, error, count } = await q
  if (error) throw error
  const ids = (data || []).map((h: any) => String(h.id))
  const authorIds = (data || []).map((h: any) => String(h.autor_id))
  const [pmap, likesRes, mineRes] = await Promise.all([
    profileMap(client, authorIds),
    ids.length ? client.from('likes_hilos').select('hilo_id,user_id').in('hilo_id', ids) : Promise.resolve({ data: [] as any[], error: null }),
    ids.length ? client.from('likes_hilos').select('hilo_id').eq('user_id', userId).in('hilo_id', ids) : Promise.resolve({ data: [] as any[], error: null }),
  ])
  if (likesRes.error) throw likesRes.error
  if (mineRes.error) throw mineRes.error
  const counts = new Map<string, number>()
  for (const l of likesRes.data || []) counts.set(String(l.hilo_id), (counts.get(String(l.hilo_id)) || 0) + 1)
  const mine = new Set((mineRes.data || []).map((x: any) => String(x.hilo_id)))
  const hilos = (data || []).map((h: any) => {
    const p = pmap.get(String(h.autor_id))
    return {
      id: String(h.id),
      autor: h.es_anonimo ? 'Anónimo' : (p?.pseudonimo || 'Estudiante'),
      autorFoto: h.es_anonimo ? '' : (p?.foto_url || ''),
      titulo: h.titulo,
      resumen: String(h.contenido).length > 180 ? String(h.contenido).slice(0, 180) + '…' : String(h.contenido),
      etiquetas: h.etiquetas || [],
      link: h.link || '',
      isSensitive: !!h.is_sensitive,
      fecha: h.created_at,
      respuestas: Number(h.respuestas || 0),
      likes: Number(counts.get(String(h.id)) || 0),
      meGusta: mine.has(String(h.id)),
      esPropio: String(h.autor_id) === userId,
    }
  })
  return { hilos, hayMas: Number(count || 0) > offset + hilos.length }
}

async function obtenerChat(user: User, client: SupabaseClient, admin: SupabaseClient, conversacionId: string, cantidadCliente: number | null) {
  const rl = await rateLimit(admin, 'obtenerChat', user.id)
  if (rl) return rl
  if (!conversacionId) return json({ ok: false, error: 'chat_no_encontrado' })
  const { data: conv, error } = await client.from('conversaciones')
    .select('id,intercambio_id,materia,created_at,ultima_actividad,cantidad_mensajes')
    .eq('id', conversacionId).single()
  if (error || !conv) return json({ ok: false, error: 'chat_no_encontrado' })
  if (Date.now() - new Date(conv.ultima_actividad).getTime() > CHAT_DAYS * 86400000) return json({ ok: false, error: 'chat_expirado' })

  if (cantidadCliente !== null && Number(cantidadCliente) === Number(conv.cantidad_mensajes)) {
    return json({ ok: true, sinCambios: true, chat: { id: conv.id, ultimaActividad: conv.ultima_actividad, cantidadMensajes: conv.cantidad_mensajes } })
  }

  const [{ data: parts, error: partsError }, { data: messages, error: msgError }] = await Promise.all([
    client.from('conversacion_participantes').select('user_id').eq('conversacion_id', conversacionId),
    // Los 100 mensajes MÁS RECIENTES (antes se pedían los 100 más viejos y los nuevos dejaban de verse).
    client.from('mensajes').select('id,remitente_id,texto,created_at,operation_id').eq('conversacion_id', conversacionId).order('created_at', { ascending: false }).limit(100),
  ])
  if (partsError) throw partsError
  if (msgError) throw msgError
  messages?.reverse()
  const pmap = await profileMap(client, (parts || []).map((p: any) => String(p.user_id)))
  const participantes = (parts || []).map((p: any) => {
    const prof = pmap.get(String(p.user_id))
    return { pseudonimo: prof?.pseudonimo || 'Estudiante', foto: prof?.foto_url || '', esVos: String(p.user_id) === user.id }
  })
  const msgUserIds: string[] = Array.from(new Set<string>((messages || []).map((m: any) => String(m.remitente_id))))
  const msgProfiles = await profileMap(client, msgUserIds)
  const normalized = (messages || []).map((m: any) => {
    const prof = msgProfiles.get(String(m.remitente_id))
    return {
      id: String(m.id), pseudonimo: String(m.remitente_id) === user.id ? 'Vos' : (prof?.pseudonimo || 'Estudiante'),
      esVos: String(m.remitente_id) === user.id, texto: m.texto, fecha: m.created_at,
      operacionId: String(m.remitente_id) === user.id ? String(m.operation_id || '') : '',
    }
  })
  return json({ ok: true, chat: {
    id: conv.id, intercambioId: conv.intercambio_id, materia: conv.materia,
    ultimaActividad: conv.ultima_actividad, participantes, mensajes: normalized,
    cantidadMensajes: Number(conv.cantidad_mensajes || 0),
  }})
}

// ==================== JUEGOS: PUNTAJES Y RANKING ====================
// Misma fórmula y mismos multiplicadores que games/inmune-survivors/src/core/modos.js (calcularPuntaje).
// El cliente manda los componentes de la partida; el puntaje se recalcula acá y se descartan partidas imposibles.
const JUEGOS_RANKING = new Set(['inmune-survivors'])
const MODO_RANKING = /^(sandbox|nucleo-(6|7|7\.1|8|9|10|11|12|13-14))$/
const MULT_INFECCION: Record<string, number> = { ambulatorio: 0.75, internado: 1, inmunosuprimido: 1.5 }
const MULT_EVOLUCION: Record<string, number> = { no_curse: 0.75, estudiante: 1, infectologo: 1.5 }
const PARTIDA_MIN_SEGUNDOS = 20
const PARTIDA_MAX_SEGUNDOS = 4 * 3600
const PARTIDA_TOLERANCIA_S = 15 // reloj del cliente vs. servidor y latencia
const PARTIDA_VIGENCIA_MS = 24 * 3600 * 1000

// Entrada de partida firmada (HMAC con una clave derivada de la secret key; no se guarda nada en la base).
// iniciarPartida la entrega al empezar; guardarPuntaje la exige, controla que los segundos declarados no superen
// el tiempo real transcurrido desde el inicio y usa su id como clave de idempotencia (una entrada = una partida).
const encoder = new TextEncoder()
let claveFirmaPartida: Promise<CryptoKey> | null = null
function base64url(bytes: Uint8Array) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
async function firmaPartida(datos: string) {
  if (!claveFirmaPartida) claveFirmaPartida = crypto.subtle.importKey('raw', encoder.encode('medmar-partida-v1:' + SECRET_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', await claveFirmaPartida, encoder.encode(datos))))
}
function igualesSeguro(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
async function verificarEntradaPartida(token: unknown, userId: string, juego: string, modo: string) {
  const m = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(String(token || ''))
  if (!m) return null
  const esperada = await firmaPartida(`${m[1]}.${userId}.${juego}.${modo}.${m[2]}`)
  if (!igualesSeguro(esperada, m[3])) return null
  const inicio = Number(m[2])
  if (!Number.isFinite(inicio) || Date.now() - inicio > PARTIDA_VIGENCIA_MS || inicio > Date.now() + 60_000) return null
  return { id: m[1], inicio }
}

function enteroNoNegativo(value: unknown) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 0 && n <= 10_000_000 ? n : null
}

function validarPartida(body: any) {
  const juego = String(body?.juego || '')
  const modo = String(body?.modo || '')
  if (!JUEGOS_RANKING.has(juego) || !MODO_RANKING.test(modo)) return null
  const dificultadInfeccion = String(body?.dificultadInfeccion || '')
  const dificultadEvolucion = String(body?.dificultadEvolucion || '')
  if (!(dificultadInfeccion in MULT_INFECCION) || !(dificultadEvolucion in MULT_EVOLUCION)) return null
  const segundos = enteroNoNegativo(body?.segundos)
  const kills = enteroNoNegativo(body?.kills)
  const correctas = enteroNoNegativo(body?.correctas)
  const preguntas = enteroNoNegativo(body?.preguntas)
  const jefes = enteroNoNegativo(body?.jefes)
  if (segundos === null || kills === null || correctas === null || preguntas === null || jefes === null) return null
  // Plausibilidad (topes holgados: el arnés de simulación da ~0,8 eliminaciones por segundo): no hay partidas de menos
  // de 20 s, ni más de 6 eliminaciones por segundo, ni más preguntas que una cada ~10 s, ni más de un jefe cada ~25 s.
  if (segundos < PARTIDA_MIN_SEGUNDOS || segundos > PARTIDA_MAX_SEGUNDOS) return null
  if (kills > segundos * 6 + 40) return null
  if (preguntas > Math.floor(segundos / 10) + 5 || correctas > preguntas) return null
  if (jefes > Math.floor(segundos / 25) + 3) return null
  const puntaje = Math.floor((kills * 10 + segundos * 2 + correctas * 25) * MULT_INFECCION[dificultadInfeccion] * MULT_EVOLUCION[dificultadEvolucion])
  // Si el cliente dice otro puntaje, la partida no se corresponde con lo que se jugó (o se modificó).
  if (body?.puntaje !== undefined && Number(body.puntaje) !== puntaje) return null
  const version = String(body?.version || '').slice(0, 20)
  return { juego, modo, segundos, puntaje, detalle: { kills, correctas, preguntas, jefes, dificultadInfeccion, dificultadEvolucion, version } }
}

async function posicionEnRanking(client: SupabaseClient, userId: string, juego: string, modo: string) {
  const { data, error } = await client.rpc('ranking_juego', { p_juego: juego, p_modo: modo, p_limite: 1, p_usuario: userId, p_buscar: null })
  if (error) throw error
  const fila = (data || []).find((r: any) => String(r.user_id) === userId)
  const total = Number((data || [])[0]?.total || 0)
  return { posicion: fila ? Number(fila.posicion) : null, total }
}

async function iniciarPartida(user: User, body: any) {
  const juego = String(body?.juego || '')
  const modo = String(body?.modo || '')
  if (!JUEGOS_RANKING.has(juego) || !MODO_RANKING.test(modo)) return json({ ok: false, error: 'modo_invalido' })
  const id = crypto.randomUUID()
  const inicio = Date.now()
  const firma = await firmaPartida(`${id}.${user.id}.${juego}.${modo}.${inicio}`)
  return json({ ok: true, partida: `${id}.${inicio}.${firma}` })
}

async function guardarPuntaje(user: User, client: SupabaseClient, admin: SupabaseClient, body: any) {
  const partida = validarPartida(body)
  if (!partida) return json({ ok: false, error: 'partida_invalida' })
  const { juego, modo, segundos, puntaje, detalle } = partida
  const entrada = await verificarEntradaPartida(body?.partida, user.id, juego, modo)
  if (!entrada) return json({ ok: false, error: 'partida_sin_inicio' })
  // Reintento de la misma partida: misma respuesta, sin volver a sumar.
  const operationId = entrada.id
  const previa = await getIdempotent(admin, user.id, operationId)
  if (previa) return json(previa)
  if (segundos > (Date.now() - entrada.inicio) / 1000 + PARTIDA_TOLERANCIA_S) return json({ ok: false, error: 'partida_invalida' })
  let record = false
  let mejor = puntaje
  for (let intento = 0; intento < 2; intento++) {
    const { data: actual, error } = await admin.from('puntajes_juegos').select('puntaje,partidas')
      .eq('user_id', user.id).eq('juego', juego).eq('modo', modo).maybeSingle()
    if (error) throw error
    if (!actual) {
      const { error: errIns } = await admin.from('puntajes_juegos').insert({ user_id: user.id, juego, modo, puntaje, segundos, detalle })
      if (errIns) { if (pgCode(errIns) === '23505') continue; throw errIns }
      record = true
      break
    }
    const supera = puntaje > Number(actual.puntaje)
    const cambios: Record<string, unknown> = { partidas: Number(actual.partidas || 1) + 1 }
    if (supera) Object.assign(cambios, { puntaje, segundos, detalle, logrado_at: new Date().toISOString() })
    // Con récord, solo se escribe si sigue siendo mayor (dos envíos simultáneos no pisan el mejor puntaje).
    let consulta = admin.from('puntajes_juegos').update(cambios).eq('user_id', user.id).eq('juego', juego).eq('modo', modo)
    if (supera) consulta = consulta.lt('puntaje', puntaje)
    const { error: errUpd } = await consulta
    if (errUpd) throw errUpd
    record = supera
    mejor = Math.max(puntaje, Number(actual.puntaje))
    break
  }
  const { posicion, total } = await posicionEnRanking(client, user.id, juego, modo)
  const respuesta = { ok: true, puntaje, mejor, record, posicion, total, modo }
  await saveIdempotent(admin, user.id, 'guardarPuntaje', operationId, respuesta)
  return json(respuesta)
}

async function rankingJuego(user: User, client: SupabaseClient, body: any) {
  const juego = String(body?.juego || '')
  const modo = String(body?.modo || '')
  if (!JUEGOS_RANKING.has(juego) || !MODO_RANKING.test(modo)) return json({ ok: false, error: 'modo_invalido' })
  const limite = Math.min(50, Math.max(5, Number(body?.limite) || 20))
  // Búsqueda por pseudónimo: mismos caracteres que permite actualizarPseudonimo; % y _ quedan escapados.
  const buscarRaw = String(body?.buscar || '').trim().normalize('NFC').slice(0, 24)
  const buscar = /^[A-Za-zÀ-ÿ0-9 _.-]{2,24}$/.test(buscarRaw) ? buscarRaw.replace(/[\\%_]/g, (c) => '\\' + c) : null
  const { data, error } = await client.rpc('ranking_juego', { p_juego: juego, p_modo: modo, p_limite: limite, p_usuario: user.id, p_buscar: buscar })
  if (error) throw error
  const filas = (data || []).map((r: any) => ({
    posicion: Number(r.posicion), pseudonimo: r.pseudonimo || 'Estudiante', foto: r.foto_url || '',
    puntaje: Number(r.puntaje), segundos: Number(r.segundos), fecha: r.logrado_at, esPropio: String(r.user_id) === user.id,
    coincide: !!buscar && String(r.pseudonimo || '').toLowerCase().includes(buscarRaw.toLowerCase()),
  }))
  const total = Number((data || [])[0]?.total || 0)
  return json({
    ok: true, juego, modo, total,
    top: filas.filter((f: any) => f.posicion <= limite),
    propio: filas.find((f: any) => f.esPropio) || null,
    busqueda: buscar ? filas.filter((f: any) => f.coincide) : null,
  })
}

async function handle(req: Request, body: any) {
  const action = String(body?.accion || '')
  const authRequired = !['health', 'legacyLogin'].includes(action)
  const admin = adminClient()
  let user: User | null = null
  let client: SupabaseClient = admin
  if (authRequired) {
    const auth = await requireUser(req)
    if ('error' in auth) return auth.error
    user = auth.user
    client = auth.client
  }

  if (action === 'health') {
    // Consulta mínima a Postgres: el keep-alive semanal (GitHub Actions) llama acá para que el
    // proyecto del plan Free no se pause por inactividad.
    const { error } = await admin.from('rate_limit_buckets').select('bucket_key', { head: true }).limit(1)
    return json({ ok: !error, service: 'medmar-api', version: 'supabase-v2', db: error ? 'error' : 'ok' })
  }
  if (action === 'legacyLogin') return legacyLogin(admin, String(body?.email || ''), String(body?.password || ''))
  if (!user) return json({ ok: false, error: 'sesion_invalida' })

  switch (action) {
    case 'bootstrap': return bootstrap(user, client, admin)
    case 'foroBootstrap': return foroBootstrap(user, client, admin, String(body.etiqueta || '').trim().toLowerCase())
    case 'listarEtiquetas': {
      const rl = await rateLimit(admin, action, user.id); if (rl) return rl
      const { data, error } = await client.from('hilos').select('etiquetas').limit(1000)
      if (error) throw error
      const rawTags: string[] = (data || []).flatMap((r: any): string[] =>
        Array.isArray(r.etiquetas)
          ? r.etiquetas.filter((tag: unknown): tag is string => typeof tag === 'string')
          : []
      )
      const tags: string[] = Array.from(new Set<string>(rawTags)).sort((a: string, b: string) => a.localeCompare(b, 'es'))
      return json({ ok: true, etiquetas: tags })
    }
    case 'listarHilos': {
      const rl = await rateLimit(admin, action, user.id); if (rl) return rl
      return json({ ok: true, ...(await getThreadPage(client, user.id, String(body.etiqueta || '').trim().toLowerCase(), Math.max(0, Number(body.desde || 0)), String(body.busqueda || ''))) })
    }
    case 'verHilo': {
      const rl = await rateLimit(admin, action, user.id); if (rl) return rl
      const id = uuidOrEmpty(body.id)
      if (!id) return json({ ok: false, error: 'no_encontrado' })
      const { data: h, error } = await client.from('hilos').select('id,autor_id,es_anonimo,titulo,contenido,etiquetas,link,is_sensitive,created_at,respuestas').eq('id', id).single()
      if (error || !h) return json({ ok:false,error:'no_encontrado' })
      const { data: rs, error: re } = await client.from('respuestas').select('id,autor_id,es_anonimo,contenido,created_at,operation_id,parent_id').eq('hilo_id', id).order('created_at', { ascending: true }).limit(500)
      if (re) throw re
      const pmap = await profileMap(client, [String(h.autor_id), ...(rs || []).map((r:any)=>String(r.autor_id))])
      const [hLikes, rLikes, mineH, mineR] = await Promise.all([
        client.from('likes_hilos').select('user_id').eq('hilo_id', id),
        (rs || []).length ? client.from('likes_respuestas').select('respuesta_id,user_id').in('respuesta_id',(rs||[]).map((r:any)=>r.id)) : Promise.resolve({data:[],error:null}),
        client.from('likes_hilos').select('hilo_id').eq('hilo_id',id).eq('user_id',user.id).maybeSingle(),
        (rs || []).length ? client.from('likes_respuestas').select('respuesta_id').eq('user_id',user.id).in('respuesta_id',(rs||[]).map((r:any)=>r.id)) : Promise.resolve({data:[],error:null}),
      ])
      if (hLikes.error || rLikes.error || mineH.error || mineR.error) throw hLikes.error || rLikes.error || mineH.error || mineR.error
      const rCounts = new Map<string,number>(); for (const l of rLikes.data||[]) rCounts.set(String(l.respuesta_id),(rCounts.get(String(l.respuesta_id))||0)+1)
      const mineRs = new Set((mineR.data||[]).map((x:any)=>String(x.respuesta_id)))
      const autorProf = pmap.get(String(h.autor_id))
      const hilo = { id:String(h.id), autor:h.es_anonimo?'Anónimo':(autorProf?.pseudonimo||'Estudiante'), autorFoto:h.es_anonimo?'':(autorProf?.foto_url||''), titulo:h.titulo, contenido:h.contenido, etiquetas:h.etiquetas||[], link:h.link||'', isSensitive:!!h.is_sensitive, fecha:h.created_at, respuestas:Number(h.respuestas||0), likes:(hLikes.data||[]).length, meGusta:!!mineH.data, esPropio:String(h.autor_id)===user.id }
      const respuestas = (rs||[]).map((r:any)=>{ const p=pmap.get(String(r.autor_id)); return {id:String(r.id),parentId:r.parent_id?String(r.parent_id):null,autor:r.es_anonimo?'Anónimo':(p?.pseudonimo||'Estudiante'),autorFoto:r.es_anonimo?'':(p?.foto_url||''),contenido:r.contenido,fecha:r.created_at,likes:Number(rCounts.get(String(r.id))||0),meGusta:mineRs.has(String(r.id)),esPropio:String(r.autor_id)===user.id,operacionId:String(r.autor_id)===user.id?String(r.operation_id||''):''} })
      return json({ok:true,hilo,respuestas})
    }
    case 'crearHilo': {
      const rl = await rateLimit(admin, action, user.id); if (rl) return rl
      const titulo=String(body.titulo||'').trim(), contenido=String(body.contenido||'').trim(), operationId=String(body.operacionId||'')
      if (!validOperationId(operationId)) return json({ok:false,error:'datos_invalidos'})
      const cached=await getIdempotent(admin,user.id,operationId); if(cached) return json(cached)
      if(!titulo||titulo.length>MAX_TITLE||!contenido||contenido.length>MAX_CONTENT) return json({ok:false,error:titulo.length>MAX_TITLE?'titulo_invalido':'contenido_invalido'})
      const tags=cleanTags(body.etiquetas)
      const linksCheck=validateContentLinks(contenido)
      if(!linksCheck.ok) return json({ok:false,error:'enlace_no_permitido',url:linksCheck.invalid})
      const isSensitive=body.isSensitive===true || body.sensible==='1'
      const {data,error}=await admin.from('hilos').insert({autor_id:user.id,es_anonimo:false,titulo,contenido,etiquetas:tags,link:null,is_sensitive:isSensitive,operation_id:operationId}).select('id').single()
      if(error){
        if((error as any).code==='23505'){ const {data:existing}=await client.from('hilos').select('id').eq('operation_id',operationId).single(); if(existing) return json({ ok: true, id: String(existing.id), hilo: await getOrBuildThreadResponse(client,user.id,String(existing.id)) })}
        throw error
      }
      const response={ok:true,id:String(data.id),hilo:await getOrBuildThreadResponse(client,user.id,String(data.id))}
      await saveIdempotent(admin,user.id,action,operationId,response)
      return json(response)
    }
    case 'crearRespuesta': {
      const rl=await rateLimit(admin,action,user.id); if(rl)return rl
      const hiloId=uuidOrEmpty(body.hiloId), contenido=String(body.contenido||'').trim(), operationId=String(body.operacionId||'')
      const parentId=String(body.parentId||'').trim()
      if(!validOperationId(operationId)) return json({ok:false,error:'datos_invalidos'})
      const cached=await getIdempotent(admin,user.id,operationId); if(cached)return json(cached)
      if(!hiloId||!contenido||contenido.length>MAX_CONTENT)return json({ok:false,error:'contenido_invalido'})
      if(parentId&&!validOperationId(parentId))return json({ok:false,error:'respuesta_invalida'})
      const linksCheck=validateContentLinks(contenido)
      if(!linksCheck.ok) return json({ok:false,error:'enlace_no_permitido',url:linksCheck.invalid})
      const {data:thread}=await client.from('hilos').select('id').eq('id',hiloId).single(); if(!thread)return json({ok:false,error:'no_encontrado'})
      if(parentId){const {data:parent,error:parentError}=await client.from('respuestas').select('id').eq('id',parentId).eq('hilo_id',hiloId).maybeSingle();if(parentError)throw parentError;if(!parent)return json({ok:false,error:'respuesta_invalida'})}
      const {data,error}=await admin.from('respuestas').insert({hilo_id:hiloId,parent_id:parentId||null,autor_id:user.id,es_anonimo:false,contenido,operation_id:operationId}).select('id').single()
      if(error){ if((error as any).code==='23503')return json({ok:false,error:parentId?'respuesta_invalida':'no_encontrado'}); if((error as any).code==='23505'){const {data:existing}=await client.from('respuestas').select('id').eq('operation_id',operationId).single(); if(existing)return json(await getOrBuildResponseResponse(client,user.id,String(existing.id)))} throw error }
      const response=await getOrBuildResponseResponse(client,user.id,String(data.id),true); await saveIdempotent(admin,user.id,action,operationId,response); return json(response)
    }
    case 'guardar': {
      const rl=await rateLimit(admin,action,user.id); if(rl)return rl
      const operationId=String(body.operacionId||''); if(!validOperationId(operationId)) return json({ok:false,error:'datos_invalidos'})
      const cached=await getIdempotent(admin,user.id,operationId); if(cached)return json(cached)
      const materia=String(body.materia||'').trim(), tengo=Number(body.tengo||0), busco=Number(body.busco||0)
      if(!validMateria(materia)||!Number.isInteger(tengo)||!Number.isInteger(busco)||tengo<1||tengo>40||busco<1||busco>40||tengo===busco)return json({ok:false,error:tengo===busco?'misma_comision':'datos_invalidos'})
      const {data:duplicate}=await client.from('solicitudes').select('id').eq('user_id',user.id).eq('status','activa').eq('materia',materia).limit(1)
      if((duplicate||[]).length)return json({ok:false,error:'ya_tenes_otra'})
      const {data,error}=await admin.from('solicitudes').insert({user_id:user.id,materia,tengo,busco,status:'activa',operation_id:operationId}).select('id').single()
      if(error){
        if(pgCode(error)==='23505'){
          const {data:existing}=await client.from('solicitudes').select('id,status,exchange_id').eq('user_id',user.id).eq('operation_id',operationId).maybeSingle()
          if(existing){const response={ok:true,id:String(existing.id),emparejado:existing.status==='completada',intercambioId:existing.exchange_id};await saveIdempotent(admin,user.id,action,operationId,response);return json(response)}
          // Choque con el índice único (usuario, materia) de solicitudes activas: carrera entre dos pestañas.
          return json({ok:false,error:'ya_tenes_otra'})
        }
        throw error
      }
      const match=await maybeMatch(admin,user.id,materia)
      const response={ok:true,id:String(data.id),emparejado:!!match.matched,intercambioId:match.intercambioId||null,conversacionId:match.conversacionId||null}
      await saveIdempotent(admin,user.id,action,operationId,response)
      return json(response)
    }
    case 'editar': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const id=uuidOrEmpty(body.id), materia=String(body.materia||'').trim(),tengo=Number(body.tengo||0),busco=Number(body.busco||0)
      if(!id||!validMateria(materia)||!Number.isInteger(tengo)||!Number.isInteger(busco)||tengo<1||tengo>40||busco<1||busco>40||tengo===busco)return json({ok:false,error:tengo===busco?'misma_comision':'datos_invalidos'})
      const {data,error}=await admin.from('solicitudes').update({materia,tengo,busco}).eq('id',id).eq('user_id',user.id).eq('status','activa').select('id').maybeSingle()
      if(error&&pgCode(error)==='23505')return json({ok:false,error:'ya_tenes_otra'})
      if(error)throw error
      if(!data)return json({ok:false,error:'no_encontrado'})
      const match=await maybeMatch(admin,user.id,materia)
      return json({ok:true,emparejado:!!match.matched,intercambioId:match.intercambioId||null,conversacionId:match.conversacionId||null})
    }
    case 'borrar': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const id=uuidOrEmpty(body.id); if(!id)return json({ok:false,error:'no_encontrado'})
      const {data,error}=await admin.from('solicitudes').update({status:'cancelada',updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).eq('status','activa').select('id').maybeSingle()
      if(error)throw error
      if(!data)return json({ok:false,error:'no_encontrado'})
      return json({ok:true})
    }
    case 'borrarHilo': {
      const rl = await rateLimit(admin, action, user.id); if (rl) return rl
      const id = uuidOrEmpty(body.id)
      if (!id) return json({ ok: false, error: 'datos_invalidos' })

      const { data: hilo, error: hiloError } = await admin
        .from('hilos')
        .select('id,autor_id')
        .eq('id', id)
        .maybeSingle()
      if (hiloError) throw hiloError
      if (!hilo) return json({ ok: false, error: 'no_encontrado' })

      const puedeBorrar = String(hilo.autor_id) === user.id || await isModerator(admin, user.id)
      if (!puedeBorrar) return json({ ok: false, error: 'no_autorizado' })

      await borrarPublicacion(admin, 'hilo', id)
      return json({ ok: true })
    }
    case 'borrarRespuesta': {
      const rl = await rateLimit(admin, action, user.id); if (rl) return rl
      const id = uuidOrEmpty(body.id)
      if (!id) return json({ ok: false, error: 'datos_invalidos' })

      const { data: respuesta, error: respuestaError } = await admin
        .from('respuestas')
        .select('id,autor_id')
        .eq('id', id)
        .maybeSingle()
      if (respuestaError) throw respuestaError
      if (!respuesta) return json({ ok: false, error: 'no_encontrado' })

      const puedeBorrar = String(respuesta.autor_id) === user.id || await isModerator(admin, user.id)
      if (!puedeBorrar) return json({ ok: false, error: 'no_autorizado' })

      await borrarPublicacion(admin, 'respuesta', id)
      return json({ ok: true })
    }
    case 'misSolicitudes': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const {data,error}=await client.from('solicitudes').select('id,materia,tengo,busco,status,created_at,updated_at').eq('user_id',user.id).eq('status','activa').order('created_at',{ascending:false}); if(error)throw error; return json({ok:true,solicitudes:data||[]})
    }
    case 'misIntercambios': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const {data,error}=await client.from('intercambio_participantes').select('intercambio_id,user_id,tengo,busco,intercambios!inner(id,materia,created_at,completed_at)').eq('user_id',user.id).order('intercambio_id',{ascending:false}); if(error)throw error
      const ids=[...new Set((data||[]).map((x:any)=>String(x.intercambio_id)))]; const {data:parts}=ids.length?await client.from('intercambio_participantes').select('intercambio_id,user_id,tengo,busco').in('intercambio_id',ids):{data:[]}; const pmap=await profileMap(client,(parts||[]).map((x:any)=>String(x.user_id))); const convs=ids.length?(await client.from('conversaciones').select('id,intercambio_id').in('intercambio_id',ids)).data||[]:[];const cm=new Map(convs.map((x:any)=>[String(x.intercambio_id),String(x.id)]));const map=new Map<string,any>();for(const ex of data||[]){const id=String(ex.intercambio_id);if(!map.has(id))map.set(id,{id,materia:ex.intercambios.materia,fecha:ex.intercambios.completed_at||ex.intercambios.created_at,conversacionId:cm.get(id)||null,participantes:[]})}for(const p of parts||[]){const ex=map.get(String(p.intercambio_id));if(!ex)continue;const prof=pmap.get(String(p.user_id));ex.participantes.push({pseudonimo:prof?.pseudonimo||'Estudiante',foto:prof?.foto_url||'',esVos:String(p.user_id)===user.id,tengo:Number(p.tengo),busco:Number(p.busco)})}return json({ok:true,intercambios:[...map.values()]})
    }
    case 'obtenerChat': return obtenerChat(user,client,admin,uuidOrEmpty(body.conversacionId),body.cantidadMensajes===''||body.cantidadMensajes===undefined?null:Number(body.cantidadMensajes))
    case 'enviarMensaje': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const conversacionId=uuidOrEmpty(body.conversacionId),texto=String(body.texto||'').trim(),operationId=String(body.operacionId||''); if(!conversacionId||!texto||texto.length>MAX_MESSAGE||!validOperationId(operationId))return json({ok:false,error:'mensaje_invalido'})
      const cached=await getIdempotent(admin,user.id,operationId);if(cached)return json(cached)
      const {data:conv,error:convErr}=await client.from('conversaciones').select('id,cantidad_mensajes,ultima_actividad').eq('id',conversacionId).single();if(convErr||!conv)return json({ok:false,error:'chat_no_encontrado'});if(Date.now()-new Date(conv.ultima_actividad).getTime()>CHAT_DAYS*86400000)return json({ok:false,error:'chat_expirado'});if(Number(conv.cantidad_mensajes)>=MAX_CHAT_MESSAGES)return json({ok:false,error:'chat_lleno'})
      const {data,error}=await admin.from('mensajes').insert({conversacion_id:conversacionId,remitente_id:user.id,texto,operation_id:operationId}).select('id,created_at').single();if(error){if((error as any).code==='23505'){const {data:existing}=await client.from('mensajes').select('id,created_at,texto').eq('operation_id',operationId).single();if(existing)return json({ok:true,repetido:true,cantidadMensajes:Number(conv.cantidad_mensajes),mensaje:{id:String(existing.id),pseudonimo:'Vos',esVos:true,texto:existing.texto,fecha:existing.created_at,operacionId:operationId}})}throw error}
      const response={ok:true,cantidadMensajes:Number(conv.cantidad_mensajes)+1,mensaje:{id:String(data.id),pseudonimo:'Vos',esVos:true,texto,fecha:data.created_at,operacionId:operationId}};await saveIdempotent(admin,user.id,action,operationId,response);return json(response)
    }
    case 'completarPerfil': {
      const rl=await rateLimit(admin,action,user.id); if(rl)return rl
      const pseudonimo=String(body.pseudonimo||'').trim().normalize('NFC')
      const foto=String(body.foto||'').trim()
      if(!/^[A-Za-zÀ-ÿ0-9 _.-]{3,24}$/.test(pseudonimo)) return json({ok:false,error:'pseudonimo_invalido'})
      const presetAllowed = /^https:\/\/medmar\.com\.ar\/assets\/avatars\/[a-z0-9_-]+\.svg$/i.test(foto)
      const existingPhoto = !foto || presetAllowed || (foto.startsWith(`${SUPABASE_URL}/storage/v1/object/public/profile-photos/`) && foto.includes(`/${user.id}/`))
      if(!existingPhoto) return json({ok:false,error:'foto_invalida'})
      const {data:duplicates,error:dupError}=await admin.from('profiles').select('id').ilike('pseudonimo',pseudonimo).neq('id',user.id).limit(1)
      if(dupError) throw dupError
      if((duplicates||[]).length) return json({ok:false,error:'pseudonimo_en_uso'})
      const {data,error}=await admin.from('profiles').update({pseudonimo,foto_url:foto||null,profile_completed:true}).eq('id',user.id).select('pseudonimo,foto_url,profile_completed').single()
      if(error){ if((error as any).code==='23505') return json({ok:false,error:'pseudonimo_en_uso'}); throw error }
      const prefijoFotos=`${SUPABASE_URL}/storage/v1/object/public/profile-photos/`
      await borrarFotosAnteriores(admin,user.id,foto.startsWith(prefijoFotos)?foto.slice(prefijoFotos.length).split('?')[0]:'')
      return json({ok:true,perfil:{pseudonimo:data.pseudonimo,foto:data.foto_url||'',profileCompleted:true}})
    }
    case 'resolverImagen': {
      const rl=await rateLimit(admin,action,user.id); if(rl)return rl
      const url=safeLink(body.url)
      if(!url) return json({ok:false,error:'enlace_no_permitido'})
      try { const imagen=await resolveExternalImage(url); return json({ok:true,imagen:imagen||null}) }
      catch(err) { console.warn('image_preview_unavailable',String(err)); return json({ok:true,imagen:null}) }
    }
    case 'miPerfil': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const {data,error}=await client.from('profiles').select('id,pseudonimo,foto_url').eq('id',user.id).single();if(error)throw error;return json({ok:true,perfil:{pseudonimo:data.pseudonimo,foto:data.foto_url||''}})
    }
    case 'actualizarPseudonimo': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const pseudonimo=String(body.pseudonimo||'').trim().normalize('NFC');if(!/^[A-Za-zÀ-ÿ0-9 _.-]{3,24}$/.test(pseudonimo))return json({ok:false,error:'pseudonimo_invalido'});const {data,error}=await admin.from('profiles').update({pseudonimo}).eq('id',user.id).select('pseudonimo').single();if(error){if((error as any).code==='23505')return json({ok:false,error:'pseudonimo_en_uso'});throw error}return json({ok:true,pseudonimo:data.pseudonimo})
    }
    case 'actualizarFoto': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      // El cliente ya recorta y comprime a 256x256 JPEG; acá se valida igual (tamaño y firma real del archivo)
      // porque la API es la única puerta de escritura al bucket.
      const raw=String(body.imagen||'')
      if(!raw||raw.length>Math.ceil(MAX_PHOTO_BYTES*4/3)+4)return json({ok:false,error:'imagen_muy_grande'})
      let bytes:Uint8Array
      try { bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0)) } catch { return json({ok:false,error:'imagen_invalida'}) }
      const isJpeg=bytes.length>3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff
      if(!isJpeg)return json({ok:false,error:'imagen_invalida'})
      const path=`${user.id}/${crypto.randomUUID()}.jpg`
      const {error}=await admin.storage.from('profile-photos').upload(path,bytes,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});if(error)throw error
      const url=`${SUPABASE_URL}/storage/v1/object/public/profile-photos/${path}`
      const {error:pe}=await admin.from('profiles').update({foto_url:url}).eq('id',user.id);if(pe)throw pe
      await borrarFotosAnteriores(admin,user.id,path)
      return json({ok:true,foto:url})
    }
    case 'toggleLike': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const tipo=String(body.tipo||'').toLowerCase(),id=uuidOrEmpty(body.id);if(!['hilo','respuesta'].includes(tipo)||!id)return json({ok:false,error:'datos_invalidos'})
      const table=tipo==='hilo'?'likes_hilos':'likes_respuestas';const key=tipo==='hilo'?'hilo_id':'respuesta_id'
      const {data:existing}=await client.from(table).select(key).eq(key,id).eq('user_id',user.id).maybeSingle()
      let liked=false
      if(existing){const {error}=await admin.from(table).delete().eq(key,id).eq('user_id',user.id);if(error)throw error}
      else{
        const {error}=await admin.from(table).insert({[key]:id,user_id:user.id})
        // 23505: doble clic / otra pestaña ya dio like. 23503: la publicación ya no existe.
        if(error&&pgCode(error)==='23503')return json({ok:false,error:'no_encontrado'})
        if(error&&pgCode(error)!=='23505')throw error
        liked=true
      }
      const {count,error}=await client.from(table).select(key,{count:'exact',head:true}).eq(key,id);if(error)throw error
      return json({ok:true,liked,likes:Number(count||0)})
    }
    case 'denunciar': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const tipo=String(body.tipo||''),id=uuidOrEmpty(body.id),motivo=String(body.motivo||'').trim().slice(0,300)
      if(!['hilo','respuesta'].includes(tipo)||!id)return json({ok:false,error:'datos_invalidos'})
      const {data:pub,error:pubError}=await admin.from(tipo==='hilo'?'hilos':'respuestas').select('id').eq('id',id).maybeSingle()
      if(pubError)throw pubError
      if(!pub)return json({ok:false,error:'no_encontrado'})
      // Una sola denuncia pendiente por persona y publicación: evita inflar la cola de moderación.
      const {data:previa}=await admin.from('denuncias').select('id').eq('id_publicacion',id).eq('denunciante_id',user.id).eq('estado','pendiente').limit(1)
      if((previa||[]).length)return json({ok:true,repetida:true})
      const {error}=await admin.from('denuncias').insert({tipo,id_publicacion:id,denunciante_id:user.id,motivo});if(error)throw error
      return json({ok:true})
    }
    case 'iniciarPartida': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return iniciarPartida(user,body)
    }
    case 'guardarPuntaje': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return guardarPuntaje(user,client,admin,body)
    }
    case 'rankingJuego': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return rankingJuego(user,client,body)
    }
    case 'soyModerador': { const rl=await rateLimit(admin,action,user.id);if(rl)return rl; return json({ok:true,esModerador:await isModerator(admin,user.id),esAdmin:await isAdmin(admin,user.id)}) }
    case 'listarModeradores': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl;if(!(await isAdmin(admin,user.id)))return json({ok:false,error:'no_autorizado'});const {data:mods,error}=await admin.from('profiles').select('id,pseudonimo,is_moderator').eq('is_moderator',true).order('pseudonimo');if(error)throw error;const users=[];for(const m of mods||[]){const u=await admin.auth.admin.getUserById(String(m.id));users.push({email:u.data.user?.email||'',pseudonimo:m.pseudonimo})}return json({ok:true,moderadores:users})
    }
    case 'asignarModerador': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl;if(!(await isAdmin(admin,user.id)))return json({ok:false,error:'no_autorizado'});const email=String(body.email||'').trim().toLowerCase();const u=await findUserByEmail(admin,email);if(!u)return json({ok:false,error:'no_encontrado'});const {data,error}=await admin.from('profiles').update({is_moderator:true}).eq('id',u.id).select('id').single();if(error)throw error;return json({ok:true})
    }
    case 'quitarModerador': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl;if(!(await isAdmin(admin,user.id)))return json({ok:false,error:'no_autorizado'});const email=String(body.email||'').trim().toLowerCase();const u=await findUserByEmail(admin,email);if(!u)return json({ok:false,error:'no_encontrado'});if(String(u.email).toLowerCase()==='medmarunmdp@gmail.com')return json({ok:false,error:'no_autorizado'});const {error}=await admin.from('profiles').update({is_moderator:false}).eq('id',u.id);if(error)throw error;return json({ok:true})
    }
    case 'listarDenuncias': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      if(!(await isModerator(admin,user.id)))return json({ok:false,error:'no_autorizado'})
      const {data,error}=await client.from('denuncias').select('id,tipo,id_publicacion,motivo,created_at').eq('estado','pendiente').order('created_at',{ascending:true}).limit(100)
      if(error)throw error
      return json({ok:true,denuncias:await enriquecerDenuncias(admin,data||[])})
    }
    case 'resolverDenuncia': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      if(!(await isModerator(admin,user.id)))return json({ok:false,error:'no_autorizado'})
      const id=uuidOrEmpty(body.id),accion=String(body.accion||'')
      if(!id||!['descartar','eliminar'].includes(accion))return json({ok:false,error:'datos_invalidos'})
      const {data:rep,error:repError}=await admin.from('denuncias').select('id,tipo,id_publicacion,estado').eq('id',id).maybeSingle()
      if(repError)throw repError
      if(!rep)return json({ok:false,error:'no_encontrado'})
      const resolucion={resuelto_por:user.id,fecha_resolucion:new Date().toISOString()}
      if(accion==='eliminar'){
        // Se marcan como resueltas todas las denuncias pendientes de esa publicación y después se la borra.
        const {error:upError}=await admin.from('denuncias').update({estado:'eliminada',...resolucion}).eq('id_publicacion',rep.id_publicacion).eq('estado','pendiente')
        if(upError)throw upError
        await borrarPublicacion(admin,rep.tipo==='hilo'?'hilo':'respuesta',String(rep.id_publicacion),false)
      } else {
        const {error}=await admin.from('denuncias').update({estado:'descartada',...resolucion}).eq('id',id);if(error)throw error
      }
      return json({ok:true})
    }
    default: return json({ok:false,error:'accion_invalida'})
  }
}

async function getOrBuildThreadResponse(client: SupabaseClient, userId: string, threadId: string) {
  const {data,error}=await client.from('hilos').select('id,autor_id,es_anonimo,titulo,contenido,etiquetas,link,is_sensitive,created_at,respuestas').eq('id',threadId).single();if(error||!data)throw error||new Error('thread not found');const prof=await profileMap(client,[String(data.autor_id)]);const p=prof.get(String(data.autor_id));return {id:String(data.id),autor:data.es_anonimo?'Anónimo':(p?.pseudonimo||'Estudiante'),autorFoto:data.es_anonimo?'':(p?.foto_url||''),titulo:data.titulo,contenido:data.contenido,etiquetas:data.etiquetas||[],link:data.link||'',isSensitive:!!data.is_sensitive,fecha:data.created_at,respuestas:Number(data.respuestas||0),likes:0,meGusta:false,esPropio:String(data.autor_id)===userId}
}

async function getOrBuildResponseResponse(client: SupabaseClient,userId:string,responseId:string,newlyInserted=false){const {data,error}=await client.from('respuestas').select('id,autor_id,es_anonimo,contenido,created_at,operation_id,parent_id').eq('id',responseId).single();if(error||!data)throw error||new Error('response not found');const prof=await profileMap(client,[String(data.autor_id)]);const p=prof.get(String(data.autor_id));return {ok:true,id:String(data.id),respuesta:{id:String(data.id),parentId:data.parent_id?String(data.parent_id):null,autor:data.es_anonimo?'Anónimo':(p?.pseudonimo||'Estudiante'),autorFoto:data.es_anonimo?'':(p?.foto_url||''),esPropio:String(data.autor_id)===userId,contenido:data.contenido,fecha:data.created_at,likes:0,meGusta:false,operacionId:String(data.operation_id||'')}}
}

// Borra un hilo o una respuesta. Las respuestas hijas caen por FK `on delete cascade`; como `denuncias`
// no tiene FK hacia publicaciones, primero se limpian las denuncias de todo lo que se va a borrar.
async function borrarPublicacion(admin: SupabaseClient, tipo: 'hilo' | 'respuesta', id: string, borrarDenuncias = true) {
  if (borrarDenuncias) {
    let ids: string[] = [id]
    if (tipo === 'hilo') {
      const { data, error } = await admin.from('respuestas').select('id').eq('hilo_id', id)
      if (error) throw error
      ids = ids.concat((data || []).map((r: any) => String(r.id)))
    } else {
      const { data: actual, error: e1 } = await admin.from('respuestas').select('hilo_id').eq('id', id).maybeSingle()
      if (e1) throw e1
      if (actual) {
        const { data: todas, error: e2 } = await admin.from('respuestas').select('id,parent_id').eq('hilo_id', actual.hilo_id)
        if (e2) throw e2
        const hijos = new Map<string, string[]>()
        for (const r of todas || []) {
          if (!r.parent_id) continue
          const p = String(r.parent_id)
          if (!hijos.has(p)) hijos.set(p, [])
          hijos.get(p)!.push(String(r.id))
        }
        for (let i = 0; i < ids.length; i++) ids.push(...(hijos.get(ids[i]) || []))
      }
    }
    const { error } = await admin.from('denuncias').delete().in('id_publicacion', ids)
    if (error) throw error
  }
  const { error } = await admin.from(tipo === 'hilo' ? 'hilos' : 'respuestas').delete().eq('id', id)
  if (error) throw error
}

// Mantiene una sola foto por usuario en el bucket (ahorra storage del plan Free).
async function borrarFotosAnteriores(admin: SupabaseClient, userId: string, conservar: string) {
  try {
    const { data, error } = await admin.storage.from('profile-photos').list(userId, { limit: 100 })
    if (error) throw error
    const viejas = (data || []).map(o => `${userId}/${o.name}`).filter(p => p !== conservar)
    if (viejas.length) await admin.storage.from('profile-photos').remove(viejas)
  } catch (err) {
    console.warn('old_photos_cleanup_failed', String(err))
  }
}

// El panel de moderación necesita ver qué se denunció (título/contenido/autor) además de la denuncia.
async function enriquecerDenuncias(admin: SupabaseClient, denuncias: any[]) {
  const idsHilos = denuncias.filter(d => d.tipo === 'hilo').map(d => String(d.id_publicacion))
  const idsResp = denuncias.filter(d => d.tipo === 'respuesta').map(d => String(d.id_publicacion))
  const [hilos, resps] = await Promise.all([
    idsHilos.length ? admin.from('hilos').select('id,titulo,contenido,autor_id').in('id', idsHilos) : Promise.resolve({ data: [], error: null }),
    idsResp.length ? admin.from('respuestas').select('id,contenido,autor_id').in('id', idsResp) : Promise.resolve({ data: [], error: null }),
  ])
  if (hilos.error) throw hilos.error
  if (resps.error) throw resps.error
  const pubs = new Map<string, any>()
  for (const h of hilos.data || []) pubs.set(String(h.id), h)
  for (const r of resps.data || []) pubs.set(String(r.id), r)
  const autores = await profileMap(admin, [...pubs.values()].map(p => String(p.autor_id)))
  return denuncias.map(d => {
    const p = pubs.get(String(d.id_publicacion))
    return {
      id: String(d.id),
      tipo: d.tipo,
      motivo: d.motivo || '',
      fecha: d.created_at,
      publicacion: p
        ? { existe: true, titulo: p.titulo || '', contenido: String(p.contenido || '').slice(0, 1000), autorReal: autores.get(String(p.autor_id))?.pseudonimo || 'Estudiante' }
        : { existe: false, titulo: '', contenido: '', autorReal: '' },
    }
  })
}

async function findUserByEmail(admin: SupabaseClient,email:string){for(let page=1;page<=10;page++){const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});if(error)throw error;const u=(data.users||[]).find((x:any)=>String(x.email||'').toLowerCase()===email);if(u)return u;if(!data.users?.length||data.users.length<1000)break}return null}

async function serve(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok')
  if (req.method !== 'POST') return json({ ok: false, error: 'metodo_no_permitido' }, 405)
  if (Number(req.headers.get('content-length') || 0) > MAX_BODY_BYTES) return json({ ok: false, error: 'imagen_muy_grande' }, 413)
  try {
    const body = await req.json().catch(() => ({}))
    return await handle(req, body)
  } catch (err) {
    // El detalle queda solo en los logs: no se devuelven mensajes internos de Postgres al cliente.
    console.error(err)
    // Deliberadamente respondemos 200 con un estado de error: para mutaciones,
    // un HTTP 500 no permite al cliente saber si la operación ya llegó a Postgres.
    // La operación debe permanecer en estado incierto y poder reconciliarse por ID.
    return json({ ok: false, error: 'servidor', ambiguo: true }, 200)
  }
}

Deno.serve(async (req) => {
  const res = await serve(req)
  for (const [k, v] of Object.entries(corsHeadersFor(req))) res.headers.set(k, v)
  return res
})

