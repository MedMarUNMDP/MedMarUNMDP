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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
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
  if (error) return null
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
  const text = String(raw || '')
  return [...new Set(text.split(',').map(x => x.trim()).filter(Boolean))]
    .slice(0, MAX_TAGS)
    .map(x => x.slice(0, MAX_TAG_LENGTH))
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
    client.from('mensajes').select('id,remitente_id,texto,created_at,operation_id').eq('conversacion_id', conversacionId).order('created_at', { ascending: true }).limit(100),
  ])
  if (partsError) throw partsError
  if (msgError) throw msgError
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

  if (action === 'health') return json({ ok: true, service: 'medmar-api', version: 'supabase-v1' })
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
      const id = String(body.id || '')
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
      const hiloId=String(body.hiloId||''), contenido=String(body.contenido||'').trim(), operationId=String(body.operacionId||'')
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
      if(!materia||tengo<1||tengo>40||busco<1||busco>40||tengo===busco)return json({ok:false,error:tengo===busco?'misma_comision':'datos_invalidos'})
      const {data:duplicate}=await client.from('solicitudes').select('id').eq('user_id',user.id).eq('status','activa').eq('materia',materia).limit(1)
      if((duplicate||[]).length)return json({ok:false,error:'ya_tenes_otra'})
      const {data,error}=await admin.from('solicitudes').insert({user_id:user.id,materia,tengo,busco,status:'activa',operation_id:operationId}).select('id').single()
      if(error){if((error as any).code==='23505'){const {data:existing}=await client.from('solicitudes').select('id,status,exchange_id').eq('user_id',user.id).eq('operation_id',operationId).single(); if(existing){const response={ok:true,id:String(existing.id),emparejado:existing.status==='completada',intercambioId:existing.exchange_id};await saveIdempotent(admin,user.id,action,operationId,response);return json(response)}}throw error}
      const match=await maybeMatch(admin,user.id,materia)
      const response={ok:true,id:String(data.id),emparejado:!!match.matched,intercambioId:match.intercambioId||null,conversacionId:match.conversacionId||null}
      await saveIdempotent(admin,user.id,action,operationId,response)
      return json(response)
    }
    case 'editar': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const id=String(body.id||''), materia=String(body.materia||'').trim(),tengo=Number(body.tengo||0),busco=Number(body.busco||0)
      if(!id||!materia||tengo<1||tengo>40||busco<1||busco>40||tengo===busco)return json({ok:false,error:tengo===busco?'misma_comision':'datos_invalidos'})
      const {data,error}=await admin.from('solicitudes').update({materia,tengo,busco}).eq('id',id).eq('user_id',user.id).eq('status','activa').select('id').single()
      if(error||!data)return json({ok:false,error:'no_encontrado'})
      const match=await maybeMatch(admin,user.id,materia)
      return json({ok:true,emparejado:!!match.matched,intercambioId:match.intercambioId||null,conversacionId:match.conversacionId||null})
    }
    case 'borrar': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const id=String(body.id||''); const {data,error}=await admin.from('solicitudes').update({status:'cancelada',updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).eq('status','activa').select('id').single(); if(error||!data)return json({ok:false,error:'no_encontrado'}); return json({ok:true})
    }
    case 'borrarHilo': {
      const rl = await rateLimit(admin, action, user.id); if (rl) return rl
      const id = String(body.id || '')
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

      // Denuncias no tienen FK hacia publicaciones, así que limpiamos las
      // denuncias asociadas antes de borrar el hilo y sus respuestas en cascada.
      const { data: respuestas, error: respuestasError } = await admin
        .from('respuestas')
        .select('id')
        .eq('hilo_id', id)
      if (respuestasError) throw respuestasError

      const idsDenuncia = [id, ...(respuestas || []).map((r:any) => String(r.id))]
      const { error: denunciasError } = await admin
        .from('denuncias')
        .delete()
        .in('id_publicacion', idsDenuncia)
      if (denunciasError) throw denunciasError

      const { error } = await admin.from('hilos').delete().eq('id', id)
      if (error) throw error
      return json({ ok: true })
    }
    case 'borrarRespuesta': {
      const rl = await rateLimit(admin, action, user.id); if (rl) return rl
      const id = String(body.id || '')
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

      const { error: denunciasError } = await admin
        .from('denuncias')
        .delete()
        .eq('id_publicacion', id)
      if (denunciasError) throw denunciasError

      const { error } = await admin.from('respuestas').delete().eq('id', id)
      if (error) throw error
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
    case 'obtenerChat': return obtenerChat(user,client,admin,String(body.conversacionId||''),body.cantidadMensajes===''||body.cantidadMensajes===undefined?null:Number(body.cantidadMensajes))
    case 'enviarMensaje': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const conversacionId=String(body.conversacionId||''),texto=String(body.texto||'').trim(),operationId=String(body.operacionId||''); if(!conversacionId||!texto||texto.length>MAX_MESSAGE||!validOperationId(operationId))return json({ok:false,error:'mensaje_invalido'})
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
      const pseudonimo=String(body.pseudonimo||'').trim();if(!/^[A-Za-zÀ-ÿ0-9 _.-]{3,24}$/.test(pseudonimo))return json({ok:false,error:'pseudonimo_invalido'});const {data,error}=await admin.from('profiles').update({pseudonimo}).eq('id',user.id).select('pseudonimo').single();if(error){if((error as any).code==='23505')return json({ok:false,error:'pseudonimo_en_uso'});throw error}return json({ok:true,pseudonimo:data.pseudonimo})
    }
    case 'actualizarFoto': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const raw=String(body.imagen||'');if(!raw||raw.length>3_000_000)return json({ok:false,error:'imagen_muy_grande'});const bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));const path=`${user.id}/${crypto.randomUUID()}.jpg`;const {error}=await admin.storage.from('profile-photos').upload(path,bytes,{contentType:'image/jpeg',cacheControl:'86400',upsert:false});if(error)throw error;const url=`${SUPABASE_URL}/storage/v1/object/public/profile-photos/${path}`;const {error:pe}=await admin.from('profiles').update({foto_url:url}).eq('id',user.id);if(pe)throw pe;return json({ok:true,foto:url})
    }
    case 'toggleLike': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const tipo=String(body.tipo||'').toLowerCase(),id=String(body.id||'');if(!['hilo','respuesta'].includes(tipo)||!id)return json({ok:false,error:'datos_invalidos'})
      const table=tipo==='hilo'?'likes_hilos':'likes_respuestas';const key=tipo==='hilo'?'hilo_id':'respuesta_id';const {data:existing}=await client.from(table).select('*').eq(key,id).eq('user_id',user.id).maybeSingle();let liked=false;if(existing){const {error}=await admin.from(table).delete().eq(key,id).eq('user_id',user.id);if(error)throw error}else{const {error}=await admin.from(table).insert({[key]:id,user_id:user.id});if(error)throw error;liked=true}const {count,error}=await client.from(table).select('*',{count:'exact',head:true}).eq(key,id);if(error)throw error;return json({ok:true,liked,likes:Number(count||0)})
    }
    case 'denunciar': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const tipo=String(body.tipo||''),id=String(body.id||''),motivo=String(body.motivo||'').trim().slice(0,300);if(!['hilo','respuesta'].includes(tipo)||!id)return json({ok:false,error:'datos_invalidos'});const {error}=await admin.from('denuncias').insert({tipo,id_publicacion:id,denunciante_id:user.id,motivo});if(error)throw error;return json({ok:true})
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
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl;if(!(await isModerator(admin,user.id)))return json({ok:false,error:'no_autorizado'});const {data,error}=await client.from('denuncias').select('id,tipo,id_publicacion,denunciante_id,motivo,created_at,estado,resuelto_por,fecha_resolucion').eq('estado','pendiente').order('created_at',{ascending:true});if(error)throw error;return json({ok:true,denuncias:data||[]})
    }
    case 'resolverDenuncia': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl;if(!(await isModerator(admin,user.id)))return json({ok:false,error:'no_autorizado'});const id=String(body.id||''),accion=String(body.accion||'');if(!['descartar','eliminar'].includes(accion))return json({ok:false,error:'datos_invalidos'});const {data:rep}=await admin.from('denuncias').select('id,tipo,id_publicacion').eq('id',id).single();if(!rep)return json({ok:false,error:'no_encontrado'});if(accion==='eliminar'){if(rep.tipo==='hilo'){const {error}=await admin.from('hilos').delete().eq('id',rep.id_publicacion);if(error)throw error}else{const {error}=await admin.from('respuestas').delete().eq('id',rep.id_publicacion);if(error)throw error}}const {error}=await admin.from('denuncias').update({estado:accion==='eliminar'?'eliminada':'descartada',resuelto_por:user.id,fecha_resolucion:new Date().toISOString()}).eq('id',id);if(error)throw error;return json({ok:true})
    }
    default: return json({ok:false,error:'accion_invalida'})
  }
}

async function getOrBuildThreadResponse(client: SupabaseClient, userId: string, threadId: string) {
  const {data,error}=await client.from('hilos').select('id,autor_id,es_anonimo,titulo,contenido,etiquetas,link,is_sensitive,created_at,respuestas').eq('id',threadId).single();if(error||!data)throw error||new Error('thread not found');const prof=await profileMap(client,[String(data.autor_id)]);const p=prof.get(String(data.autor_id));return {id:String(data.id),autor:data.es_anonimo?'Anónimo':(p?.pseudonimo||'Estudiante'),autorFoto:data.es_anonimo?'':(p?.foto_url||''),titulo:data.titulo,contenido:data.contenido,etiquetas:data.etiquetas||[],link:data.link||'',isSensitive:!!data.is_sensitive,fecha:data.created_at,respuestas:Number(data.respuestas||0),likes:0,meGusta:false,esPropio:String(data.autor_id)===userId}
}

async function getOrBuildResponseResponse(client: SupabaseClient,userId:string,responseId:string,newlyInserted=false){const {data,error}=await client.from('respuestas').select('id,autor_id,es_anonimo,contenido,created_at,operation_id,parent_id').eq('id',responseId).single();if(error||!data)throw error||new Error('response not found');const prof=await profileMap(client,[String(data.autor_id)]);const p=prof.get(String(data.autor_id));return {ok:true,id:String(data.id),respuesta:{id:String(data.id),parentId:data.parent_id?String(data.parent_id):null,autor:data.es_anonimo?'Anónimo':(p?.pseudonimo||'Estudiante'),autorFoto:data.es_anonimo?'':(p?.foto_url||''),esPropio:String(data.autor_id)===userId,contenido:data.contenido,fecha:data.created_at,likes:0,meGusta:false,operacionId:String(data.operation_id||'')}}
}

async function findUserByEmail(admin: SupabaseClient,email:string){for(let page=1;page<=10;page++){const {data,error}=await admin.auth.admin.listUsers({page,perPage:1000});if(error)throw error;const u=(data.users||[]).find((x:any)=>String(x.email||'').toLowerCase()===email);if(u)return u;if(!data.users?.length||data.users.length<1000)break}return null}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = await req.json().catch(() => ({}))
    return await handle(req, body)
  } catch (err) {
    console.error(err)
    // Deliberadamente respondemos 200 con un estado de error: para mutaciones,
    // un HTTP 500 no permite al cliente saber si la operación ya llegó a Postgres.
    // La operación debe permanecer en estado incierto y poder reconciliarse por ID.
    return json({ ok: false, error: 'servidor', ambiguo: true, detalle: String(err && (err as any).message ? (err as any).message : err) }, 200)
  }
})

