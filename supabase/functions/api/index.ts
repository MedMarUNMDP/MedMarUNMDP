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
const MAX_PASOS_CICLO = 50_000
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
  notificaciones: [60, 300],
  marcarNotificacionesLeidas: [60, 300],
  publicarNoticia: [5, 3600],
  listarMateriales: [60, 300],
  enviarAporte: [3, 3600],
  misAportes: [30, 300],
  listarAportes: [30, 300],
  resolverAporte: [60, 600],
  agregarMaterial: [30, 600],
  quitarMaterial: [30, 600],
  quitarPuntaje: [30, 600],
  desafioModeracion: [20, 600],
  abrirSesionModeracion: [10, 600],
  registrarLlave: [3, 3600],
  misLlaves: [30, 300],
  listarLlaves: [30, 300],
  aprobarLlave: [20, 600],
  revocarLlave: [20, 600],
  registroModeracion: [30, 300],
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

// ==================== NOTIFICACIONES (campana) ====================
// Las filas las crean triggers de la base (respuestas, mensajes, intercambios) y publicarNoticia.
// Ver supabase/migrations/20261123180000_notificaciones.sql.

const MAX_NOTIFICACIONES = 30
const MAX_NOTICIA_TITULO = 80
const MAX_NOTICIA_CUERPO = 400

async function listarNotificaciones(user: User, client: SupabaseClient) {
  const [lista, sinLeer] = await Promise.all([
    client.from('notificaciones')
      .select('id,tipo,actor,contexto,cuerpo,link,ref_id,cantidad,leida,created_at,updated_at')
      .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(MAX_NOTIFICACIONES),
    client.from('notificaciones').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('leida', false),
  ])
  if (lista.error) throw lista.error
  if (sinLeer.error) throw sinLeer.error
  return json({ ok: true, notificaciones: lista.data || [], sinLeer: sinLeer.count || 0 })
}

async function marcarNotificacionesLeidas(user: User, admin: SupabaseClient, body: any) {
  // Sin ids = todas. Con ids: hasta 50 y siempre filtradas por el usuario de la sesión.
  const ids = Array.isArray(body.ids) ? body.ids.map(uuidOrEmpty).filter(Boolean).slice(0, 50) : null
  if (ids && !ids.length) return json({ ok: false, error: 'datos_invalidos' })
  let q = admin.from('notificaciones').update({ leida: true }).eq('user_id', user.id).eq('leida', false)
  if (ids) q = q.in('id', ids)
  const { error } = await q
  if (error) throw error
  return json({ ok: true })
}

// Link de una noticia: una ruta del sitio ("/juegos/…") o una URL https. null = inválido.
function linkNoticiaValido(valor: string) {
  if (!valor) return ''
  if (valor.startsWith('/') && !valor.startsWith('//')) return /^[\w\-./?=&%#]+$/.test(valor) ? valor : null
  try {
    const u = new URL(valor)
    return u.protocol === 'https:' ? u.toString() : null
  } catch { return null }
}

async function publicarNoticia(admin: SupabaseClient, body: any) {
  const titulo = String(body.titulo || '').trim()
  const cuerpo = String(body.cuerpo || '').trim()
  const link = linkNoticiaValido(String(body.link || '').trim())
  if (!titulo || titulo.length > MAX_NOTICIA_TITULO || cuerpo.length > MAX_NOTICIA_CUERPO || link === null || link.length > 300) {
    return json({ ok: false, error: 'datos_invalidos' })
  }
  const noticiaId = crypto.randomUUID()
  const { data: perfiles, error: errPerfiles } = await admin.from('profiles').select('id')
  if (errPerfiles) throw errPerfiles
  const filas = (perfiles || []).map((p: any) => ({
    user_id: p.id, tipo: 'noticia', contexto: titulo, cuerpo: cuerpo || null, link: link || null, ref_id: noticiaId,
  }))
  for (let i = 0; i < filas.length; i += 500) {
    const { error } = await admin.from('notificaciones').insert(filas.slice(i, i + 500))
    if (error) throw error
  }
  return json({ ok: true, destinatarios: filas.length })
}

// ==================== MATERIAL DE ESTUDIO Y APORTES ====================
// Los archivos viven en Google Drive: acá solo se guardan enlaces. Los aportes de estudiantes pasan por
// revisión de moderadores. Ver supabase/migrations/20261123220000_material_estudio.sql.

const TIPOS_MATERIAL = ['resumen', 'apunte', 'guia', 'examen', 'libro', 'otro']
const MAX_APORTES_DIA = 5            // por persona, en 24 h
const MAX_APORTES_PENDIENTES = 5     // por persona, esperando revisión
const MAX_APORTES_PENDIENTES_TOTAL = 300
const MIN_MS_FORMULARIO = 3000       // menos que esto no lo llena una persona

// Solo enlaces https de Drive o Docs, sin credenciales ni puertos raros. '' = vacío, null = inválido.
function linkDriveValido(valor: unknown) {
  const texto = String(valor || '').trim()
  if (!texto) return ''
  if (texto.length > 300) return null
  try {
    const u = new URL(texto)
    if (u.protocol !== 'https:' || u.username || u.password || u.port) return null
    if (u.hostname !== 'drive.google.com' && u.hostname !== 'docs.google.com') return null
    return u.toString()
  } catch { return null }
}

function textoLimpio(valor: unknown, max: number) {
  return String(valor || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max)
}

function datosMaterial(body: any) {
  const titulo = textoLimpio(body.titulo, 120)
  const descripcion = textoLimpio(body.descripcion, 400)
  const materia = textoLimpio(body.materia, 120)
  const tipo = String(body.tipo || '')
  const link = linkDriveValido(body.link)
  const credito = textoLimpio(body.credito, 60)
  if (titulo.length < 3 || materia.length < 2 || !TIPOS_MATERIAL.includes(tipo) || !link) return null
  return { titulo, descripcion: descripcion || null, materia, tipo, link, credito: credito || null }
}

async function listarMateriales(client: SupabaseClient) {
  const { data, error } = await client.from('materiales')
    .select('id,titulo,descripcion,materia,tipo,link,credito,created_at')
    .order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  return json({ ok: true, materiales: data || [] })
}

async function enviarAporte(user: User, admin: SupabaseClient, body: any) {
  // Trampas para bots: campo oculto con texto o formulario llenado en menos de 3 s. Se responde ok para no darles pistas.
  if (String(body.website || '').trim() || Number(body.ms) < MIN_MS_FORMULARIO) return json({ ok: true })

  const clase = body.clase === 'sugerencia' ? 'sugerencia' : 'archivo'
  const titulo = textoLimpio(body.titulo, 120)
  const descripcion = textoLimpio(body.descripcion, 1000)
  const materia = textoLimpio(body.materia, 120)
  const tipo = TIPOS_MATERIAL.includes(String(body.tipo)) ? String(body.tipo) : null
  const link = linkDriveValido(body.link)
  if (titulo.length < 3 || link === null) return json({ ok: false, error: 'datos_invalidos' })
  if (clase === 'archivo' && !link) return json({ ok: false, error: 'link_requerido' })
  if (clase === 'sugerencia' && descripcion.length < 10) return json({ ok: false, error: 'datos_invalidos' })

  const hace24h = new Date(Date.now() - 86400000).toISOString()
  const [delDia, pendientes, pendientesTotal] = await Promise.all([
    admin.from('aportes_material').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', hace24h),
    admin.from('aportes_material').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('estado', 'pendiente'),
    admin.from('aportes_material').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
  ])
  for (const r of [delDia, pendientes, pendientesTotal]) if (r.error) throw r.error
  if ((delDia.count || 0) >= MAX_APORTES_DIA) return json({ ok: false, error: 'aportes_limite_dia' })
  if ((pendientes.count || 0) >= MAX_APORTES_PENDIENTES) return json({ ok: false, error: 'aportes_limite_pendientes' })
  if ((pendientesTotal.count || 0) >= MAX_APORTES_PENDIENTES_TOTAL) return json({ ok: false, error: 'aportes_bandeja_llena' })

  const { error } = await admin.from('aportes_material').insert({
    user_id: user.id, clase, titulo, descripcion: descripcion || null, materia: materia || null, tipo,
    link: link || null, mostrar_credito: body.mostrarCredito === true,
  })
  if (error) {
    if (String((error as any).code) === '23505') return json({ ok: false, error: 'aporte_duplicado' })
    throw error
  }
  return json({ ok: true })
}

async function listarAportes(admin: SupabaseClient) {
  const { data, error } = await admin.from('aportes_material')
    .select('id,user_id,clase,titulo,descripcion,materia,tipo,link,mostrar_credito,created_at')
    .eq('estado', 'pendiente').order('created_at', { ascending: true }).limit(100)
  if (error) throw error
  const pmap = await profileMap(admin, (data || []).map((a: any) => String(a.user_id)))
  const aportes = (data || []).map((a: any) => {
    const { user_id, ...resto } = a
    return { ...resto, autor: pmap.get(String(user_id))?.pseudonimo || 'Estudiante' }
  })
  return json({ ok: true, aportes })
}

async function resolverAporte(user: User, admin: SupabaseClient, body: any) {
  const id = uuidOrEmpty(body.id)
  const decision = String(body.decision || '')
  if (!id || !['aprobar', 'rechazar'].includes(decision)) return json({ ok: false, error: 'datos_invalidos' })
  const { data: aporte, error: errAporte } = await admin.from('aportes_material')
    .select('id,user_id,clase,titulo,descripcion,materia,tipo,link,mostrar_credito,estado').eq('id', id).maybeSingle()
  if (errAporte) throw errAporte
  if (!aporte) return json({ ok: false, error: 'no_encontrado' })
  if (aporte.estado !== 'pendiente') return json({ ok: false, error: 'ya_resuelto' })

  const motivo = textoLimpio(body.motivo, 300) || null
  let publicado = false
  if (decision === 'aprobar' && aporte.clase === 'archivo') {
    // El moderador puede corregir título, materia, tipo y descripción antes de publicar.
    let credito: string | null = null
    if (aporte.mostrar_credito) {
      const pmap = await profileMap(admin, [String(aporte.user_id)])
      credito = pmap.get(String(aporte.user_id))?.pseudonimo || null
    }
    const m = datosMaterial({
      titulo: body.titulo ?? aporte.titulo, descripcion: body.descripcion ?? aporte.descripcion,
      materia: body.materia ?? aporte.materia, tipo: body.tipo ?? aporte.tipo, link: aporte.link, credito,
    })
    if (!m) return json({ ok: false, error: 'datos_material_incompletos' })
    const { error } = await admin.from('materiales').insert({ ...m, aporte_id: aporte.id, creado_por: user.id })
    if (error) {
      if (String((error as any).code) === '23505') return json({ ok: false, error: 'material_duplicado' })
      throw error
    }
    publicado = true
  }

  const { error: errUpdate } = await admin.from('aportes_material').update({
    estado: decision === 'aprobar' ? 'aprobado' : 'rechazado', motivo, revisado_por: user.id, revisado_at: new Date().toISOString(),
  }).eq('id', id).eq('estado', 'pendiente')
  if (errUpdate) throw errUpdate

  // Aviso en la campana de quien lo mandó.
  const cuerpo = decision === 'rechazar'
    ? 'No se publicó.' + (motivo ? ' ' + motivo : '')
    : publicado ? 'Ya está publicado en Material de estudio. ¡Gracias por compartir!' : 'Lo tuvimos en cuenta. ¡Gracias por la sugerencia!'
  const { error: errNotif } = await admin.from('notificaciones').insert({
    user_id: aporte.user_id, tipo: 'aporte', contexto: String(aporte.titulo).slice(0, 160), cuerpo: cuerpo.slice(0, 400), ref_id: aporte.id,
  })
  if (errNotif) console.warn('resolverAporte: no se pudo notificar', errNotif.message)
  return json({ ok: true, publicado })
}

// ==================== LLAVES DE MODERACIÓN ====================
// Segundo factor para moderar: además de la cuenta con el rol, hace falta una llave ECDSA P-256 cuyo par privado
// vive solo en un archivo cifrado del moderador. Flujo: desafioModeracion → el navegador firma → abrirSesionModeracion
// verifica la firma y entrega un token de 30 min → cada acción de moderación lo exige (autorizarModeracion).
// Ver docs/decisiones/0004-llaves-de-moderacion.md y la migración 20261124120000_llaves_moderacion.sql.

const MOD_DESAFIO_MS = 2 * 60 * 1000
const MOD_SESION_MS = 30 * 60 * 1000
const MOD_MENSAJE = 'medmar-moderacion-v1|'
const MAX_LLAVES_POR_USUARIO = 2
// Cuenta oficial de MedMar: siempre admin, no se le puede quitar el rol desde la web.
const CUENTA_OFICIAL = 'medmarunmdp@gmail.com'
const RE_DESAFIO = /^([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(\d{13})\.([A-Za-z0-9_-]{43})$/
const RE_TOKEN_MOD = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(moderador|admin)\.(\d{13})\.([A-Za-z0-9_-]{43})$/
const RE_HUELLA = /^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/
const RE_COORD = /^[A-Za-z0-9_-]{43}$/

let claveFirmaModeracion: Promise<CryptoKey> | null = null
async function hmacModeracion(datos: string) {
  if (!claveFirmaModeracion) claveFirmaModeracion = crypto.subtle.importKey('raw', new TextEncoder().encode('medmar-moderacion-v1:' + SECRET_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', await claveFirmaModeracion, new TextEncoder().encode(datos)))
  let bin = ''
  for (const b of firma) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function compararSeguro(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function base64urlABytes(texto: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(texto)) return null
  const b64 = texto.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((texto.length + 3) % 4)
  try {
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch { return null }
}

// Solo la parte pública: kty, crv, x, y. Cualquier otra cosa (sobre todo "d", la privada) se rechaza.
function jwkPublicaValida(valor: any) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null
  if (valor.kty !== 'EC' || valor.crv !== 'P-256' || 'd' in valor) return null
  if (!RE_COORD.test(String(valor.x || '')) || !RE_COORD.test(String(valor.y || ''))) return null
  return { kty: 'EC', crv: 'P-256', x: String(valor.x), y: String(valor.y) }
}

// Huella = primeros 8 bytes del SHA-256 de la llave pública canónica, en hexadecimal: «A1B2-C3D4-E5F6-0718».
// La calcula el navegador al crear la llave y la recalcula la API: sirve para verificarla por otro canal.
async function huellaDeLlave(jwk: { crv: string, kty: string, x: string, y: string }) {
  const canonica = JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonica)))
  const hex = Array.from(hash.slice(0, 8)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  return hex.match(/.{4}/g)!.join('-')
}

async function crearDesafioModeracion(userId: string) {
  const nonce = crypto.randomUUID()
  const expira = Date.now() + MOD_DESAFIO_MS
  return `${nonce}.${expira}.${await hmacModeracion(`desafio.${nonce}.${userId}.${expira}`)}`
}

async function desafioModeracionValido(desafio: unknown, userId: string) {
  const m = RE_DESAFIO.exec(String(desafio || ''))
  if (!m) return false
  const esperada = await hmacModeracion(`desafio.${m[1]}.${userId}.${m[2]}`)
  if (!compararSeguro(esperada, m[3])) return false
  const expira = Number(m[2])
  return Date.now() <= expira && expira <= Date.now() + MOD_DESAFIO_MS + 60_000
}

async function crearTokenModeracion(userId: string, llaveId: string, rol: string) {
  const expira = Date.now() + MOD_SESION_MS
  return { token: `${llaveId}.${rol}.${expira}.${await hmacModeracion(`token.${userId}.${llaveId}.${rol}.${expira}`)}`, expira }
}

async function leerTokenModeracion(token: unknown, userId: string) {
  const m = RE_TOKEN_MOD.exec(String(token || ''))
  if (!m) return null
  const esperada = await hmacModeracion(`token.${userId}.${m[1]}.${m[2]}.${m[3]}`)
  if (!compararSeguro(esperada, m[4])) return null
  const expira = Number(m[3])
  if (Date.now() > expira || expira > Date.now() + MOD_SESION_MS + 60_000) return null
  return { llaveId: m[1], rol: m[2] }
}

async function tieneRol(admin: SupabaseClient, userId: string, rol: 'moderador' | 'admin') {
  if (rol === 'admin') return isAdmin(admin, userId)
  return (await isModerator(admin, userId)) || (await isAdmin(admin, userId))
}

// Exige cuenta con el rol + token de moderación vigente + llave activa del mismo usuario con ese rol.
// Devuelve { llaveId } o la Response de error ('llave_requerida' le indica al navegador que pida desbloquear).
async function autorizarModeracion(admin: SupabaseClient, user: User, body: any, rol: 'moderador' | 'admin') {
  if (!(await tieneRol(admin, user.id, rol))) return json({ ok: false, error: 'no_autorizado' })
  const t = await leerTokenModeracion(body?.tokenModeracion, user.id)
  if (!t || (rol === 'admin' && t.rol !== 'admin')) return json({ ok: false, error: 'llave_requerida' })
  const { data: llave, error } = await admin.from('llaves_moderacion').select('id,user_id,rol,estado').eq('id', t.llaveId).maybeSingle()
  if (error) throw error
  if (!llave || llave.estado !== 'activa' || String(llave.user_id) !== user.id || llave.rol !== t.rol) return json({ ok: false, error: 'llave_requerida' })
  if (llave.rol === 'admin' && !(await isAdmin(admin, user.id))) return json({ ok: false, error: 'no_autorizado' })
  return { llaveId: String(llave.id) }
}

async function auditar(admin: SupabaseClient, userId: string, llaveId: string | null, accion: string, detalle: Record<string, unknown> = {}) {
  const { error } = await admin.from('registro_moderacion').insert({ user_id: userId, llave_id: llaveId, accion: accion.slice(0, 40), detalle })
  if (error) console.warn('auditar:', error.message)
}

async function abrirSesionModeracion(user: User, admin: SupabaseClient, body: any) {
  if (!(await tieneRol(admin, user.id, 'moderador'))) return json({ ok: false, error: 'no_autorizado' })
  if (!(await desafioModeracionValido(body.desafio, user.id))) return json({ ok: false, error: 'desafio_vencido' })
  const nonce = String(body.desafio).slice(0, 36)
  const { error: errNonce } = await admin.from('idempotency_keys').insert({ user_id: user.id, operation_id: nonce, action: 'desafio_moderacion', response: {} })
  if (errNonce) {
    if (String((errNonce as any).code) === '23505') return json({ ok: false, error: 'desafio_vencido' })
    throw errNonce
  }
  const huella = String(body.huella || '')
  const firma = base64urlABytes(String(body.firma || ''))
  if (!RE_HUELLA.test(huella) || !firma || firma.length !== 64) return json({ ok: false, error: 'datos_invalidos' })

  const { data: llave, error } = await admin.from('llaves_moderacion')
    .select('id,user_id,rol,estado,public_key').eq('huella', huella).maybeSingle()
  if (error) throw error
  if (!llave || String(llave.user_id) !== user.id) return json({ ok: false, error: 'llave_desconocida' })
  if (llave.estado === 'pendiente') return json({ ok: false, error: 'llave_pendiente' })
  if (llave.estado !== 'activa') return json({ ok: false, error: 'llave_revocada' })
  if (!(await tieneRol(admin, user.id, llave.rol))) return json({ ok: false, error: 'no_autorizado' })

  const jwk = jwkPublicaValida(llave.public_key)
  if (!jwk) return json({ ok: false, error: 'llave_desconocida' })
  const publica = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  const valida = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publica, firma, new TextEncoder().encode(MOD_MENSAJE + String(body.desafio)))
  if (!valida) {
    await auditar(admin, user.id, String(llave.id), 'firma_invalida')
    return json({ ok: false, error: 'firma_invalida' })
  }
  await admin.from('llaves_moderacion').update({ ultimo_uso: new Date().toISOString() }).eq('id', llave.id)
  await auditar(admin, user.id, String(llave.id), 'abrir_sesion', { rol: llave.rol })
  const { token, expira } = await crearTokenModeracion(user.id, String(llave.id), llave.rol)
  return json({ ok: true, token, rol: llave.rol, expira })
}

async function registrarLlave(user: User, admin: SupabaseClient, body: any) {
  // Solo moderadores registran su llave por acá (queda pendiente hasta que un admin la apruebe).
  // Las llaves de admin se dan de alta únicamente por SQL desde el dashboard de Supabase.
  if (!(await isModerator(admin, user.id))) return json({ ok: false, error: 'no_autorizado' })
  const jwk = jwkPublicaValida(body.publica)
  if (!jwk) return json({ ok: false, error: 'datos_invalidos' })
  const nombre = String(body.nombre || '').replace(/[\u0000-\u001F]/g, '').trim().slice(0, 60) || null
  const { count, error: errCount } = await admin.from('llaves_moderacion').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).in('estado', ['pendiente', 'activa'])
  if (errCount) throw errCount
  if ((count || 0) >= MAX_LLAVES_POR_USUARIO) return json({ ok: false, error: 'llaves_limite' })
  try { await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']) }
  catch { return json({ ok: false, error: 'datos_invalidos' }) }
  const huella = await huellaDeLlave(jwk)
  const { data, error } = await admin.from('llaves_moderacion')
    .insert({ user_id: user.id, rol: 'moderador', nombre, public_key: jwk, huella }).select('id').single()
  if (error) {
    if (String((error as any).code) === '23505') return json({ ok: false, error: 'llave_duplicada' })
    throw error
  }
  await auditar(admin, user.id, String(data.id), 'registrar_llave', { huella })
  // Aviso a los admins para que la revisen.
  const { data: admins } = await admin.from('profiles').select('id').eq('is_admin', true)
  const pmap = await profileMap(admin, [user.id])
  const filas = (admins || []).map((a: any) => ({
    user_id: a.id, tipo: 'noticia', contexto: 'Llave de moderación para aprobar',
    cuerpo: `${pmap.get(user.id)?.pseudonimo || 'Un moderador'} registró una llave. Huella: ${huella}. Verificala con esa persona antes de aprobarla.`,
    link: '/?vista=moderacion', ref_id: data.id,
  }))
  if (filas.length) await admin.from('notificaciones').insert(filas)
  return json({ ok: true, huella })
}

async function listarLlaves(admin: SupabaseClient) {
  const { data, error } = await admin.from('llaves_moderacion')
    .select('id,user_id,rol,nombre,huella,estado,created_at,aprobada_at,ultimo_uso')
    .neq('estado', 'revocada').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  const pmap = await profileMap(admin, (data || []).map((l: any) => String(l.user_id)))
  return json({ ok: true, llaves: (data || []).map((l: any) => {
    const { user_id, ...resto } = l
    return { ...resto, pseudonimo: pmap.get(String(user_id))?.pseudonimo || 'Estudiante' }
  }) })
}

async function registroModeracion(admin: SupabaseClient) {
  const { data, error } = await admin.from('registro_moderacion')
    .select('id,user_id,accion,detalle,created_at').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  const pmap = await profileMap(admin, (data || []).map((r: any) => String(r.user_id || '')).filter(Boolean))
  return json({ ok: true, registro: (data || []).map((r: any) => {
    const { user_id, ...resto } = r
    return { ...resto, pseudonimo: pmap.get(String(user_id))?.pseudonimo || '—' }
  }) })
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
    // Falla cerrada: si no se puede contar, no se deja pasar (sin la base, la acción fallaría igual).
    console.error('rate_limit_unavailable', action, error.message)
    return json({ ok: false, error: 'rate_limit', retryAfter: 5 }, 200)
  }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.allowed) return json({ ok: false, error: 'rate_limit', retryAfter: Number(row?.retry_after || 1) }, 200)
  return null
}

function offsetSeguro(valor: unknown) {
  const n = Number(valor || 0)
  return Number.isInteger(n) && n >= 0 && n <= 10_000 ? n : 0
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
  // Sin recortar: antes se quedaba con los 10 primeros, así que el tope de enlaces nunca saltaba y del 11.º en
  // adelante no se validaba el dominio (verificado en vivo en la auditoría 2026-11).
  return [...new Set((String(text || '').match(/https?:\/\/[^\s<>\"']+/gi) || []).map(x => x.replace(/[),.;!?]+$/g, '')))]
}

// Cada enlace a un host de imágenes dispara una previsualización (una invocación de resolverImagen por lector):
// sin tope, una sola publicación podía consumir miles de invocaciones del plan.
const MAX_ENLACES_POR_PUBLICACION = 10
function validateContentLinks(text: string) {
  const urls = extractUrls(text)
  if (urls.length > MAX_ENLACES_POR_PUBLICACION) return { ok: false, urls, invalid: '', demasiados: true }
  for (const raw of urls) {
    if (!safeLink(raw)) return { ok: false, urls, invalid: raw, demasiados: false }
  }
  return { ok: true, urls, invalid: '', demasiados: false }
}

const IMAGE_PAGE_HOSTS = ['prnt.sc','lightshot.com','lightshot.org','pinetools.com','screenapp.io','imgur.com','imgur.io','ibb.co','postimg.cc','imgbb.com','imageshack.com','imgbox.com']
function isPrivateOrLocalHost(host: string) {
  const h = host.toLowerCase().replace(/\.$/, '')
  return h === 'localhost' || h.endsWith('.localhost') || h === '::1' || h.startsWith('127.') || h.startsWith('10.') || h.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '0.0.0.0'
}

// Lee como mucho `tope` bytes del cuerpo y corta la descarga: response.text() bajaba la página entera antes de recortar.
async function leerBytesConTope(response: Response, tope: number) {
  if (!response.body) return new Uint8Array(0)
  const reader = response.body.getReader()
  const partes: Uint8Array[] = []
  let total = 0
  while (total < tope) {
    const { done, value } = await reader.read()
    if (done || !value) break
    partes.push(value.subarray(0, tope - total))
    total += Math.min(value.length, tope - total)
  }
  await reader.cancel().catch(() => {})
  const junto = new Uint8Array(total)
  let pos = 0
  for (const p of partes) { junto.set(p, pos); pos += p.length }
  return junto
}

async function leerTextoConTope(response: Response, tope: number) {
  return new TextDecoder().decode(await leerBytesConTope(response, tope))
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
    const html = await leerTextoConTope(response, 1_000_000)
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

// Foto subida por la propia persona: URL exacta del bucket, dentro de su carpeta, sin query, hash ni '..'.
// (Antes alcanzaba con que el id apareciera en cualquier parte de la URL, por ejemplo en la query string.)
function fotoPropiaValida(foto: string, userId: string) {
  let u: URL
  try { u = new URL(foto) } catch { return false }
  const base = new URL(SUPABASE_URL)
  if (u.protocol !== 'https:' || u.host !== base.host || u.username || u.password || u.search || u.hash) return false
  const prefijo = `/storage/v1/object/public/profile-photos/${userId}/`
  if (!u.pathname.startsWith(prefijo)) return false
  return /^[A-Za-z0-9_-]{1,80}\.jpe?g$/.test(u.pathname.slice(prefijo.length))
}

async function profileMap(client: SupabaseClient, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return new Map<string, any>()
  const { data, error } = await client.from('profiles').select('id,pseudonimo,foto_url').in('id', unique)
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

async function getIdempotent(admin: SupabaseClient, userId: string, operationId: string, action: string) {
  const { data } = await admin.from('idempotency_keys').select('response').eq('user_id', userId).eq('operation_id', operationId).eq('action', action).maybeSingle()
  return data?.response ?? null
}

async function findCycle(admin: SupabaseClient, materia: string, userId: string) {
  const { data, error } = await admin.from('solicitudes')
    .select('id,user_id,materia,tengo,busco,status,created_at,operation_id')
    .eq('status', 'activa')
    .eq('materia', materia)
    .order('created_at', { ascending: true })
    .limit(5000)
  if (error) throw error
  // Primero las solicitudes de quien acaba de guardar: un ciclo nuevo casi siempre lo incluye.
  const base = (data || []).map(r => ({ ...r, email: String(r.user_id) }))
    .sort((a, b) => Number(String(b.user_id) === userId) - Number(String(a.user_id) === userId))
  const byTengo = new Map<number, any[]>()
  for (const o of base) {
    if (!byTengo.has(Number(o.tengo))) byTengo.set(Number(o.tengo), [])
    byTengo.get(Number(o.tengo))!.push(o)
  }
  let best: any[] | null = null
  // Tope de pasos de la búsqueda (DFS sin memoria = exponencial en el peor caso): con solicitudes armadas a propósito
  // en capas, cada guardado podía agotar la CPU de la función y bloquear los emparejamientos de toda la materia.
  let pasos = 0

  function dfs(start: any, current: any, seen: Set<string>, path: any[]) {
    if (++pasos > MAX_PASOS_CICLO) return
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
    if (pasos > MAX_PASOS_CICLO) {
      console.warn('find_cycle_tope', materia, base.length)
      break
    }
    dfs(start, start, new Set([start.user_id]), [start])
  }
  return best
}

async function maybeMatch(admin: SupabaseClient, userId: string, materia: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const cycle = await findCycle(admin, materia, userId)
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
    admin.from('profiles').select('id,pseudonimo,foto_url,is_moderator,is_admin,profile_completed').eq('id', user.id).single(),
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
  // Plausibilidad: el arnés de simulación da ~0,8 eliminaciones por segundo y el máximo real en producción fue ~1,4/s
  // (nov 2026). Tope: 3/s + 60, el doble del máximo observado. Antes era 6/s, y dejaba inflar el ranking sin jugar.
  // Además: no hay partidas de menos de 20 s, ni más preguntas que una cada ~10 s, ni más de un jefe cada ~25 s.
  if (segundos < PARTIDA_MIN_SEGUNDOS || segundos > PARTIDA_MAX_SEGUNDOS) return null
  if (kills > segundos * 3 + 60) return null
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
  const previa = await getIdempotent(admin, user.id, operationId, 'guardarPuntaje')
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
  const authRequired = action !== 'health'
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
  if (!user) return json({ ok: false, error: 'sesion_invalida' })

  switch (action) {
    case 'bootstrap': return bootstrap(user, client, admin)
    case 'foroBootstrap': return foroBootstrap(user, client, admin, String(body.etiqueta || '').trim().toLowerCase().slice(0, MAX_TAG_LENGTH))
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
      return json({ ok: true, ...(await getThreadPage(client, user.id, String(body.etiqueta || '').trim().toLowerCase().slice(0, MAX_TAG_LENGTH), offsetSeguro(body.desde), String(body.busqueda || '').slice(0, 100))) })
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
      const cached=await getIdempotent(admin,user.id,operationId,action); if(cached) return json(cached)
      if(!titulo||titulo.length>MAX_TITLE||!contenido||contenido.length>MAX_CONTENT) return json({ok:false,error:titulo.length>MAX_TITLE?'titulo_invalido':'contenido_invalido'})
      const tags=cleanTags(body.etiquetas)
      const linksCheck=validateContentLinks(contenido)
      if(!linksCheck.ok) return json({ok:false,error:linksCheck.demasiados?'demasiados_enlaces':'enlace_no_permitido',url:linksCheck.invalid})
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
      const cached=await getIdempotent(admin,user.id,operationId,action); if(cached)return json(cached)
      if(!hiloId||!contenido||contenido.length>MAX_CONTENT)return json({ok:false,error:'contenido_invalido'})
      if(parentId&&!validOperationId(parentId))return json({ok:false,error:'respuesta_invalida'})
      const linksCheck=validateContentLinks(contenido)
      if(!linksCheck.ok) return json({ok:false,error:linksCheck.demasiados?'demasiados_enlaces':'enlace_no_permitido',url:linksCheck.invalid})
      const {data:thread}=await client.from('hilos').select('id').eq('id',hiloId).single(); if(!thread)return json({ok:false,error:'no_encontrado'})
      if(parentId){const {data:parent,error:parentError}=await client.from('respuestas').select('id').eq('id',parentId).eq('hilo_id',hiloId).maybeSingle();if(parentError)throw parentError;if(!parent)return json({ok:false,error:'respuesta_invalida'})}
      const {data,error}=await admin.from('respuestas').insert({hilo_id:hiloId,parent_id:parentId||null,autor_id:user.id,es_anonimo:false,contenido,operation_id:operationId}).select('id').single()
      if(error){ if((error as any).code==='23503')return json({ok:false,error:parentId?'respuesta_invalida':'no_encontrado'}); if((error as any).code==='23505'){const {data:existing}=await client.from('respuestas').select('id').eq('operation_id',operationId).single(); if(existing)return json(await getOrBuildResponseResponse(client,user.id,String(existing.id)))} throw error }
      const response=await getOrBuildResponseResponse(client,user.id,String(data.id),true); await saveIdempotent(admin,user.id,action,operationId,response); return json(response)
    }
    case 'guardar': {
      const rl=await rateLimit(admin,action,user.id); if(rl)return rl
      const operationId=String(body.operacionId||''); if(!validOperationId(operationId)) return json({ok:false,error:'datos_invalidos'})
      const cached=await getIdempotent(admin,user.id,operationId,action); if(cached)return json(cached)
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

      if (String(hilo.autor_id) !== user.id) {
        const auth = await autorizarModeracion(admin, user, body, 'moderador'); if (auth instanceof Response) return auth
        await borrarPublicacion(admin, 'hilo', id)
        await auditar(admin, user.id, auth.llaveId, 'borrar_hilo', { id })
        return json({ ok: true })
      }

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

      if (String(respuesta.autor_id) !== user.id) {
        const auth = await autorizarModeracion(admin, user, body, 'moderador'); if (auth instanceof Response) return auth
        await borrarPublicacion(admin, 'respuesta', id)
        await auditar(admin, user.id, auth.llaveId, 'borrar_respuesta', { id })
        return json({ ok: true })
      }

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
      const cached=await getIdempotent(admin,user.id,operationId,action);if(cached)return json(cached)
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
      const existingPhoto = !foto || presetAllowed || fotoPropiaValida(foto, user.id)
      if(!existingPhoto) return json({ok:false,error:'foto_invalida'})
      const {data:duplicates,error:dupError}=await admin.from('profiles').select('id').ilike('pseudonimo',pseudonimo.replace(/[\\%_]/g,(c)=>'\\'+c)).neq('id',user.id).limit(1)
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
    case 'notificaciones': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return listarNotificaciones(user,client)
    }
    case 'marcarNotificacionesLeidas': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return marcarNotificacionesLeidas(user,admin,body)
    }
    case 'publicarNoticia': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
      const res=await publicarNoticia(admin,body)
      if((await res.clone().json()).ok)await auditar(admin,user.id,auth.llaveId,'publicar_noticia',{titulo:String(body.titulo||'').slice(0,80)})
      return res
    }
    case 'listarMateriales': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return listarMateriales(client)
    }
    case 'enviarAporte': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return enviarAporte(user,admin,body)
    }
    case 'misAportes': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      // Sin .eq('user_id'): authenticated no tiene SELECT sobre esa columna (fallaba con 42501). La política RLS
      // aportes_material_select_propios ya limita a las filas propias.
      const {data,error}=await client.from('aportes_material').select('id,clase,titulo,materia,estado,motivo,created_at').order('created_at',{ascending:false}).limit(20)
      if(error)throw error
      return json({ok:true,aportes:data||[]})
    }
    case 'listarAportes': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      return listarAportes(admin)
    }
    case 'resolverAporte': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const res=await resolverAporte(user,admin,body)
      if((await res.clone().json()).ok)await auditar(admin,user.id,auth.llaveId,'resolver_aporte',{id:uuidOrEmpty(body.id),decision:String(body.decision||'')})
      return res
    }
    case 'agregarMaterial': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const m=datosMaterial(body)
      if(!m)return json({ok:false,error:'datos_invalidos'})
      const {error}=await admin.from('materiales').insert({...m,creado_por:user.id})
      if(error){if(String((error as any).code)==='23505')return json({ok:false,error:'material_duplicado'});throw error}
      await auditar(admin,user.id,auth.llaveId,'agregar_material',{titulo:m.titulo})
      return json({ok:true})
    }
    case 'quitarMaterial': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const id=uuidOrEmpty(body.id);if(!id)return json({ok:false,error:'datos_invalidos'})
      const {error}=await admin.from('materiales').update({activo:false}).eq('id',id)
      if(error)throw error
      await auditar(admin,user.id,auth.llaveId,'quitar_material',{id})
      return json({ok:true})
    }
    case 'quitarPuntaje': {
      // Antitrampa del ranking: el juego corre en el navegador, así que un puntaje inventado dentro de lo plausible
      // no se puede distinguir de uno real. Un moderador (con llave) puede sacar del ranking el que parezca trampa.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const juego=String(body.juego||''),modo=String(body.modo||'')
      const pseudonimo=String(body.pseudonimo||'').trim().normalize('NFC')
      if(!JUEGOS_RANKING.has(juego)||!MODO_RANKING.test(modo)||!/^[A-Za-zÀ-ÿ0-9 _.-]{3,24}$/.test(pseudonimo))return json({ok:false,error:'datos_invalidos'})
      const {data:perfil,error:errPerfil}=await admin.from('profiles').select('id').ilike('pseudonimo',pseudonimo.replace(/[\\%_]/g,(c)=>'\\'+c)).maybeSingle()
      if(errPerfil)throw errPerfil
      if(!perfil)return json({ok:false,error:'no_encontrado'})
      const {data:borrados,error}=await admin.from('puntajes_juegos').delete().eq('user_id',perfil.id).eq('juego',juego).eq('modo',modo).select('puntaje,segundos,detalle')
      if(error)throw error
      if(!borrados||!borrados.length)return json({ok:false,error:'no_encontrado'})
      const b:any=borrados[0]
      await auditar(admin,user.id,auth.llaveId,'quitar_puntaje',{usuario:String(perfil.id),juego,modo,puntaje:b.puntaje,segundos:b.segundos,kills:b.detalle?.kills??null})
      return json({ok:true})
    }
    case 'desafioModeracion': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      if(!(await tieneRol(admin,user.id,'moderador')))return json({ok:false,error:'no_autorizado'})
      return json({ok:true,desafio:await crearDesafioModeracion(user.id)})
    }
    case 'abrirSesionModeracion': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return abrirSesionModeracion(user,admin,body)
    }
    case 'registrarLlave': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return registrarLlave(user,admin,body)
    }
    case 'misLlaves': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const {data,error}=await admin.from('llaves_moderacion').select('id,rol,nombre,huella,estado,created_at,ultimo_uso').eq('user_id',user.id).neq('estado','revocada').order('created_at',{ascending:false})
      if(error)throw error
      return json({ok:true,llaves:data||[]})
    }
    case 'listarLlaves': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
      return listarLlaves(admin)
    }
    case 'aprobarLlave': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
      const id=uuidOrEmpty(body.id);if(!id)return json({ok:false,error:'datos_invalidos'})
      const {data:llave,error:errLlave}=await admin.from('llaves_moderacion').select('id,user_id,rol,estado,huella').eq('id',id).maybeSingle()
      if(errLlave)throw errLlave
      if(!llave||llave.estado!=='pendiente'||llave.rol!=='moderador')return json({ok:false,error:'no_encontrado'})
      if(String(body.huellaConfirmada||'').trim().toUpperCase()!==llave.huella)return json({ok:false,error:'huella_no_coincide'})
      if(!(await isModerator(admin,String(llave.user_id))))return json({ok:false,error:'no_es_moderador'})
      const {error}=await admin.from('llaves_moderacion').update({estado:'activa',aprobada_por:user.id,aprobada_at:new Date().toISOString()}).eq('id',id).eq('estado','pendiente')
      if(error)throw error
      await auditar(admin,user.id,auth.llaveId,'aprobar_llave',{llave:id,huella:llave.huella})
      await admin.from('notificaciones').insert({user_id:llave.user_id,tipo:'noticia',contexto:'Tu llave de moderación fue aprobada',cuerpo:'Ya podés desbloquear la moderación con tu archivo de llave.',link:'/?vista=moderacion',ref_id:id})
      return json({ok:true})
    }
    case 'revocarLlave': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const id=uuidOrEmpty(body.id);if(!id)return json({ok:false,error:'datos_invalidos'})
      const {data:llave,error:errLlave}=await admin.from('llaves_moderacion').select('id,user_id,rol,estado,huella').eq('id',id).maybeSingle()
      if(errLlave)throw errLlave
      if(!llave||llave.estado==='revocada')return json({ok:false,error:'no_encontrado'})
      const propiaSinLlave=String(llave.user_id)===user.id&&llave.rol!=='admin'
      // La propia llave se puede revocar solo con la cuenta (por si perdés el archivo); la de otro, solo un admin con su llave.
      let llaveUsada:string|null=null
      if(!propiaSinLlave){
        const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
        llaveUsada=auth.llaveId
      }
      const {error}=await admin.from('llaves_moderacion').update({estado:'revocada',revocada_at:new Date().toISOString()}).eq('id',id)
      if(error)throw error
      await auditar(admin,user.id,llaveUsada,'revocar_llave',{llave:id,huella:llave.huella})
      if(propiaSinLlave){
        const {data:admins}=await admin.from('profiles').select('id').eq('is_admin',true)
        const pmap=await profileMap(admin,[user.id])
        const filas=(admins||[]).map((a:any)=>({user_id:a.id,tipo:'noticia',contexto:'Un moderador revocó su llave',cuerpo:`${pmap.get(user.id)?.pseudonimo||'Un moderador'} revocó la llave ${llave.huella}. Si después registra otra, confirmá con esa persona por otro medio que fue ella.`,link:'/?vista=moderacion',ref_id:id}))
        if(filas.length)await admin.from('notificaciones').insert(filas)
      }
      return json({ok:true})
    }
    case 'registroModeracion': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
      return registroModeracion(admin)
    }
    case 'soyModerador': { const rl=await rateLimit(admin,action,user.id);if(rl)return rl; return json({ok:true,esModerador:await isModerator(admin,user.id),esAdmin:await isAdmin(admin,user.id)}) }
    case 'listarModeradores': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
      const {data:equipo,error}=await admin.from('profiles').select('id,pseudonimo,is_moderator,is_admin').or('is_moderator.eq.true,is_admin.eq.true').order('pseudonimo')
      if(error)throw error
      const miembros=[]
      for(const m of equipo||[]){
        const u=await admin.auth.admin.getUserById(String(m.id))
        const email=u.data.user?.email||''
        miembros.push({email,pseudonimo:m.pseudonimo,rol:m.is_admin?'admin':'moderador',oficial:email.toLowerCase()===CUENTA_OFICIAL,vos:String(m.id)===user.id})
      }
      return json({ok:true,moderadores:miembros})
    }
    case 'asignarModerador': {
      // Da rol de moderador o de administrador. Un admin nuevo igual necesita una llave de admin, que solo se
      // activa por SQL desde el dashboard: dar el rol desde la web no alcanza para administrar.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
      const rol=body.rol==='admin'?'admin':'moderador'
      const email=String(body.email||'').trim().toLowerCase()
      const u=await findUserByEmail(admin,email);if(!u)return json({ok:false,error:'no_encontrado'})
      const cambios=rol==='admin'?{is_admin:true}:{is_moderator:true}
      const {error}=await admin.from('profiles').update(cambios).eq('id',u.id).select('id').single()
      if(error)throw error
      await auditar(admin,user.id,auth.llaveId,rol==='admin'?'asignar_admin':'asignar_moderador',{usuario:String(u.id)})
      return json({ok:true})
    }
    case 'quitarModerador': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
      const rol=body.rol==='admin'?'admin':'moderador'
      const email=String(body.email||'').trim().toLowerCase()
      const u=await findUserByEmail(admin,email);if(!u)return json({ok:false,error:'no_encontrado'})
      if(String(u.email).toLowerCase()===CUENTA_OFICIAL)return json({ok:false,error:'cuenta_oficial'})
      if(rol==='admin'){
        if(String(u.id)===user.id)return json({ok:false,error:'no_quitarte_admin'})
        const {count,error:errCount}=await admin.from('profiles').select('id',{count:'exact',head:true}).eq('is_admin',true)
        if(errCount)throw errCount
        if((count||0)<=1)return json({ok:false,error:'ultimo_admin'})
      }
      const cambios=rol==='admin'?{is_admin:false}:{is_moderator:false}
      const {error}=await admin.from('profiles').update(cambios).eq('id',u.id)
      if(error)throw error
      // Sin el rol, sus llaves de ese rol dejan de servir.
      await admin.from('llaves_moderacion').update({estado:'revocada',revocada_at:new Date().toISOString()}).eq('user_id',u.id).eq('rol',rol).neq('estado','revocada')
      await auditar(admin,user.id,auth.llaveId,rol==='admin'?'quitar_admin':'quitar_moderador',{usuario:String(u.id)})
      return json({ok:true})
    }
    case 'listarDenuncias': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const {data,error}=await admin.from('denuncias').select('id,tipo,id_publicacion,motivo,created_at').eq('estado','pendiente').order('created_at',{ascending:true}).limit(100)
      if(error)throw error
      return json({ok:true,denuncias:await enriquecerDenuncias(admin,data||[])})
    }
    case 'resolverDenuncia': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const id=uuidOrEmpty(body.id),accion=String(body.decision||'')
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
      await auditar(admin,user.id,auth.llaveId,'resolver_denuncia',{id,accion})
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
    const bytes = await leerBytesConTope(req as unknown as Response, MAX_BODY_BYTES + 1)
    if (bytes.length > MAX_BODY_BYTES) return json({ ok: false, error: 'imagen_muy_grande' }, 413)
    const texto = new TextDecoder().decode(bytes)
    let body: any = {}
    try { body = JSON.parse(texto) } catch { body = {} }
    if (!body || typeof body !== 'object' || Array.isArray(body)) body = {}
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

