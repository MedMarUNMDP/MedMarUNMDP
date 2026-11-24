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

// Versión vigente de los Términos y la Política de Privacidad (web/terminos/ y web/privacidad/). Al cambiarla, la web
// le vuelve a pedir la aceptación a todas las cuentas. Tiene que coincidir con TERMINOS_VERSION de web/js/app.js.
const TERMINOS_VERSION = '2026-11-23.2'
const DIAS_ARREPENTIMIENTO_BAJA = 30

// ==================== CLASIFICADOS (COMPRA VENTA) ====================
// En la web se llama «Compra venta». Sección aparte del foro para que estudiantes vendan u ofrezcan, a título personal, cosas de la carrera.
// Nada de empresas ni negocios: eso lo dicen los Términos (sección 4) y lo hace cumplir la moderación por denuncias.
const CATEGORIAS_CLASIFICADOS = ['resumenes', 'clases', 'equipo', 'libros', 'servicios', 'otros']
const MAX_CLASIFICADOS_ACTIVOS = 5
const DIAS_CLASIFICADO = 60

function textoClasificado(valor: unknown, max: number) {
  return String(valor ?? '').normalize('NFC').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max + 1)
}

async function listarClasificados(admin: SupabaseClient, user: any) {
  const ahora = new Date().toISOString()
  const [pub, mios] = await Promise.all([
    admin.from('clasificados').select('id,autor_id,categoria,titulo,descripcion,precio,contacto,created_at,expira_at')
      .eq('activo', true).is('eliminado_at', null).gt('expira_at', ahora).order('created_at', { ascending: false }).limit(150),
    admin.from('clasificados').select('id,categoria,titulo,descripcion,precio,contacto,activo,created_at,expira_at')
      .eq('autor_id', user.id).is('eliminado_at', null).order('created_at', { ascending: false }).limit(20),
  ])
  if (pub.error) throw pub.error
  if (mios.error) throw mios.error
  const autores = await profileMap(admin, (pub.data || []).map((c: any) => String(c.autor_id)))
  const clasificados = (pub.data || []).map((c: any) => {
    const a = autores.get(String(c.autor_id))
    const { autor_id, ...resto } = c
    return { ...resto, autor: a?.pseudonimo || 'Estudiante', foto: a?.foto_url || '', esMio: String(autor_id) === user.id }
  })
  const misClasificados = (mios.data || []).map((c: any) => ({ ...c, vencido: c.expira_at <= ahora }))
  return json({ ok: true, clasificados, misClasificados, chats: await chatsCompraVenta(admin, user) })
}

// Conversaciones de Compra venta de la persona (interesado_id no null), con quién es la otra parte.
async function chatsCompraVenta(admin: SupabaseClient, user: any) {
  const { data: mias, error } = await admin.from('conversacion_participantes').select('conversacion_id').eq('user_id', user.id).limit(300)
  if (error) throw error
  const ids = (mias || []).map((p: any) => String(p.conversacion_id))
  if (!ids.length) return []
  const { data: convs, error: cErr } = await admin.from('conversaciones')
    .select('id,materia,ultima_actividad,cantidad_mensajes,clasificado_id,interesado_id')
    .in('id', ids).not('interesado_id', 'is', null).order('ultima_actividad', { ascending: false }).limit(50)
  if (cErr) throw cErr
  if (!convs?.length) return []
  const { data: parts, error: pErr } = await admin.from('conversacion_participantes').select('conversacion_id,user_id')
    .in('conversacion_id', convs.map((c: any) => c.id)).neq('user_id', user.id)
  if (pErr) throw pErr
  const otro = new Map((parts || []).map((p: any) => [String(p.conversacion_id), String(p.user_id)]))
  const perfiles = await profileMap(admin, [...otro.values()])
  return convs.map((c: any) => {
    const p = perfiles.get(otro.get(String(c.id)) || '')
    return {
      id: String(c.id), titulo: String(c.materia || '').replace(/^Compra venta · /, ''), con: p?.pseudonimo || 'Cuenta eliminada',
      foto: p?.foto_url || '', soyVendedor: String(c.interesado_id) !== user.id, avisoActivo: !!c.clasificado_id,
      ultimaActividad: c.ultima_actividad, cantidadMensajes: Number(c.cantidad_mensajes || 0),
    }
  })
}

// Abre (o crea) el chat entre quien publicó el aviso y quien le quiere escribir. Uno por aviso y por interesado.
async function contactarClasificado(admin: SupabaseClient, user: any, body: any) {
  const id = uuidOrEmpty(body.id)
  if (!id) return json({ ok: false, error: 'datos_invalidos' })
  const { data: aviso, error } = await admin.from('clasificados').select('id,autor_id,titulo,activo,expira_at,eliminado_at').eq('id', id).maybeSingle()
  if (error) throw error
  if (!aviso || !aviso.activo || aviso.eliminado_at || new Date(aviso.expira_at) <= new Date()) return json({ ok: false, error: 'no_encontrado' })
  if (String(aviso.autor_id) === user.id) return json({ ok: false, error: 'clasificado_propio' })
  const buscar = () => admin.from('conversaciones').select('id').eq('clasificado_id', id).eq('interesado_id', user.id).maybeSingle()
  const { data: previa, error: prevErr } = await buscar()
  if (prevErr) throw prevErr
  if (previa) return json({ ok: true, conversacionId: String(previa.id) })
  const { data: conv, error: insErr } = await admin.from('conversaciones')
    .insert({ materia: ('Compra venta · ' + aviso.titulo).slice(0, 140), clasificado_id: id, interesado_id: user.id }).select('id').single()
  if (insErr) {
    if (pgCode(insErr) === '23505') { const { data: otra } = await buscar(); if (otra) return json({ ok: true, conversacionId: String(otra.id) }) }
    throw insErr
  }
  const { error: partErr } = await admin.from('conversacion_participantes').insert([
    { conversacion_id: conv.id, user_id: user.id }, { conversacion_id: conv.id, user_id: aviso.autor_id },
  ])
  if (partErr) { await admin.from('conversaciones').delete().eq('id', conv.id); throw partErr }
  return json({ ok: true, conversacionId: String(conv.id), nuevo: true })
}

async function publicarClasificado(admin: SupabaseClient, user: any, body: any) {
  const categoria = String(body.categoria || '')
  if (!CATEGORIAS_CLASIFICADOS.includes(categoria)) return json({ ok: false, error: 'datos_invalidos' })
  if (body.declaracion !== true) return json({ ok: false, error: 'declaracion_clasificado' })
  const titulo = textoClasificado(body.titulo, 100).replace(/\s+/g, ' ')
  const descripcion = textoClasificado(body.descripcion, 1500)
  const precio = textoClasificado(body.precio, 40).replace(/\s+/g, ' ') || null
  const contacto = textoClasificado(body.contacto, 120).replace(/\s+/g, ' ') || null
  if (titulo.length < 3 || titulo.length > 100) return json({ ok: false, error: 'clasificado_titulo' })
  if (descripcion.length < 10 || descripcion.length > 1500) return json({ ok: false, error: 'clasificado_descripcion' })
  if ((precio && precio.length > 40) || (contacto && contacto.length > 120)) return json({ ok: false, error: 'datos_invalidos' })
  const operationId = uuidOrEmpty(body.operationId)
  if (!operationId) return json({ ok: false, error: 'datos_invalidos' })
  const { count, error: cErr } = await admin.from('clasificados').select('id', { count: 'exact', head: true })
    .eq('autor_id', user.id).eq('activo', true).gt('expira_at', new Date().toISOString())
  if (cErr) throw cErr
  if (Number(count || 0) >= MAX_CLASIFICADOS_ACTIVOS) return json({ ok: false, error: 'clasificados_maximo' })
  const { data, error } = await admin.from('clasificados').insert({
    autor_id: user.id, categoria, titulo, descripcion, precio, contacto, operation_id: operationId,
  }).select('id').single()
  if (error) {
    if (pgCode(error) === '23505') return json({ ok: true, repetido: true })
    throw error
  }
  return json({ ok: true, id: String(data.id) })
}

async function gestionarClasificado(admin: SupabaseClient, user: any, body: any) {
  const id = uuidOrEmpty(body.id), accion = String(body.accion || '')
  if (!id || !['pausar', 'activar', 'renovar', 'borrar'].includes(accion)) return json({ ok: false, error: 'datos_invalidos' })
  const { data: c, error } = await admin.from('clasificados').select('id,autor_id,activo,expira_at,eliminado_at').eq('id', id).maybeSingle()
  if (error) throw error
  if (!c || c.eliminado_at || String(c.autor_id) !== user.id) return json({ ok: false, error: 'no_encontrado' })
  if (accion === 'borrar') {
    const { error: e } = await admin.from('clasificados').delete().eq('id', id)
    if (e) throw e
    return json({ ok: true })
  }
  const ahora = new Date()
  const vigente = new Date(c.expira_at) > ahora
  if (accion === 'activar' || accion === 'renovar') {
    const { count, error: cErr } = await admin.from('clasificados').select('id', { count: 'exact', head: true })
      .eq('autor_id', user.id).eq('activo', true).gt('expira_at', ahora.toISOString()).neq('id', id)
    if (cErr) throw cErr
    if (Number(count || 0) >= MAX_CLASIFICADOS_ACTIVOS) return json({ ok: false, error: 'clasificados_maximo' })
  }
  const cambios: Record<string, unknown> = { updated_at: ahora.toISOString() }
  if (accion === 'pausar') cambios.activo = false
  if (accion === 'activar') { cambios.activo = true; if (!vigente) cambios.expira_at = new Date(ahora.getTime() + DIAS_CLASIFICADO * 86400000).toISOString() }
  if (accion === 'renovar') { cambios.activo = true; cambios.expira_at = new Date(ahora.getTime() + DIAS_CLASIFICADO * 86400000).toISOString() }
  const { error: upErr } = await admin.from('clasificados').update(cambios).eq('id', id)
  if (upErr) throw upErr
  return json({ ok: true })
}

const RATE_LIMITS: Record<string, [number, number]> = {
  aceptarTerminos: [10, 600],
  autorizarDispositivo: [10, 3600],
  guardarGrupoModeracion: [30, 3600],
  borrarGrupoModeracion: [30, 3600],
  asignarPeriodoModerador: [60, 3600],
  listarPapelera: [60, 600],
  enviarReporte: [5, 3600],
  listarReportes: [60, 600],
  gestionarReporte: [120, 600],
  preferenciaMailsModeracion: [20, 3600],
  restaurarPapelera: [60, 600],
  crearEmparejamiento: [10, 600],
  completarEmparejamiento: [10, 3600],
  renunciarModeracion: [5, 3600],
  solicitarBaja: [5, 3600],
  cancelarBaja: [10, 3600],
  listarClasificados: [60, 300],
  publicarClasificado: [6, 3600],
  gestionarClasificado: [30, 600],
  quitarClasificado: [60, 600],
  contactarClasificado: [20, 3600],
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
  ocultarPuntaje: [60, 600],
  estadisticasRanking: [30, 600],
  votarEncuesta: [60, 600],
  puntajesOcultos: [60, 600],
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
// Los archivos viven en otros sitios: acá solo se guardan enlaces. Los aportes de estudiantes pasan por
// revisión de moderadores. Ver supabase/migrations/20261123220000_material_estudio.sql y 20261126150000.

const TIPOS_MATERIAL = ['resumen', 'apunte', 'guia', 'presentacion', 'video', 'flashcards', 'mapa', 'web', 'examen', 'libro', 'otro']

// Sitios admitidos para material (lista cerrada, decisión 2026-11): plataformas legales donde estudiantes y docentes
// publican su propio contenido, más bibliografía y fuentes oficiales. Un dominio admite también sus subdominios
// (canva.site → miresumen.my.canva.site). Esta lista es la única fuente: la web la recibe con listarMateriales.
// Quedan afuera a propósito: Mega, MediaFire, 4shared, Scribd, Studocu, Z-Library/LibGen, Internet Archive
// (concentran copias de libros y apuntes con copyright) y los acortadores (bit.ly, tinyurl…: esconden el destino).
const SITIOS_MATERIAL: [string, string, string][] = [
  // [dominio, nombre visible, categoría]
  ['drive.google.com', 'Google Drive', 'Archivos y documentos'],
  ['docs.google.com', 'Google Docs', 'Archivos y documentos'],
  ['onedrive.live.com', 'OneDrive', 'Archivos y documentos'],
  ['1drv.ms', 'OneDrive', 'Archivos y documentos'],
  ['dropbox.com', 'Dropbox', 'Archivos y documentos'],
  ['box.com', 'Box', 'Archivos y documentos'],
  ['icloud.com', 'iCloud', 'Archivos y documentos'],
  ['github.com', 'GitHub', 'Archivos y documentos'],

  ['canva.com', 'Canva', 'Presentaciones y diseño'],
  ['canva.site', 'Canva', 'Presentaciones y diseño'],
  ['genially.com', 'Genially', 'Presentaciones y diseño'],
  ['genial.ly', 'Genially', 'Presentaciones y diseño'],
  ['prezi.com', 'Prezi', 'Presentaciones y diseño'],
  ['slides.com', 'Slides', 'Presentaciones y diseño'],
  ['pitch.com', 'Pitch', 'Presentaciones y diseño'],
  ['gamma.app', 'Gamma', 'Presentaciones y diseño'],
  ['sway.cloud.microsoft', 'Sway', 'Presentaciones y diseño'],
  ['sway.office.com', 'Sway', 'Presentaciones y diseño'],
  ['slideshare.net', 'SlideShare', 'Presentaciones y diseño'],
  ['figma.com', 'Figma', 'Presentaciones y diseño'],

  ['notion.site', 'Notion', 'Notas y páginas web'],
  ['notion.so', 'Notion', 'Notas y páginas web'],
  ['sites.google.com', 'Google Sites', 'Notas y páginas web'],
  ['gitbook.io', 'GitBook', 'Notas y páginas web'],
  ['coda.io', 'Coda', 'Notas y páginas web'],
  ['publish.obsidian.md', 'Obsidian Publish', 'Notas y páginas web'],
  ['craft.me', 'Craft', 'Notas y páginas web'],
  ['craft.do', 'Craft', 'Notas y páginas web'],
  ['evernote.com', 'Evernote', 'Notas y páginas web'],
  ['wixsite.com', 'Wix', 'Notas y páginas web'],
  ['weebly.com', 'Weebly', 'Notas y páginas web'],
  ['blogspot.com', 'Blogger', 'Notas y páginas web'],
  ['wordpress.com', 'WordPress', 'Notas y páginas web'],
  ['medium.com', 'Medium', 'Notas y páginas web'],
  ['substack.com', 'Substack', 'Notas y páginas web'],
  ['github.io', 'GitHub Pages', 'Notas y páginas web'],
  ['netlify.app', 'Netlify', 'Notas y páginas web'],
  ['vercel.app', 'Vercel', 'Notas y páginas web'],
  ['pages.dev', 'Cloudflare Pages', 'Notas y páginas web'],
  ['carrd.co', 'Carrd', 'Notas y páginas web'],
  ['jimdosite.com', 'Jimdo', 'Notas y páginas web'],
  ['webnode.page', 'Webnode', 'Notas y páginas web'],

  ['quizlet.com', 'Quizlet', 'Tarjetas y cuestionarios'],
  ['ankiweb.net', 'AnkiWeb', 'Tarjetas y cuestionarios'],
  ['brainscape.com', 'Brainscape', 'Tarjetas y cuestionarios'],
  ['goconqr.com', 'GoConqr', 'Tarjetas y cuestionarios'],
  ['wordwall.net', 'Wordwall', 'Tarjetas y cuestionarios'],
  ['educaplay.com', 'Educaplay', 'Tarjetas y cuestionarios'],
  ['kahoot.it', 'Kahoot!', 'Tarjetas y cuestionarios'],
  ['kahoot.com', 'Kahoot!', 'Tarjetas y cuestionarios'],
  ['quizizz.com', 'Quizizz', 'Tarjetas y cuestionarios'],
  ['wayground.com', 'Wayground (Quizizz)', 'Tarjetas y cuestionarios'],
  ['liveworksheets.com', 'Liveworksheets', 'Tarjetas y cuestionarios'],
  ['h5p.com', 'H5P', 'Tarjetas y cuestionarios'],
  ['cerebriti.com', 'Cerebriti', 'Tarjetas y cuestionarios'],
  ['forms.office.com', 'Microsoft Forms', 'Tarjetas y cuestionarios'],

  ['padlet.com', 'Padlet', 'Mapas y pizarras'],
  ['miro.com', 'Miro', 'Mapas y pizarras'],
  ['mindmeister.com', 'MindMeister', 'Mapas y pizarras'],
  ['coggle.it', 'Coggle', 'Mapas y pizarras'],
  ['lucid.app', 'Lucidchart', 'Mapas y pizarras'],
  ['lucidchart.com', 'Lucidchart', 'Mapas y pizarras'],
  ['whimsical.com', 'Whimsical', 'Mapas y pizarras'],
  ['xmind.ai', 'Xmind', 'Mapas y pizarras'],
  ['xmind.works', 'Xmind', 'Mapas y pizarras'],
  ['diagrams.net', 'diagrams.net', 'Mapas y pizarras'],
  ['excalidraw.com', 'Excalidraw', 'Mapas y pizarras'],
  ['mural.co', 'Mural', 'Mapas y pizarras'],
  ['creately.com', 'Creately', 'Mapas y pizarras'],
  ['mindomo.com', 'Mindomo', 'Mapas y pizarras'],

  ['youtube.com', 'YouTube', 'Videos y podcasts'],
  ['youtu.be', 'YouTube', 'Videos y podcasts'],
  ['vimeo.com', 'Vimeo', 'Videos y podcasts'],
  ['loom.com', 'Loom', 'Videos y podcasts'],
  ['ted.com', 'TED', 'Videos y podcasts'],
  ['open.spotify.com', 'Spotify', 'Videos y podcasts'],
  ['podcasts.apple.com', 'Apple Podcasts', 'Videos y podcasts'],
  ['ivoox.com', 'iVoox', 'Videos y podcasts'],
  ['soundcloud.com', 'SoundCloud', 'Videos y podcasts'],

  ['edu.ar', 'Universidad argentina (.edu.ar)', 'Bibliografía y fuentes oficiales'],
  ['gob.ar', 'Organismo público argentino (.gob.ar)', 'Bibliografía y fuentes oficiales'],
  ['who.int', 'OMS', 'Bibliografía y fuentes oficiales'],
  ['paho.org', 'OPS', 'Bibliografía y fuentes oficiales'],
  ['cdc.gov', 'CDC', 'Bibliografía y fuentes oficiales'],
  ['nih.gov', 'NIH / PubMed', 'Bibliografía y fuentes oficiales'],
  ['medlineplus.gov', 'MedlinePlus', 'Bibliografía y fuentes oficiales'],
  ['ecdc.europa.eu', 'ECDC', 'Bibliografía y fuentes oficiales'],
  ['scielo.org', 'SciELO', 'Bibliografía y fuentes oficiales'],
  ['scielo.org.ar', 'SciELO Argentina', 'Bibliografía y fuentes oficiales'],
  ['scielo.br', 'SciELO Brasil', 'Bibliografía y fuentes oficiales'],
  ['redalyc.org', 'Redalyc', 'Bibliografía y fuentes oficiales'],
  ['dialnet.unirioja.es', 'Dialnet', 'Bibliografía y fuentes oficiales'],
  ['doi.org', 'DOI', 'Bibliografía y fuentes oficiales'],
  ['scholar.google.com', 'Google Académico', 'Bibliografía y fuentes oficiales'],
  ['sciencedirect.com', 'ScienceDirect', 'Bibliografía y fuentes oficiales'],
  ['elsevier.es', 'Elsevier', 'Bibliografía y fuentes oficiales'],
  ['springer.com', 'Springer', 'Bibliografía y fuentes oficiales'],
  ['nature.com', 'Nature', 'Bibliografía y fuentes oficiales'],
  ['nejm.org', 'NEJM', 'Bibliografía y fuentes oficiales'],
  ['bmj.com', 'BMJ', 'Bibliografía y fuentes oficiales'],
  ['thelancet.com', 'The Lancet', 'Bibliografía y fuentes oficiales'],
  ['jamanetwork.com', 'JAMA', 'Bibliografía y fuentes oficiales'],
  ['plos.org', 'PLOS', 'Bibliografía y fuentes oficiales'],
  ['frontiersin.org', 'Frontiers', 'Bibliografía y fuentes oficiales'],
  ['cochranelibrary.com', 'Cochrane', 'Bibliografía y fuentes oficiales'],
  ['biorxiv.org', 'bioRxiv', 'Bibliografía y fuentes oficiales'],
  ['medrxiv.org', 'medRxiv', 'Bibliografía y fuentes oficiales'],
  ['zenodo.org', 'Zenodo', 'Bibliografía y fuentes oficiales'],
  ['researchgate.net', 'ResearchGate', 'Bibliografía y fuentes oficiales'],
  ['msdmanuals.com', 'Manual MSD', 'Bibliografía y fuentes oficiales'],
  ['merckmanuals.com', 'Manual Merck', 'Bibliografía y fuentes oficiales'],
  ['radiopaedia.org', 'Radiopaedia', 'Bibliografía y fuentes oficiales'],
  ['kenhub.com', 'Kenhub', 'Bibliografía y fuentes oficiales'],
  ['teachmeanatomy.info', 'TeachMeAnatomy', 'Bibliografía y fuentes oficiales'],
  ['teachmephysiology.com', 'TeachMePhysiology', 'Bibliografía y fuentes oficiales'],
  ['geekymedics.com', 'Geeky Medics', 'Bibliografía y fuentes oficiales'],
  ['osmosis.org', 'Osmosis', 'Bibliografía y fuentes oficiales'],
  ['khanacademy.org', 'Khan Academy', 'Bibliografía y fuentes oficiales'],
  ['wikipedia.org', 'Wikipedia', 'Bibliografía y fuentes oficiales'],
  ['libretexts.org', 'LibreTexts', 'Bibliografía y fuentes oficiales'],
  ['openstax.org', 'OpenStax', 'Bibliografía y fuentes oficiales'],
]

// Sitios donde cualquiera crea una página gratis y la puede cambiar después de aprobada: se admiten (muchos alumnos
// publican ahí sus resúmenes), pero la web los marca como «página externa» y el moderador lo ve al revisar.
const SITIOS_ALOJAMIENTO_LIBRE = new Set([
  'github.io', 'netlify.app', 'vercel.app', 'pages.dev', 'wixsite.com', 'weebly.com', 'blogspot.com', 'wordpress.com',
  'carrd.co', 'jimdosite.com', 'webnode.page', 'notion.site', 'canva.site', 'gitbook.io', 'medium.com', 'substack.com',
  'craft.me', 'publish.obsidian.md', 'github.com', 'sites.google.com',
])

function sitioMaterial(host: string) {
  const h = host.toLowerCase().replace(/\.$/, '')
  // El dominio más largo que coincide gana (scielo.org.ar antes que un sufijo más corto).
  let mejor: [string, string, string] | null = null
  for (const s of SITIOS_MATERIAL) if ((h === s[0] || h.endsWith('.' + s[0])) && (!mejor || s[0].length > mejor[0].length)) mejor = s
  return mejor
}

// Forma canónica: mismo archivo de Drive/Docs o mismo video de YouTube = mismo enlace (para detectar duplicados).
// Sin fragmento ni parámetros de rastreo.
function canonizarLinkMaterial(u: URL) {
  u.hash = ''
  for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|igshid$|si$|usp$|ref$|ref_src$)/i.test(k)) u.searchParams.delete(k)
  const host = u.hostname.toLowerCase()
  let m: RegExpMatchArray | null
  if (host === 'drive.google.com') {
    const idArchivo = u.pathname.match(/\/file\/d\/([\w-]{10,})/)?.[1] || (/^\/(open|uc)$/.test(u.pathname) ? u.searchParams.get('id') : null)
    if (idArchivo && /^[\w-]{10,}$/.test(idArchivo)) return 'https://drive.google.com/file/d/' + idArchivo + '/view'
    if ((m = u.pathname.match(/\/folders\/([\w-]{10,})/))) return 'https://drive.google.com/drive/folders/' + m[1]
  }
  if (host === 'docs.google.com' && (m = u.pathname.match(/^\/(document|presentation|spreadsheets|forms)\/d\/([\w-]{10,})(\/|$)/)) && m[2] !== 'e')
    return 'https://docs.google.com/' + m[1] + '/d/' + m[2] + '/edit'
  if (host === 'youtu.be' && (m = u.pathname.match(/^\/([\w-]{6,})/))) return 'https://www.youtube.com/watch?v=' + m[1]
  if ((host === 'youtube.com' || host.endsWith('.youtube.com'))) {
    const v = u.searchParams.get('v')
    if (u.pathname === '/watch' && v && /^[\w-]{6,}$/.test(v)) return 'https://www.youtube.com/watch?v=' + v
    if ((m = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/))) return 'https://www.youtube.com/watch?v=' + m[2]
  }
  return u.toString()
}

// Enlace de material: https, sin usuario/contraseña ni puerto, de un sitio admitido. Devuelve '' si vino vacío,
// { error } si no se acepta, o { link, sitio } con el enlace canónico.
function linkMaterialValido(valor: unknown): '' | { error: string, dominio?: string } | { link: string, sitio: string } {
  const texto = String(valor || '').trim()
  if (!texto) return ''
  if (texto.length > 600) return { error: 'link_invalido' }
  let u: URL
  try { u = new URL(texto) } catch { return { error: 'link_invalido' } }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return { error: 'link_invalido' }
  u.hostname = u.hostname.replace(/\.$/, '')
  if (/^[\d.]+$/.test(u.hostname) || u.hostname.includes(':')) return { error: 'link_invalido' }
  const sitio = sitioMaterial(u.hostname)
  if (!sitio) return { error: 'sitio_no_permitido', dominio: u.hostname.toLowerCase().slice(0, 80) }
  let ruta = u.pathname
  try { ruta = decodeURIComponent(u.pathname) } catch { return { error: 'link_invalido' } }
  // Descargas directas de programas o comprimidos: nunca son material de estudio (y esconden malware).
  if (/\.(exe|msi|msix|appx|apk|bat|cmd|com|scr|dmg|pkg|jar|ps1|vbs|js|hta|lnk|reg|iso|img|zip|rar|7z|tar|gz)$/i.test(ruta.replace(/\/+$/, ''))) return { error: 'link_invalido' }
  // Redirecciones de sitios admitidos (medium.com/r/?url=…, docs.google.com/url?q=…): llevarían a cualquier lado.
  if (/^\/(r|url|redirect|scholar_url|out|outbound|l|link|away|exit)(\/|$)/i.test(ruta)) return { error: 'link_invalido' }
  for (const v of u.searchParams.values()) if (/^\s*(https?:|\/\/)|%3A%2F%2F/i.test(v)) return { error: 'link_invalido' }
  const link = canonizarLinkMaterial(u)
  if (link.length > 300) return { error: 'link_largo' }
  return { link, sitio: sitio[1] }
}

function sitiosMaterialPublicos() {
  return SITIOS_MATERIAL.map(([dominio, nombre, categoria]) => ({ dominio, nombre, categoria, libre: SITIOS_ALOJAMIENTO_LIBRE.has(dominio) }))
}

// Aviso agrupado a moderadores: una sola notificación sin leer por moderador, con la cantidad acumulada.
const REF_AVISO_APORTES = '00000000-0000-4000-8000-00000a9047e5'
const REF_AVISO_DENUNCIAS = '00000000-0000-4000-8000-0000000de0c1'
const REF_AVISO_REPORTES = '00000000-0000-4000-8000-00000e9047e5'

// Mails al equipo (cola notificacion_queue → función maintenance → Gmail). Como mucho uno por tema cada
// HORAS_ENTRE_MAILS_EQUIPO por persona, así una ola de denuncias no llena la casilla (ni el cupo diario de Gmail).
const HORAS_ENTRE_MAILS_EQUIPO = 4
const MAIL_EQUIPO: Record<string, { asunto: string, pestania: string }> = {
  [REF_AVISO_APORTES]: { asunto: 'Hay aportes de material para revisar', pestania: 'aportes' },
  [REF_AVISO_DENUNCIAS]: { asunto: 'Hay denuncias para revisar', pestania: 'denuncias' },
  [REF_AVISO_REPORTES]: { asunto: 'Llegaron reportes o sugerencias', pestania: 'reportes' },
}
async function encolarMailEquipo(admin: SupabaseClient, userId: string, ref: string, resumen: string, ultimo: string) {
  const conf = MAIL_EQUIPO[ref]
  if (!conf) return
  const tipo = 'equipo_' + conf.pestania
  const desde = new Date(Date.now() - HORAS_ENTRE_MAILS_EQUIPO * 3600000).toISOString()
  const { data: previo, error: pErr } = await admin.from('notificacion_queue').select('id').eq('user_id', userId).eq('tipo', tipo).gt('created_at', desde).limit(1)
  if (pErr) { console.warn('mail_equipo', pErr.message); return }
  if ((previo || []).length) return
  const cuerpo = [
    resumen + '.',
    '',
    'Último: ' + ultimo.replace(/\s+/g, ' ').slice(0, 300),
    '',
    'Revisalo en el panel de moderación:',
    'https://medmar.com.ar/?vista=moderacion&pestania=' + conf.pestania,
    '',
    '—',
    'Te llega porque sos parte del equipo de moderación de MedMar. Mientras haya novedades te escribimos como mucho',
    'una vez cada ' + HORAS_ENTRE_MAILS_EQUIPO + ' horas por tema. Podés apagar estos mails en Moderación → Mi llave.',
  ].join('\n')
  const { error } = await admin.from('notificacion_queue').insert({ user_id: userId, tipo, asunto: 'MedMar · ' + conf.asunto, cuerpo })
  if (error) console.warn('mail_equipo', error.message)
}

async function avisarModeradores(admin: SupabaseClient, tipo: 'aporte' | 'denuncia', ref: string,
  texto: (cantidad: number) => string, ultimo: string, excepto = '') {
  const { data: equipo, error } = await admin.from('profiles').select('id,is_admin,moderador_vence_at,mails_moderacion').or('is_moderator.eq.true,is_admin.eq.true').limit(200)
  if (error) { console.warn('aviso_moderadores', error.message); return }
  const mods = (equipo || []).filter((m: any) => m.is_admin || moderadorVigente(m.moderador_vence_at))
  for (const m of mods) {
    if (String(m.id) === excepto) continue
    // Dos intentos: si otro aviso creó la notificación entre la lectura y el insert (23505), se vuelve a leer y se suma.
    for (let intento = 0; intento < 2; intento++) {
      const { data: previa } = await admin.from('notificaciones').select('id,cantidad')
        .eq('user_id', m.id).eq('tipo', tipo).eq('ref_id', ref).eq('leida', false).maybeSingle()
      const cantidad = Number(previa?.cantidad || 0) + 1
      const fila = { contexto: texto(cantidad).slice(0, 160), cuerpo: ('Último: ' + ultimo).slice(0, 400), cantidad, updated_at: new Date().toISOString() }
      const res = previa
        ? await admin.from('notificaciones').update(fila).eq('id', previa.id)
        : await admin.from('notificaciones').insert({ user_id: m.id, tipo, ref_id: ref, ...fila })
      if (!res.error) { if (m.mails_moderacion !== false) await encolarMailEquipo(admin, String(m.id), ref, fila.contexto, ultimo); break }
      if (pgCode(res.error) !== '23505' || intento) { console.warn('aviso_moderadores', res.error.message); break }
    }
  }
}

// ---------- Reportes (bugs, sugerencias, correcciones) ----------
// Anónimos: no se guarda quién lo mandó. La sesión solo sirve para el rate limit.
const TIPOS_REPORTE: Record<string, string> = { bug: 'Bug', sugerencia: 'Sugerencia', correccion: 'Corrección de contenido', otro: 'Otro' }
const ESTADOS_REPORTE = ['nuevo', 'revisando', 'resuelto', 'descartado']
function textoReporte(valor: unknown, max: number, multilinea = false) {
  const limpio = String(valor || '').replace(multilinea ? /[\u0000-\u0008\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g, ' ').trim()
  return limpio.slice(0, max)
}
async function enviarReporte(admin: SupabaseClient, user: User, body: any) {
  if (String(body.website || '')) return json({ ok: true })  // campo trampa: bots
  const crudo = String(body.tipo || '')
  const tipo = TIPOS_REPORTE[crudo] ? crudo : (Object.keys(TIPOS_REPORTE).find((k) => TIPOS_REPORTE[k] === crudo) || '')
  const mensaje = textoReporte(body.mensaje, 2000, true)
  if (!tipo || mensaje.length < 10) return json({ ok: false, error: 'datos_invalidos' })
  const fila = {
    tipo, mensaje, seccion: textoReporte(body.seccion, 60) || 'General', origen: body.origen === 'juego' ? 'juego' : 'web',
    version: textoReporte(body.version, 80) || null, detalle: textoReporte(body.detalle, 200) || null, dispositivo: textoReporte(body.dispositivo, 200) || null,
  }
  const { error } = await admin.from('reportes').insert(fila)
  if (error) throw error
  await avisarModeradores(admin, 'denuncia', REF_AVISO_REPORTES,
    (n) => n === 1 ? 'Llegó un reporte o sugerencia' : 'Llegaron ' + n + ' reportes o sugerencias',
    TIPOS_REPORTE[tipo] + ' · ' + fila.seccion + ' · ' + mensaje.slice(0, 200), user.id)
  return json({ ok: true })
}
async function listarReportes(admin: SupabaseClient, body: any) {
  const filtro = String(body.estado || 'abiertos')
  let q = admin.from('reportes').select('id,tipo,seccion,mensaje,origen,version,detalle,dispositivo,estado,nota,revisado_por,created_at,updated_at')
    .order('created_at', { ascending: false }).limit(150)
  if (filtro === 'abiertos') q = q.in('estado', ['nuevo', 'revisando'])
  else if (ESTADOS_REPORTE.includes(filtro)) q = q.eq('estado', filtro)
  const { data, error } = await q
  if (error) throw error
  const perfiles = await profileMap(admin, (data || []).map((r: any) => r.revisado_por).filter(Boolean).map(String))
  return json({ ok: true, reportes: (data || []).map((r: any) => ({
    id: r.id, tipo: r.tipo, tipoTexto: TIPOS_REPORTE[r.tipo] || r.tipo, seccion: r.seccion, mensaje: r.mensaje, origen: r.origen,
    version: r.version || '', detalle: r.detalle || '', dispositivo: r.dispositivo || '', estado: r.estado, nota: r.nota || '',
    revisadoPor: r.revisado_por ? (perfiles.get(String(r.revisado_por))?.pseudonimo || '—') : '', fecha: r.created_at, actualizado: r.updated_at,
  })) })
}
async function gestionarReporte(admin: SupabaseClient, user: User, llaveId: string, body: any) {
  const id = uuidOrEmpty(body.id), estado = String(body.estado || '')
  if (!id || !ESTADOS_REPORTE.includes(estado)) return json({ ok: false, error: 'datos_invalidos' })
  const cambios: Record<string, unknown> = { estado, revisado_por: user.id, updated_at: new Date().toISOString() }
  if (body.nota !== undefined) cambios.nota = textoReporte(body.nota, 400, true) || null
  const { data, error } = await admin.from('reportes').update(cambios).eq('id', id).select('id').maybeSingle()
  if (error) throw error
  if (!data) return json({ ok: false, error: 'no_encontrado' })
  await auditar(admin, user.id, llaveId, 'gestionar_reporte', { id, estado })
  return json({ ok: true })
}
function avisarModeradoresAporte(admin: SupabaseClient, titulo: string) {
  return avisarModeradores(admin, 'aporte', REF_AVISO_APORTES,
    n => n === 1 ? 'Hay un aporte de material para revisar' : 'Hay ' + n + ' aportes de material para revisar', titulo)
}

// Período de moderación (migración 20261127160000): el rol de moderador vence en profiles.moderador_vence_at.
function moderadorVigente(venceAt: string | null | undefined) {
  return !venceAt || new Date(venceAt).getTime() > Date.now()
}
// Fecha «AAAA-MM-DD» → fin de ese día en Argentina. null si no es válida, ya pasó o es de dentro de más de 3 años.
function fechaCorteDesde(valor: unknown) {
  const fecha = String(valor || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null
  const corte = new Date(fecha + 'T23:59:59-03:00')
  if (isNaN(corte.getTime()) || corte.getTime() <= Date.now() || corte.getTime() > Date.now() + 3 * 365 * 86400000) return null
  return corte.toISOString()
}
async function grupoModeracion(admin: SupabaseClient, id: string) {
  const { data, error } = await admin.from('grupos_moderacion').select('id,nombre,fecha_corte').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}
function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Qué es y de quién es una publicación (para avisarle al autor si la moderación la quita).
const NOMBRE_TIPO_PUBLICACION: Record<string, string> = { hilo: 'publicación del foro', respuesta: 'respuesta del foro', material: 'material', clasificado: 'aviso de Compra venta' }
async function datosPublicacion(admin: SupabaseClient, tipo: string, id: string): Promise<{ autor: string, titulo: string } | null> {
  if (tipo === 'hilo') {
    const { data } = await admin.from('hilos').select('autor_id,titulo').eq('id', id).maybeSingle()
    return data ? { autor: String(data.autor_id), titulo: String(data.titulo) } : null
  }
  if (tipo === 'respuesta') {
    const { data } = await admin.from('respuestas').select('autor_id,contenido').eq('id', id).maybeSingle()
    return data ? { autor: String(data.autor_id), titulo: String(data.contenido).replace(/\s+/g, ' ').slice(0, 70) } : null
  }
  if (tipo === 'clasificado') {
    const { data } = await admin.from('clasificados').select('autor_id,titulo').eq('id', id).maybeSingle()
    return data ? { autor: String(data.autor_id), titulo: String(data.titulo) } : null
  }
  if (tipo === 'material') {
    // El autor es quien mandó el aporte; si lo cargó un moderador directamente no hay a quién avisar.
    const { data } = await admin.from('materiales').select('titulo,aporte_id').eq('id', id).maybeSingle()
    if (!data?.aporte_id) return null
    const { data: ap } = await admin.from('aportes_material').select('user_id').eq('id', data.aporte_id).maybeSingle()
    return ap ? { autor: String(ap.user_id), titulo: String(data.titulo) } : null
  }
  return null
}
async function avisarAutorModeracion(admin: SupabaseClient, moderadorId: string, tipo: string, id: string,
  datos: { autor: string, titulo: string } | null, motivo: string) {
  if (!datos || datos.autor === moderadorId) return
  const que = NOMBRE_TIPO_PUBLICACION[tipo] || 'publicación'
  const { error } = await admin.from('notificaciones').insert({
    user_id: datos.autor, tipo: 'moderacion', ref_id: id, contexto: datos.titulo.slice(0, 160),
    cuerpo: ('La moderación quitó tu ' + que + '.' + (motivo ? ' Motivo: ' + motivo : ' No cumplía los Términos y Condiciones.') +
      ' Si creés que es un error, escribinos a MedMarUNMDP@gmail.com.').slice(0, 400),
    link: '/terminos/',
  })
  if (error) console.warn('aviso_moderacion_autor', error.message)
}
// ---------- Papelera: lo que quita la moderación queda 7 días oculto y se puede restaurar ----------
const TABLA_PAPELERA: Record<string, string> = { hilo: 'hilos', respuesta: 'respuestas', material: 'materiales', clasificado: 'clasificados' }
async function moverAPapelera(admin: SupabaseClient, tipo: string, id: string, moderadorId: string, motivo: string) {
  const tabla = TABLA_PAPELERA[tipo]
  if (!tabla) throw new Error('tipo_papelera')
  const marca: Record<string, unknown> = { eliminado_at: new Date().toISOString(), eliminado_por: moderadorId, motivo_eliminacion: motivo || null }
  let ids = [id]
  if (tipo === 'respuesta') {
    // Las respuestas que colgaban de esta se ocultan con ella (misma marca de tiempo: se restauran juntas).
    const { data: actual, error: e1 } = await admin.from('respuestas').select('hilo_id').eq('id', id).maybeSingle()
    if (e1) throw e1
    if (actual) {
      const { data: todas, error: e2 } = await admin.from('respuestas').select('id,parent_id').eq('hilo_id', actual.hilo_id).is('eliminado_at', null)
      if (e2) throw e2
      const hijos = new Map<string, string[]>()
      for (const r of todas || []) if (r.parent_id) { const p = String(r.parent_id); if (!hijos.has(p)) hijos.set(p, []); hijos.get(p)!.push(String(r.id)) }
      for (let i = 0; i < ids.length; i++) ids.push(...(hijos.get(ids[i]) || []))
    }
  }
  if (tipo === 'material') marca.activo = false
  const { error } = await admin.from(tabla).update(marca).in('id', ids).is('eliminado_at', null)
  if (error) throw error
  const { error: dErr } = await admin.from('denuncias').update({ estado: 'eliminada', resuelto_por: moderadorId, fecha_resolucion: new Date().toISOString() })
    .eq('id_publicacion', id).eq('estado', 'pendiente')
  if (dErr) throw dErr
}

async function listarPapelera(admin: SupabaseClient) {
  const desde = new Date(Date.now() - 8 * 86400000).toISOString()
  const [h, r, m, c] = await Promise.all([
    admin.from('hilos').select('id,autor_id,titulo,contenido,eliminado_at,eliminado_por,motivo_eliminacion').not('eliminado_at', 'is', null).gt('eliminado_at', desde).order('eliminado_at', { ascending: false }).limit(100),
    admin.from('respuestas').select('id,autor_id,contenido,parent_id,hilo_id,eliminado_at,eliminado_por,motivo_eliminacion').not('eliminado_at', 'is', null).gt('eliminado_at', desde).order('eliminado_at', { ascending: false }).limit(200),
    admin.from('materiales').select('id,titulo,materia,link,aporte_id,eliminado_at,eliminado_por,motivo_eliminacion').not('eliminado_at', 'is', null).gt('eliminado_at', desde).order('eliminado_at', { ascending: false }).limit(100),
    admin.from('clasificados').select('id,autor_id,titulo,descripcion,eliminado_at,eliminado_por,motivo_eliminacion').not('eliminado_at', 'is', null).gt('eliminado_at', desde).order('eliminado_at', { ascending: false }).limit(100),
  ])
  for (const x of [h, r, m, c]) if (x.error) throw x.error
  // De una cadena de respuestas ocultadas juntas se muestra solo la primera.
  const respuestas = (r.data || [])
  const raiz = respuestas.filter((x: any) => !respuestas.some((p: any) => String(p.id) === String(x.parent_id) && p.eliminado_at === x.eliminado_at))
  const items: any[] = [
    ...(h.data || []).map((x: any) => ({ tipo: 'hilo', id: x.id, titulo: x.titulo, detalle: x.contenido, autor: x.autor_id, ...x })),
    ...raiz.map((x: any) => ({ tipo: 'respuesta', id: x.id, titulo: 'Respuesta', detalle: x.contenido, autor: x.autor_id, ...x })),
    ...(m.data || []).map((x: any) => ({ tipo: 'material', id: x.id, titulo: x.titulo, detalle: x.materia + ' · ' + x.link, autor: null, ...x })),
    ...(c.data || []).map((x: any) => ({ tipo: 'clasificado', id: x.id, titulo: x.titulo, detalle: x.descripcion, autor: x.autor_id, ...x })),
  ]
  const perfiles = await profileMap(admin, items.flatMap((i) => [i.autor, i.eliminado_por].filter(Boolean).map(String)))
  return json({ ok: true, papelera: items.sort((a, b) => String(b.eliminado_at).localeCompare(String(a.eliminado_at))).map((i) => ({
    tipo: i.tipo, id: String(i.id), titulo: String(i.titulo || '').slice(0, 140), detalle: String(i.detalle || '').slice(0, 300),
    autor: i.autor ? (perfiles.get(String(i.autor))?.pseudonimo || 'Estudiante') : '', quitadoPor: perfiles.get(String(i.eliminado_por || ''))?.pseudonimo || '—',
    motivo: i.motivo_eliminacion || '', quitadoAt: i.eliminado_at, borraAt: new Date(new Date(i.eliminado_at).getTime() + 7 * 86400000).toISOString(),
  })) })
}

async function restaurarPapelera(admin: SupabaseClient, user: User, llaveId: string, body: any) {
  const tipo = String(body.tipo || ''), id = uuidOrEmpty(body.id)
  const tabla = TABLA_PAPELERA[tipo]
  if (!tabla || !id) return json({ ok: false, error: 'datos_invalidos' })
  const { data: fila, error } = await admin.from(tabla).select('id,eliminado_at' + (tipo === 'respuesta' ? ',hilo_id' : '')).eq('id', id).maybeSingle()
  if (error) throw error
  if (!fila || !(fila as any).eliminado_at) return json({ ok: false, error: 'no_encontrado' })
  const limpio: Record<string, unknown> = { eliminado_at: null, eliminado_por: null, motivo_eliminacion: null }
  if (tipo === 'material') limpio.activo = true
  let q = admin.from(tabla).update(limpio)
  // Respuestas: vuelven también las que se ocultaron junto con ella (misma marca de tiempo, mismo hilo).
  q = tipo === 'respuesta' ? q.eq('hilo_id', (fila as any).hilo_id).eq('eliminado_at', (fila as any).eliminado_at) : q.eq('id', id)
  const { error: upErr } = await q
  if (upErr) throw upErr
  const datos = await datosPublicacion(admin, tipo, id)
  await auditar(admin, user.id, llaveId, 'restaurar', { tipo, id })
  if (datos && datos.autor !== user.id) {
    await admin.from('notificaciones').insert({ user_id: datos.autor, tipo: 'moderacion', ref_id: id, contexto: datos.titulo.slice(0, 160),
      cuerpo: 'La moderación revisó de nuevo y restauró tu ' + (NOMBRE_TIPO_PUBLICACION[tipo] || 'publicación') + '. Ya se ve otra vez.' })
  }
  return json({ ok: true })
}

function motivoModeracion(body: any) {
  return String(body?.motivo || '').replace(/\s+/g, ' ').trim().slice(0, 200)
}
const MAX_APORTES_DIA = 5            // por persona, en 24 h
const MAX_APORTES_PENDIENTES = 5     // por persona, esperando revisión
const MAX_APORTES_PENDIENTES_TOTAL = 300
const MIN_MS_FORMULARIO = 3000       // menos que esto no lo llena una persona

function textoLimpio(valor: unknown, max: number) {
  return String(valor || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max)
}

function datosMaterial(body: any) {
  const titulo = textoLimpio(body.titulo, 120)
  const descripcion = textoLimpio(body.descripcion, 400)
  const materia = textoLimpio(body.materia, 120)
  const tipo = String(body.tipo || '')
  const l = linkMaterialValido(body.link)
  const credito = textoLimpio(body.credito, 60)
  if (titulo.length < 3 || materia.length < 2 || !TIPOS_MATERIAL.includes(tipo) || !l || 'error' in l) return null
  return { titulo, descripcion: descripcion || null, materia, tipo, link: l.link, credito: credito || null }
}

async function listarMateriales(client: SupabaseClient) {
  const { data, error } = await client.from('materiales')
    .select('id,titulo,descripcion,materia,tipo,link,credito,created_at')
    .order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  return json({ ok: true, materiales: data || [], sitios: sitiosMaterialPublicos() })
}

async function enviarAporte(user: User, admin: SupabaseClient, body: any) {
  // Trampas para bots: campo oculto con texto o formulario llenado en menos de 3 s. Se responde ok para no darles pistas.
  if (String(body.website || '').trim() || Number(body.ms) < MIN_MS_FORMULARIO) return json({ ok: true })

  const clase = body.clase === 'sugerencia' ? 'sugerencia' : 'archivo'
  const titulo = textoLimpio(body.titulo, 120)
  const descripcion = textoLimpio(body.descripcion, 1000)
  const materia = textoLimpio(body.materia, 120)
  const tipo = TIPOS_MATERIAL.includes(String(body.tipo)) ? String(body.tipo) : null
  const l = linkMaterialValido(body.link)
  if (l && 'error' in l) return json({ ok: false, error: l.error, dominio: l.dominio })
  const link = l ? l.link : ''
  if (titulo.length < 3) return json({ ok: false, error: 'datos_invalidos' })
  if (clase === 'archivo' && !link) return json({ ok: false, error: 'link_requerido' })
  // Material compartido: la persona declara que puede compartirlo (propio o de acceso libre, sin datos de pacientes).
  if (clase === 'archivo' && body.declaracion !== true) return json({ ok: false, error: 'declaracion_requerida' })
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
  await avisarModeradoresAporte(admin, titulo)
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
    let dominio = '', sitio = ''
    let libre = false
    try { const h = new URL(String(a.link || '')).hostname; dominio = h; const s = sitioMaterial(h); sitio = s?.[1] || ''; libre = !!s && SITIOS_ALOJAMIENTO_LIBRE.has(s[0]) } catch { /* sugerencia sin enlace */ }
    return { ...resto, dominio, sitio, libre, autor: pmap.get(String(user_id))?.pseudonimo || 'Estudiante' }
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
// Dispositivos (ADR 0005): el archivo autoriza un navegador (autorizarDispositivo), que guarda su propia llave no
// exportable y desde ahí desbloquea solo. Las acciones críticas de admin siguen exigiendo la llave del archivo.

const MOD_DESAFIO_MS = 2 * 60 * 1000
const MOD_SESION_MS = 30 * 60 * 1000
const MOD_MENSAJE = 'medmar-moderacion-v1|'
const MAX_LLAVES_POR_USUARIO = 2
const MOD_MENSAJE_DISPOSITIVO = 'medmar-dispositivo-v1|'
const MAX_DISPOSITIVOS_POR_USUARIO = 6
const DISPOSITIVO_INACTIVO_MS = 60 * 24 * 3600 * 1000   // sin usarse 60 días → hay que volver a autorizarlo
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
// critica = true: además exige que la sesión se haya abierto con la llave del ARCHIVO (no con un dispositivo).
async function autorizarModeracion(admin: SupabaseClient, user: User, body: any, rol: 'moderador' | 'admin', critica = false) {
  if (!(await tieneRol(admin, user.id, rol))) return json({ ok: false, error: 'no_autorizado' })
  const t = await leerTokenModeracion(body?.tokenModeracion, user.id)
  if (!t || (rol === 'admin' && t.rol !== 'admin')) return json({ ok: false, error: 'llave_requerida' })
  const { data: llave, error } = await admin.from('llaves_moderacion').select('id,user_id,rol,estado,tipo,padre_id').eq('id', t.llaveId).maybeSingle()
  if (error) throw error
  if (!llave || llave.estado !== 'activa' || String(llave.user_id) !== user.id || llave.rol !== t.rol) return json({ ok: false, error: 'llave_requerida' })
  if (critica && llave.tipo !== 'archivo') return json({ ok: false, error: 'archivo_requerido' })
  if (llave.rol === 'admin' && !(await isAdmin(admin, user.id))) return json({ ok: false, error: 'no_autorizado' })
  return { llaveId: String(llave.id), tipo: String(llave.tipo || 'archivo'), padreId: llave.padre_id ? String(llave.padre_id) : String(llave.id) }
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
    .select('id,user_id,rol,estado,public_key,tipo,padre_id,ultimo_uso,created_at').eq('huella', huella).maybeSingle()
  if (error) throw error
  if (!llave || String(llave.user_id) !== user.id) return json({ ok: false, error: 'llave_desconocida' })
  if (llave.estado === 'pendiente') return json({ ok: false, error: 'llave_pendiente' })
  if (llave.estado !== 'activa') return json({ ok: false, error: 'llave_revocada' })
  if (llave.tipo === 'dispositivo') {
    // Un dispositivo vale mientras su archivo siga activo y no pase mucho tiempo sin usarse.
    const { data: padre, error: errPadre } = await admin.from('llaves_moderacion').select('estado').eq('id', llave.padre_id).maybeSingle()
    if (errPadre) throw errPadre
    const ultimo = new Date(llave.ultimo_uso || llave.created_at).getTime()
    if (!padre || padre.estado !== 'activa' || Date.now() - ultimo > DISPOSITIVO_INACTIVO_MS) {
      await admin.from('llaves_moderacion').update({ estado: 'revocada', revocada_at: new Date().toISOString() }).eq('id', llave.id)
      await auditar(admin, user.id, String(llave.id), 'dispositivo_vencido')
      return json({ ok: false, error: 'dispositivo_vencido' })
    }
  }
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
  // Los dispositivos renuevan la sesión solos cada 30 min: no se audita cada renovación (llenaría el registro).
  if (llave.tipo !== 'dispositivo') await auditar(admin, user.id, String(llave.id), 'abrir_sesion', { rol: llave.rol })
  const { token, expira } = await crearTokenModeracion(user.id, String(llave.id), llave.rol)
  return json({ ok: true, token, rol: llave.rol, expira, tipo: llave.tipo || 'archivo' })
}

// Registra la llave pública de un dispositivo como hija de una llave de archivo (tope de dispositivos, auditoría y aviso).
async function insertarDispositivo(admin: SupabaseClient, userId: string, padre: { id: string, rol: string },
  jwkDisp: { kty: string, crv: string, x: string, y: string }, huellaDisp: string, nombre: string, detalle: Record<string, unknown>) {
  // Tope de dispositivos: si se llegó, se revoca el que hace más tiempo que no se usa.
  const { data: activos, error: errAct } = await admin.from('llaves_moderacion').select('id,ultimo_uso,created_at')
    .eq('user_id', userId).eq('tipo', 'dispositivo').eq('estado', 'activa')
  if (errAct) throw errAct
  if ((activos || []).length >= MAX_DISPOSITIVOS_POR_USUARIO) {
    const viejo = [...activos!].sort((a: any, b: any) => new Date(a.ultimo_uso || a.created_at).getTime() - new Date(b.ultimo_uso || b.created_at).getTime())[0]
    await admin.from('llaves_moderacion').update({ estado: 'revocada', revocada_at: new Date().toISOString() }).eq('id', viejo.id)
  }
  const ahora = new Date().toISOString()
  const { data: disp, error: errIns } = await admin.from('llaves_moderacion').insert({
    user_id: userId, rol: padre.rol, tipo: 'dispositivo', padre_id: padre.id, nombre, public_key: jwkDisp, huella: huellaDisp,
    estado: 'activa', aprobada_por: userId, aprobada_at: ahora, ultimo_uso: ahora,
  }).select('id').single()
  if (errIns) {
    if (String((errIns as any).code) === '23505') return json({ ok: false, error: 'llave_duplicada' })
    throw errIns
  }
  await admin.from('llaves_moderacion').update({ ultimo_uso: ahora }).eq('id', padre.id)
  await auditar(admin, userId, String(disp.id), 'autorizar_dispositivo', { nombre, huella: huellaDisp, ...detalle })
  // Aviso a la propia cuenta: si no fue la persona, lo ve y lo revoca.
  await admin.from('notificaciones').insert({
    user_id: userId, tipo: 'noticia', contexto: 'Autorizaste un dispositivo para moderar', link: '/?vista=moderacion', ref_id: disp.id,
    cuerpo: (nombre + ' ya puede moderar sin pedir tu archivo de llave. Si no fuiste vos, revocalo en Moderación → Mi llave y cambiá tu contraseña.').slice(0, 400),
  })
  return { id: String(disp.id) }
}

// ---------- Emparejamiento por QR ----------
// Un dispositivo con la moderación desbloqueada crea un código de un solo uso (3 min) que muestra como QR. El celular,
// con la MISMA cuenta iniciada, lo abre, crea su propia llave y la registra (hija del mismo archivo).
const EMPAREJAMIENTO_MS = 3 * 60 * 1000
async function hashHex(texto: string) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)))
  return Array.from(h).map((b) => b.toString(16).padStart(2, '0')).join('')
}
async function crearEmparejamiento(admin: SupabaseClient, user: User, auth: { llaveId: string, padreId: string }) {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  const codigo = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  // Solo un código vigente por cuenta: crear otro invalida los anteriores sin usar.
  await admin.from('emparejamientos_moderacion').delete().eq('user_id', user.id).is('usado_at', null)
  const expira = new Date(Date.now() + EMPAREJAMIENTO_MS).toISOString()
  const { error } = await admin.from('emparejamientos_moderacion').insert({
    codigo_hash: await hashHex(codigo), user_id: user.id, padre_id: auth.padreId, creado_por_llave: auth.llaveId, expira_at: expira,
  })
  if (error) throw error
  await auditar(admin, user.id, auth.llaveId, 'crear_emparejamiento')
  return json({ ok: true, codigo, expira })
}
async function completarEmparejamiento(admin: SupabaseClient, user: User, body: any) {
  if (!(await tieneRol(admin, user.id, 'moderador'))) return json({ ok: false, error: 'no_autorizado' })
  const codigo = String(body.codigo || '')
  const jwkDisp = jwkPublicaValida(body.publicaDispositivo)
  if (!/^[A-Za-z0-9_-]{32}$/.test(codigo) || !jwkDisp) return json({ ok: false, error: 'datos_invalidos' })
  try { await crypto.subtle.importKey('jwk', jwkDisp, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']) }
  catch { return json({ ok: false, error: 'datos_invalidos' }) }
  // Se marca usado antes de seguir (un solo uso aunque lleguen dos pedidos juntos).
  const { data: emp, error } = await admin.from('emparejamientos_moderacion').update({ usado_at: new Date().toISOString() })
    .eq('codigo_hash', await hashHex(codigo)).eq('user_id', user.id).is('usado_at', null).gt('expira_at', new Date().toISOString())
    .select('padre_id').maybeSingle()
  if (error) throw error
  if (!emp) return json({ ok: false, error: 'codigo_vencido' })
  const { data: padre, error: errPadre } = await admin.from('llaves_moderacion').select('id,rol,estado,tipo,user_id').eq('id', emp.padre_id).maybeSingle()
  if (errPadre) throw errPadre
  if (!padre || padre.estado !== 'activa' || padre.tipo !== 'archivo' || String(padre.user_id) !== user.id) return json({ ok: false, error: 'llave_revocada' })
  if (!(await tieneRol(admin, user.id, padre.rol))) return json({ ok: false, error: 'no_autorizado' })
  const huellaDisp = await huellaDeLlave(jwkDisp)
  const nombre = (String(body.nombre || '').replace(/[\u0000-\u001F]/g, '').trim().slice(0, 48) || 'Celular') + ' (por QR)'
  const disp = await insertarDispositivo(admin, user.id, { id: String(padre.id), rol: padre.rol }, jwkDisp, huellaDisp, nombre, { qr: true })
  if (disp instanceof Response) return disp
  const { token, expira } = await crearTokenModeracion(user.id, disp.id, padre.rol)
  return json({ ok: true, token, rol: padre.rol, expira, tipo: 'dispositivo', huellaDispositivo: huellaDisp })
}

// Autoriza un dispositivo: la llave del ARCHIVO firma «desafío + huella del dispositivo». Se guarda la parte pública
// del dispositivo como llave hija (activa, mismo rol). Un dispositivo no puede autorizar a otro.
async function autorizarDispositivo(user: User, admin: SupabaseClient, body: any) {
  if (!(await tieneRol(admin, user.id, 'moderador'))) return json({ ok: false, error: 'no_autorizado' })
  if (!(await desafioModeracionValido(body.desafio, user.id))) return json({ ok: false, error: 'desafio_vencido' })
  const nonce = String(body.desafio).slice(0, 36)
  const { error: errNonce } = await admin.from('idempotency_keys').insert({ user_id: user.id, operation_id: nonce, action: 'desafio_moderacion', response: {} })
  if (errNonce) {
    if (String((errNonce as any).code) === '23505') return json({ ok: false, error: 'desafio_vencido' })
    throw errNonce
  }
  const huellaArchivo = String(body.huellaArchivo || '')
  const firma = base64urlABytes(String(body.firma || ''))
  const jwkDisp = jwkPublicaValida(body.publicaDispositivo)
  if (!RE_HUELLA.test(huellaArchivo) || !firma || firma.length !== 64 || !jwkDisp) return json({ ok: false, error: 'datos_invalidos' })
  try { await crypto.subtle.importKey('jwk', jwkDisp, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']) }
  catch { return json({ ok: false, error: 'datos_invalidos' }) }
  const huellaDisp = await huellaDeLlave(jwkDisp)

  const { data: padre, error } = await admin.from('llaves_moderacion')
    .select('id,user_id,rol,estado,public_key,tipo').eq('huella', huellaArchivo).maybeSingle()
  if (error) throw error
  if (!padre || String(padre.user_id) !== user.id || padre.tipo !== 'archivo') return json({ ok: false, error: 'llave_desconocida' })
  if (padre.estado === 'pendiente') return json({ ok: false, error: 'llave_pendiente' })
  if (padre.estado !== 'activa') return json({ ok: false, error: 'llave_revocada' })
  if (!(await tieneRol(admin, user.id, padre.rol))) return json({ ok: false, error: 'no_autorizado' })
  const jwkPadre = jwkPublicaValida(padre.public_key)
  if (!jwkPadre) return json({ ok: false, error: 'llave_desconocida' })
  const publica = await crypto.subtle.importKey('jwk', jwkPadre, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
  const mensaje = MOD_MENSAJE_DISPOSITIVO + String(body.desafio) + '|' + huellaDisp
  if (!(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publica, firma, new TextEncoder().encode(mensaje)))) {
    await auditar(admin, user.id, String(padre.id), 'firma_invalida')
    return json({ ok: false, error: 'firma_invalida' })
  }

  const nombre = String(body.nombre || '').replace(/[\u0000-\u001F]/g, '').trim().slice(0, 60) || 'Dispositivo'
  const disp = await insertarDispositivo(admin, user.id, { id: String(padre.id), rol: padre.rol }, jwkDisp, huellaDisp, nombre, { archivo: huellaArchivo })
  if (disp instanceof Response) return disp
  // La sesión de esta vez se abre con la llave del archivo: sirve también para acciones críticas.
  const { token, expira } = await crearTokenModeracion(user.id, String(padre.id), padre.rol)
  return json({ ok: true, token, rol: padre.rol, expira, tipo: 'archivo', huellaDispositivo: huellaDisp })
}

async function registrarLlave(user: User, admin: SupabaseClient, body: any) {
  // Solo moderadores registran su llave por acá (queda pendiente hasta que un admin la apruebe).
  // Las llaves de admin se dan de alta únicamente por SQL desde el dashboard de Supabase.
  if (!(await isModerator(admin, user.id))) return json({ ok: false, error: 'no_autorizado' })
  const jwk = jwkPublicaValida(body.publica)
  if (!jwk) return json({ ok: false, error: 'datos_invalidos' })
  const nombre = String(body.nombre || '').replace(/[\u0000-\u001F]/g, '').trim().slice(0, 60) || null
  const { count, error: errCount } = await admin.from('llaves_moderacion').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('tipo', 'archivo').in('estado', ['pendiente', 'activa'])
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
    .select('id,user_id,rol,nombre,huella,estado,created_at,aprobada_at,ultimo_uso,tipo')
    .neq('estado', 'revocada').order('created_at', { ascending: false }).limit(150)
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

// ==================== ENCUESTAS DEL FORO ====================
// Una publicación puede llevar una encuesta (tablas encuestas y votos_encuesta, solo accesibles por la API).
// Anónima: se guarda quién votó (para un voto por persona y poder cambiarlo) pero nunca se devuelve.
const MAX_ENCUESTA_PREGUNTA = 200
const MAX_ENCUESTA_OPCION = 80
const MIN_ENCUESTA_OPCIONES = 2
const MAX_ENCUESTA_OPCIONES = 6
const DURACIONES_ENCUESTA_HORAS = new Set([0, 24, 72, 168]) // 0 = sin cierre
const MAX_VOTANTES_VISIBLES = 60 // por opción, en encuestas públicas

function textoEncuesta(v: unknown, max: number) {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max + 1)
}

// undefined = sin encuesta; { error } = datos inválidos; si no, la encuesta lista para guardar.
function validarEncuesta(raw: any, titulo: string): any {
  if (raw === undefined || raw === null || raw === false) return undefined
  if (typeof raw !== 'object') return { error: 'encuesta_invalida' }
  const pregunta = textoEncuesta(raw.pregunta, MAX_ENCUESTA_PREGUNTA) || titulo
  if (!pregunta || pregunta.length > MAX_ENCUESTA_PREGUNTA) return { error: 'encuesta_invalida' }
  if (!Array.isArray(raw.opciones) || raw.opciones.length > MAX_ENCUESTA_OPCIONES * 2) return { error: 'encuesta_invalida' }
  const opciones = raw.opciones.map((o: unknown) => textoEncuesta(o, MAX_ENCUESTA_OPCION)).filter(Boolean)
  if (opciones.length < MIN_ENCUESTA_OPCIONES || opciones.length > MAX_ENCUESTA_OPCIONES) return { error: 'encuesta_opciones' }
  if (opciones.some((o: string) => o.length > MAX_ENCUESTA_OPCION)) return { error: 'encuesta_invalida' }
  if (new Set(opciones.map((o: string) => o.toLowerCase())).size !== opciones.length) return { error: 'encuesta_opciones_repetidas' }
  const horas = Number(raw.duracionHoras ?? 0)
  if (!DURACIONES_ENCUESTA_HORAS.has(horas)) return { error: 'encuesta_invalida' }
  return {
    pregunta, opciones, anonima: raw.anonima !== false, multiple: raw.multiple === true,
    cierra_at: horas ? new Date(Date.now() + horas * 3600_000).toISOString() : null,
  }
}

// Encuesta de un hilo con sus resultados para quien la mira. null si no tiene (o si la tabla todavía no existe).
async function datosEncuesta(admin: SupabaseClient, hiloId: string, userId: string) {
  const { data: e, error } = await admin.from('encuestas').select('id,pregunta,opciones,anonima,multiple,cierra_at').eq('hilo_id', hiloId).maybeSingle()
  if (error) { if (pgCode(error) === '42P01') return null; throw error }
  if (!e) return null
  const { data: votos, error: errVotos } = await admin.from('votos_encuesta').select('opciones,user_id').eq('encuesta_id', e.id).limit(5000)
  if (errVotos) throw errVotos
  const opciones: string[] = e.opciones || []
  const conteo = opciones.map(() => 0)
  const porOpcion: string[][] = opciones.map(() => [])
  const votantes = new Set<string>()
  const mios: number[] = []
  for (const v of votos || []) {
    const uid = String(v.user_id)
    votantes.add(uid)
    for (const raw of v.opciones || []) {
      const i = Number(raw)
      if (!(i >= 0 && i < opciones.length)) continue
      conteo[i]++
      if (uid === userId) mios.push(i)
      if (!e.anonima && porOpcion[i].length < MAX_VOTANTES_VISIBLES) porOpcion[i].push(uid)
    }
  }
  const nombres = e.anonima ? new Map() : await profileMap(admin, porOpcion.flat())
  const cerrada = !!e.cierra_at && new Date(e.cierra_at).getTime() <= Date.now()
  return {
    id: String(e.id), pregunta: e.pregunta, anonima: !!e.anonima, multiple: !!e.multiple, cierra: e.cierra_at, cerrada,
    totalVotantes: votantes.size, misVotos: mios.sort((a, b) => a - b),
    opciones: opciones.map((texto, i) => ({
      texto, votos: conteo[i],
      ...(e.anonima ? {} : { votantes: porOpcion[i].map((uid) => nombres.get(uid)?.pseudonimo || 'Estudiante') }),
    })),
  }
}

async function hilosConEncuesta(ids: string[]) {
  if (!ids.length) return new Set<string>()
  const { data, error } = await adminClient().from('encuestas').select('hilo_id').in('hilo_id', ids)
  if (error) { if (pgCode(error) === '42P01') return new Set<string>(); throw error }
  return new Set((data || []).map((r: any) => String(r.hilo_id)))
}

async function votarEncuesta(user: User, admin: SupabaseClient, body: any) {
  const encuestaId = uuidOrEmpty(body?.encuestaId)
  const elegidas = Array.isArray(body?.opciones) ? body.opciones : null
  if (!encuestaId || !elegidas || elegidas.length > MAX_ENCUESTA_OPCIONES || !elegidas.every((n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < MAX_ENCUESTA_OPCIONES)) return json({ ok: false, error: 'datos_invalidos' })
  const unicas = [...new Set<number>(elegidas)]
  const { data: e, error } = await admin.from('encuestas').select('id,hilo_id,opciones,multiple,cierra_at').eq('id', encuestaId).maybeSingle()
  if (error) throw error
  if (!e) return json({ ok: false, error: 'no_encontrado' })
  if (e.cierra_at && new Date(e.cierra_at).getTime() <= Date.now()) return json({ ok: false, error: 'encuesta_cerrada' })
  if (unicas.some((n) => n >= (e.opciones || []).length) || (!e.multiple && unicas.length > 1)) return json({ ok: false, error: 'datos_invalidos' })
  // Una fila por persona: votar o cambiar el voto es un upsert atómico (dos votos simultáneos no se suman).
  // Una lista vacía retira el voto.
  if (unicas.length) {
    const { error: errVoto } = await admin.from('votos_encuesta')
      .upsert({ encuesta_id: encuestaId, user_id: user.id, opciones: unicas.sort((a, b) => a - b), updated_at: new Date().toISOString() }, { onConflict: 'encuesta_id,user_id' })
    if (errVoto) throw errVoto
  } else {
    const { error: errBorrar } = await admin.from('votos_encuesta').delete().eq('encuesta_id', encuestaId).eq('user_id', user.id)
    if (errBorrar) throw errBorrar
  }
  return json({ ok: true, encuesta: await datosEncuesta(admin, String(e.hilo_id), user.id) })
}
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
    admin.from('profiles').select('id,pseudonimo,foto_url,is_moderator,is_admin,profile_completed,terminos_version,baja_programada_para,moderador_vence_at,mails_moderacion').eq('id', user.id).single(),
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
    perfil: { pseudonimo: profile.pseudonimo, foto: profile.foto_url || '', profileCompleted: profile.profile_completed !== false,
      terminosVersion: profile.terminos_version || '', terminosVigente: TERMINOS_VERSION, bajaProgramada: profile.baja_programada_para || null },
    solicitudes: solicitudes || [],
    intercambios: [...exchangeMap.values()],
    rol: { esModerador: !!profile.is_moderator && moderadorVigente(profile.moderador_vence_at), esAdmin: !!profile.is_admin,
      moderadorVence: profile.is_moderator && !profile.is_admin ? profile.moderador_vence_at || null : null,
      moderadorVencido: !!profile.is_moderator && !profile.is_admin && !moderadorVigente(profile.moderador_vence_at),
      mailsModeracion: profile.mails_moderacion !== false },
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
  const [pmap, likesRes, mineRes, conEncuesta] = await Promise.all([
    profileMap(client, authorIds),
    ids.length ? client.from('likes_hilos').select('hilo_id,user_id').in('hilo_id', ids) : Promise.resolve({ data: [] as any[], error: null }),
    ids.length ? client.from('likes_hilos').select('hilo_id').eq('user_id', userId).in('hilo_id', ids) : Promise.resolve({ data: [] as any[], error: null }),
    hilosConEncuesta(ids),
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
      encuesta: conEncuesta.has(String(h.id)),
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

// Devuelve la partida validada o { motivo } con la regla que no cumplió (el juego la muestra al jugador).
function validarPartida(body: any): any {
  const juego = String(body?.juego || '')
  const modo = String(body?.modo || '')
  if (!JUEGOS_RANKING.has(juego) || !MODO_RANKING.test(modo)) return { motivo: 'modo' }
  const dificultadInfeccion = String(body?.dificultadInfeccion || '')
  const dificultadEvolucion = String(body?.dificultadEvolucion || '')
  if (!(dificultadInfeccion in MULT_INFECCION) || !(dificultadEvolucion in MULT_EVOLUCION)) return { motivo: 'dificultad' }
  const segundos = enteroNoNegativo(body?.segundos)
  const kills = enteroNoNegativo(body?.kills)
  const correctas = enteroNoNegativo(body?.correctas)
  const preguntas = enteroNoNegativo(body?.preguntas)
  const jefes = enteroNoNegativo(body?.jefes)
  if (segundos === null || kills === null || correctas === null || preguntas === null || jefes === null) return { motivo: 'datos' }
  // Plausibilidad. Sin tope de eliminaciones por segundo: un jugador muy fuerte puede eliminar muchísimo y el tope
  // rechazaba partidas reales. Las sospechosas se detectan con estadísticas (partidas_juegos, estadisticasRanking) y
  // las esconde o anula un moderador. Sí se controla: no hay partidas de menos de 20 s, ni más preguntas que una
  // cada ~10 s, ni más de un jefe cada ~25 s, y el puntaje tiene que coincidir con la fórmula.
  if (segundos < PARTIDA_MIN_SEGUNDOS || segundos > PARTIDA_MAX_SEGUNDOS) return { motivo: 'duracion' }
  if (preguntas > Math.floor(segundos / 10) + 5 || correctas > preguntas) return { motivo: 'preguntas' }
  if (jefes > Math.floor(segundos / 25) + 3) return { motivo: 'jefes' }
  const puntaje = Math.floor((kills * 10 + segundos * 2 + correctas * 25) * MULT_INFECCION[dificultadInfeccion] * MULT_EVOLUCION[dificultadEvolucion])
  // Si el cliente dice otro puntaje, la partida no se corresponde con lo que se jugó (o se modificó).
  if (body?.puntaje !== undefined && Number(body.puntaje) !== puntaje) return { motivo: 'puntaje' }
  const version = String(body?.version || '').slice(0, 20)
  return { juego, modo, segundos, puntaje, kills, detalle: { kills, correctas, preguntas, jefes, dificultadInfeccion, dificultadEvolucion, version } }
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

// Historial de partidas para las estadísticas del ranking. Si falla (p. ej. la migración todavía no se aplicó), el
// puntaje se guarda igual: el historial es secundario.
async function registrarPartida(admin: SupabaseClient, userId: string, p: any) {
  const d = p.detalle
  const { error } = await admin.from('partidas_juegos').insert({
    user_id: userId, juego: p.juego, modo: p.modo, puntaje: p.puntaje, segundos: p.segundos, kills: d.kills,
    correctas: d.correctas, preguntas: d.preguntas, jefes: d.jefes, dificultad_infeccion: d.dificultadInfeccion,
    dificultad_evolucion: d.dificultadEvolucion, version: d.version,
  })
  if (error) console.warn('partida_sin_historial', error.message)
}

// Estadísticas de un modo para moderadores: ritmo de eliminaciones por segundo (mediana, p90 y p99) por tramo de
// duración, y los mejores puntajes con el detalle de su partida. Una partida se marca "inusual" cuando su ritmo
// queda muy por encima de lo habitual para partidas de duración parecida (con al menos 15 de referencia).
const TRAMOS_DURACION = [
  { id: 'corta', etiqueta: 'Hasta 5 min', hasta: 300 },
  { id: 'media', etiqueta: '5 a 15 min', hasta: 900 },
  { id: 'larga', etiqueta: '15 a 30 min', hasta: 1800 },
  { id: 'muy_larga', etiqueta: 'Más de 30 min', hasta: Infinity },
]
const MIN_PARTIDAS_REFERENCIA = 15
function tramoDe(segundos: number) { return TRAMOS_DURACION.find((t) => segundos <= t.hasta)! }
function percentil(ordenados: number[], q: number) {
  if (!ordenados.length) return null
  const i = Math.min(ordenados.length - 1, Math.max(0, Math.ceil(q * ordenados.length) - 1))
  return Math.round(ordenados[i] * 100) / 100
}
function resumenRitmos(valores: number[]) {
  const o = [...valores].sort((a, b) => a - b)
  return { partidas: o.length, mediana: percentil(o, 0.5), p90: percentil(o, 0.9), p99: percentil(o, 0.99), maximo: o.length ? Math.round(o[o.length - 1] * 100) / 100 : null }
}

async function estadisticasRanking(admin: SupabaseClient, body: any) {
  const juego = String(body?.juego || ''), modo = String(body?.modo || '')
  if (!JUEGOS_RANKING.has(juego) || !MODO_RANKING.test(modo)) return json({ ok: false, error: 'modo_invalido' })
  const { data: partidas, error } = await admin.from('partidas_juegos').select('segundos,kills')
    .eq('juego', juego).eq('modo', modo).order('created_at', { ascending: false }).limit(3000)
  if (error) throw error
  const porTramo: Record<string, number[]> = Object.fromEntries(TRAMOS_DURACION.map((t) => [t.id, []]))
  const todos: number[] = []
  for (const p of partidas || []) {
    const s = Number(p.segundos), k = Number(p.kills)
    if (!(s >= 60)) continue
    const r = k / s
    todos.push(r); porTramo[tramoDe(s).id].push(r)
  }
  const tramos = TRAMOS_DURACION.map((t) => ({ id: t.id, etiqueta: t.etiqueta, ...resumenRitmos(porTramo[t.id]) }))
  const general = resumenRitmos(todos)
  const { data: mejores, error: errMejores } = await admin.from('puntajes_juegos')
    .select('user_id,puntaje,segundos,detalle,oculto,partidas,logrado_at')
    .eq('juego', juego).eq('modo', modo).order('puntaje', { ascending: false }).limit(25)
  if (errMejores) throw errMejores
  const nombres = await profileMap(admin, (mejores || []).map((r: any) => String(r.user_id)))
  const top = (mejores || []).map((r: any) => {
    const segundos = Number(r.segundos), d = r.detalle || {}, kills = Number(d.kills ?? 0)
    const ritmo = segundos > 0 ? Math.round(kills / segundos * 100) / 100 : 0
    const tramo = tramos.find((t) => t.id === tramoDe(segundos).id)!
    const ref = tramo.partidas >= MIN_PARTIDAS_REFERENCIA ? tramo : general.partidas >= MIN_PARTIDAS_REFERENCIA ? general : null
    const inusual = !!ref && ref.p90 !== null && ref.p99 !== null && ritmo > Math.max(ref.p99 * 1.2, ref.p90 * 1.6)
    return {
      pseudonimo: nombres.get(String(r.user_id))?.pseudonimo || 'Estudiante', puntaje: Number(r.puntaje), segundos, kills, ritmo,
      correctas: Number(d.correctas ?? 0), preguntas: Number(d.preguntas ?? 0), jefes: Number(d.jefes ?? 0),
      dificultad: [d.dificultadInfeccion, d.dificultadEvolucion].filter(Boolean).join(' · '), version: String(d.version || ''),
      partidas: Number(r.partidas || 1), oculto: !!r.oculto, fecha: r.logrado_at, tramo: tramo.etiqueta, inusual,
    }
  })
  return json({ ok: true, juego, modo, general, tramos, top, minimoReferencia: MIN_PARTIDAS_REFERENCIA })
}

async function guardarPuntaje(user: User, client: SupabaseClient, admin: SupabaseClient, body: any) {
  const partida = validarPartida(body)
  if (partida.motivo) {
    console.warn('partida_invalida', partida.motivo, user.id)
    return json({ ok: false, error: 'partida_invalida', motivo: partida.motivo })
  }
  const { juego, modo, segundos, puntaje, detalle } = partida
  const entrada = await verificarEntradaPartida(body?.partida, user.id, juego, modo)
  if (!entrada) {
    console.warn('partida_sin_inicio', user.id)
    return json({ ok: false, error: 'partida_sin_inicio' })
  }
  // Reintento de la misma partida: misma respuesta, sin volver a sumar.
  const operationId = entrada.id
  const previa = await getIdempotent(admin, user.id, operationId, 'guardarPuntaje')
  if (previa) return json(previa)
  if (segundos > (Date.now() - entrada.inicio) / 1000 + PARTIDA_TOLERANCIA_S) {
    console.warn('partida_invalida', 'tiempo', user.id)
    return json({ ok: false, error: 'partida_invalida', motivo: 'tiempo' })
  }
  await registrarPartida(admin, user.id, partida)
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

// Perfil por pseudónimo exacto (sin distinguir mayúsculas). undefined = pseudónimo inválido; null = no existe.
async function perfilPorPseudonimo(admin: SupabaseClient, valor: unknown) {
  const pseudonimo = String(valor || '').trim().normalize('NFC')
  if (!/^[A-Za-zÀ-ÿ0-9 _.-]{3,24}$/.test(pseudonimo)) return undefined
  const { data, error } = await admin.from('profiles').select('id').ilike('pseudonimo', pseudonimo.replace(/[\\%_]/g, (c) => '\\' + c)).maybeSingle()
  if (error) throw error
  return data as { id: string } | null
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
      const encuesta=await datosEncuesta(admin,String(h.id),user.id)
      return json({ok:true,hilo:{...hilo,encuesta},respuestas})
    }
    case 'votarEncuesta': {
      const rl=await rateLimit(admin,action,user.id); if(rl)return rl
      return votarEncuesta(user,admin,body)
    }
    case 'crearHilo': {
      const rl = await rateLimit(admin, action, user.id); if (rl) return rl
      const titulo=String(body.titulo||'').trim(), operationId=String(body.operacionId||'')
      let contenido=String(body.contenido||'').trim()
      if (!validOperationId(operationId)) return json({ok:false,error:'datos_invalidos'})
      const cached=await getIdempotent(admin,user.id,operationId,action); if(cached) return json(cached)
      const encuesta=validarEncuesta(body.encuesta,titulo)
      if(encuesta?.error) return json({ok:false,error:encuesta.error})
      // Con encuesta, el texto es opcional: si falta, se guarda la pregunta (la web no la repite al mostrarla).
      if(encuesta&&!contenido) contenido=encuesta.pregunta
      if(!titulo||titulo.length>MAX_TITLE||!contenido||contenido.length>MAX_CONTENT) return json({ok:false,error:titulo.length>MAX_TITLE?'titulo_invalido':'contenido_invalido'})
      const tags=cleanTags(body.etiquetas)
      const linksCheck=validateContentLinks(contenido)
      if(!linksCheck.ok) return json({ok:false,error:linksCheck.demasiados?'demasiados_enlaces':'enlace_no_permitido',url:linksCheck.invalid})
      const isSensitive=body.isSensitive===true || body.sensible==='1'
      const {data,error}=await admin.from('hilos').insert({autor_id:user.id,es_anonimo:false,titulo,contenido,etiquetas:tags,link:null,is_sensitive:isSensitive,operation_id:operationId}).select('id').single()
      if(error){
        if((error as any).code==='23505'){ const {data:existing}=await client.from('hilos').select('id').eq('operation_id',operationId).single(); if(existing){
          // Si un intento anterior se cortó entre el hilo y la encuesta, se completa ahora.
          if(encuesta&&!(await datosEncuesta(admin,String(existing.id),user.id))){const {error:errE}=await admin.from('encuestas').insert({hilo_id:existing.id,...encuesta});if(errE&&pgCode(errE)!=='23505')throw errE}
          const hiloExistente=await getOrBuildThreadResponse(client,user.id,String(existing.id))
          return json({ ok: true, id: String(existing.id), hilo: encuesta?{...hiloExistente,encuesta:await datosEncuesta(admin,String(existing.id),user.id)}:hiloExistente }) }}
        throw error
      }
      if(encuesta){
        const {error:errEncuesta}=await admin.from('encuestas').insert({hilo_id:data.id,...encuesta})
        if(errEncuesta){await admin.from('hilos').delete().eq('id',data.id);throw errEncuesta}
      }
      const hiloCreado=await getOrBuildThreadResponse(client,user.id,String(data.id))
      const response={ok:true,id:String(data.id),hilo:encuesta?{...hiloCreado,encuesta:await datosEncuesta(admin,String(data.id),user.id)}:hiloCreado}
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
        const datos = await datosPublicacion(admin, 'hilo', id), motivo = motivoModeracion(body)
        await moverAPapelera(admin, 'hilo', id, user.id, motivo)
        await auditar(admin, user.id, auth.llaveId, 'borrar_hilo', { id, motivo })
        await avisarAutorModeracion(admin, user.id, 'hilo', id, datos, motivo)
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
        const datos = await datosPublicacion(admin, 'respuesta', id), motivo = motivoModeracion(body)
        await moverAPapelera(admin, 'respuesta', id, user.id, motivo)
        await auditar(admin, user.id, auth.llaveId, 'borrar_respuesta', { id, motivo })
        await avisarAutorModeracion(admin, user.id, 'respuesta', id, datos, motivo)
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
    case 'aceptarTerminos': {
      // Guarda qué versión de los Términos y la Política aceptó la persona y cuándo (consentimiento expreso, Ley 25.326 art. 5).
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      if(String(body.version||'')!==TERMINOS_VERSION)return json({ok:false,error:'version_invalida',vigente:TERMINOS_VERSION})
      const {error}=await admin.from('profiles').update({terminos_version:TERMINOS_VERSION,terminos_aceptados_at:new Date().toISOString()}).eq('id',user.id)
      if(error)throw error
      return json({ok:true,version:TERMINOS_VERSION})
    }
    case 'solicitarBaja': {
      // Baja con arrepentimiento: la cuenta sigue funcionando y se borra sola a los 30 días (maintenance), salvo que se cancele.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      if(String(body.confirmacion||'').trim().toUpperCase()!=='BORRAR')return json({ok:false,error:'confirmacion_baja'})
      if(await isAdmin(admin,user.id))return json({ok:false,error:'baja_admin'})
      const ahora=new Date(),programada=new Date(ahora.getTime()+DIAS_ARREPENTIMIENTO_BAJA*86400000).toISOString()
      const {error}=await admin.from('profiles').update({baja_solicitada_at:ahora.toISOString(),baja_programada_para:programada}).eq('id',user.id)
      if(error)throw error
      return json({ok:true,bajaProgramada:programada})
    }
    case 'cancelarBaja': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const {error}=await admin.from('profiles').update({baja_solicitada_at:null,baja_programada_para:null}).eq('id',user.id)
      if(error)throw error
      return json({ok:true})
    }
    case 'listarClasificados': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return listarClasificados(admin,user)
    }
    case 'publicarClasificado': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return publicarClasificado(admin,user,body)
    }
    case 'contactarClasificado': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return contactarClasificado(admin,user,body)
    }
    case 'gestionarClasificado': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return gestionarClasificado(admin,user,body)
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
      if(!['hilo','respuesta','material','clasificado'].includes(tipo)||!id)return json({ok:false,error:'datos_invalidos'})
      const tabla=tipo==='hilo'?'hilos':tipo==='respuesta'?'respuestas':tipo==='material'?'materiales':'clasificados'
      let consultaPub=admin.from(tabla).select('id').eq('id',id).is('eliminado_at',null)
      if(tipo==='material'||tipo==='clasificado')consultaPub=consultaPub.eq('activo',true)
      const {data:pub,error:pubError}=await consultaPub.maybeSingle()
      if(pubError)throw pubError
      if(!pub)return json({ok:false,error:'no_encontrado'})
      // Una sola denuncia pendiente por persona y publicación: evita inflar la cola de moderación.
      const {data:previa}=await admin.from('denuncias').select('id').eq('id_publicacion',id).eq('denunciante_id',user.id).eq('estado','pendiente').limit(1)
      if((previa||[]).length)return json({ok:true,repetida:true})
      const {error}=await admin.from('denuncias').insert({tipo,id_publicacion:id,denunciante_id:user.id,motivo});if(error)throw error
      await avisarModeradores(admin,'denuncia',REF_AVISO_DENUNCIAS,
        n=>n===1?'Hay una denuncia nueva para revisar':'Hay '+n+' denuncias nuevas para revisar',
        (NOMBRE_TIPO_PUBLICACION[tipo]||tipo)+(motivo?' · '+motivo:''),user.id)
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
    case 'enviarReporte': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return enviarReporte(admin,user,body)
    }
    case 'listarReportes': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      return listarReportes(admin,body)
    }
    case 'gestionarReporte': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      return gestionarReporte(admin,user,auth.llaveId,body)
    }
    case 'preferenciaMailsModeracion': {
      // Preferencia propia: no da ni quita permisos, así que no pide la llave.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const {error}=await admin.from('profiles').update({mails_moderacion:body.activar===true}).eq('id',user.id);if(error)throw error
      return json({ok:true,mailsModeracion:body.activar===true})
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
      const lm=linkMaterialValido(body.link)
      if(lm&&'error' in lm)return json({ok:false,error:lm.error,dominio:lm.dominio})
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
      const datos=await datosPublicacion(admin,'material',id),motivo=motivoModeracion(body)
      await moverAPapelera(admin,'material',id,user.id,motivo)
      await auditar(admin,user.id,auth.llaveId,'quitar_material',{id,motivo})
      await avisarAutorModeracion(admin,user.id,'material',id,datos,motivo)
      return json({ok:true})
    }
    case 'quitarClasificado': {
      // Moderación: borra un aviso de Compra venta (sin esperar una denuncia) y le avisa a quien lo publicó.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const id=uuidOrEmpty(body.id);if(!id)return json({ok:false,error:'datos_invalidos'})
      const datos=await datosPublicacion(admin,'clasificado',id),motivo=motivoModeracion(body)
      if(!datos)return json({ok:false,error:'no_encontrado'})
      await moverAPapelera(admin,'clasificado',id,user.id,motivo)
      await auditar(admin,user.id,auth.llaveId,'quitar_clasificado',{id,motivo,titulo:datos.titulo})
      await avisarAutorModeracion(admin,user.id,'clasificado',id,datos,motivo)
      return json({ok:true})
    }
    case 'quitarPuntaje': {
      // Antitrampa del ranking: el juego corre en el navegador, así que un puntaje inventado dentro de lo plausible
      // no se puede distinguir de uno real. Un moderador (con llave) puede sacar del ranking el que parezca trampa.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const juego=String(body.juego||''),modo=String(body.modo||'')
      const perfil=await perfilPorPseudonimo(admin,body.pseudonimo)
      if(!JUEGOS_RANKING.has(juego)||!MODO_RANKING.test(modo)||perfil===undefined)return json({ok:false,error:'datos_invalidos'})
      if(!perfil)return json({ok:false,error:'no_encontrado'})
      const {data:borrados,error}=await admin.from('puntajes_juegos').delete().eq('user_id',perfil.id).eq('juego',juego).eq('modo',modo).select('puntaje,segundos,detalle')
      if(error)throw error
      if(!borrados||!borrados.length)return json({ok:false,error:'no_encontrado'})
      const b:any=borrados[0]
      await auditar(admin,user.id,auth.llaveId,'quitar_puntaje',{usuario:String(perfil.id),juego,modo,puntaje:b.puntaje,segundos:b.segundos,kills:b.detalle?.kills??null})
      return json({ok:true})
    }
    case 'ocultarPuntaje': {
      // Esconde (o vuelve a mostrar) un puntaje sin borrarlo: deja de contar para el ranking y se puede deshacer.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const juego=String(body.juego||''),modo=String(body.modo||''),oculto=body.oculto!==false
      const perfil=await perfilPorPseudonimo(admin,body.pseudonimo)
      if(!JUEGOS_RANKING.has(juego)||!MODO_RANKING.test(modo)||perfil===undefined)return json({ok:false,error:'datos_invalidos'})
      if(!perfil)return json({ok:false,error:'no_encontrado'})
      const {data:filas,error}=await admin.from('puntajes_juegos').update({oculto,oculto_at:oculto?new Date().toISOString():null})
        .eq('user_id',perfil.id).eq('juego',juego).eq('modo',modo).select('puntaje,segundos,detalle')
      if(error)throw error
      if(!filas||!filas.length)return json({ok:false,error:'no_encontrado'})
      const f:any=filas[0]
      await auditar(admin,user.id,auth.llaveId,oculto?'ocultar_puntaje':'mostrar_puntaje',{usuario:String(perfil.id),juego,modo,puntaje:f.puntaje,segundos:f.segundos,kills:f.detalle?.kills??null})
      return json({ok:true,oculto})
    }
    case 'estadisticasRanking': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      return estadisticasRanking(admin,body)
    }
    case 'puntajesOcultos': {
      // Lista para moderadores: puntajes escondidos de un modo, con el detalle de la partida para decidir.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      const juego=String(body.juego||''),modo=String(body.modo||'')
      if(!JUEGOS_RANKING.has(juego)||!MODO_RANKING.test(modo))return json({ok:false,error:'modo_invalido'})
      const {data,error}=await admin.from('puntajes_juegos').select('user_id,puntaje,segundos,detalle,oculto_at')
        .eq('juego',juego).eq('modo',modo).eq('oculto',true).order('puntaje',{ascending:false}).limit(50)
      if(error)throw error
      const nombres=await profileMap(admin,(data||[]).map((r:any)=>String(r.user_id)))
      return json({ok:true,ocultos:(data||[]).map((r:any)=>({pseudonimo:nombres.get(String(r.user_id))?.pseudonimo||'Estudiante',puntaje:Number(r.puntaje),segundos:Number(r.segundos),kills:Number(r.detalle?.kills??0),fecha:r.oculto_at}))})
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
    case 'autorizarDispositivo': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return autorizarDispositivo(user,admin,body)
    }
    case 'registrarLlave': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return registrarLlave(user,admin,body)
    }
    case 'misLlaves': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const {data,error}=await admin.from('llaves_moderacion').select('id,rol,nombre,huella,estado,created_at,ultimo_uso,tipo,padre_id').eq('user_id',user.id).neq('estado','revocada').order('created_at',{ascending:false})
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
      const auth=await autorizarModeracion(admin,user,body,'admin',true);if(auth instanceof Response)return auth
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
      const {data:llave,error:errLlave}=await admin.from('llaves_moderacion').select('id,user_id,rol,estado,huella,tipo').eq('id',id).maybeSingle()
      if(errLlave)throw errLlave
      if(!llave||llave.estado==='revocada')return json({ok:false,error:'no_encontrado'})
      // Revocar un dispositivo propio siempre se puede con la cuenta (quita permisos, nunca los da).
      const propiaSinLlave=String(llave.user_id)===user.id&&(llave.rol!=='admin'||llave.tipo==='dispositivo')
      // La propia llave se puede revocar solo con la cuenta (por si perdés el archivo); la de otro, solo un admin con su llave.
      let llaveUsada:string|null=null
      if(!propiaSinLlave){
        const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
        llaveUsada=auth.llaveId
      }
      const revocada={estado:'revocada',revocada_at:new Date().toISOString()}
      const {error}=await admin.from('llaves_moderacion').update(revocada).eq('id',id)
      if(error)throw error
      // Al revocar un archivo caen todos los dispositivos que autorizó.
      const {error:errHijos}=await admin.from('llaves_moderacion').update(revocada).eq('padre_id',id).neq('estado','revocada')
      if(errHijos)throw errHijos
      await auditar(admin,user.id,llaveUsada,llave.tipo==='dispositivo'?'revocar_dispositivo':'revocar_llave',{llave:id,huella:llave.huella})
      if(propiaSinLlave&&llave.tipo!=='dispositivo'){
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
    case 'guardarGrupoModeracion': {
      // Crea un grupo o cambia su nombre/fecha. Cambiar la fecha RENUEVA a todos sus integrantes hasta esa fecha
      // (por eso es crítica: pide el archivo de llave). Antes de renovar, sacá del grupo a quien ya no sigue.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin',true);if(auth instanceof Response)return auth
      const nombre=String(body.nombre||'').replace(/[\u0000-\u001F]/g,'').trim().slice(0,60)
      const corte=fechaCorteDesde(body.fecha)
      if(nombre.length<2)return json({ok:false,error:'grupo_nombre'})
      if(!corte)return json({ok:false,error:'fecha_invalida'})
      const id=uuidOrEmpty(body.id)
      let grupoId=id
      if(id){
        const {error}=await admin.from('grupos_moderacion').update({nombre,fecha_corte:corte}).eq('id',id);if(error)throw error
        const {error:errM}=await admin.from('profiles').update({moderador_vence_at:corte}).eq('grupo_moderacion_id',id).eq('is_moderator',true).eq('is_admin',false)
        if(errM)throw errM
      }else{
        const {data,error}=await admin.from('grupos_moderacion').insert({nombre,fecha_corte:corte}).select('id').single();if(error)throw error
        grupoId=String(data.id)
      }
      await auditar(admin,user.id,auth.llaveId,'guardar_grupo',{grupo:grupoId,nombre,hasta:corte})
      if(id){
        const {data:mods}=await admin.from('profiles').select('id').eq('grupo_moderacion_id',id).eq('is_moderator',true).eq('is_admin',false)
        const filas=(mods||[]).map((m:any)=>({user_id:m.id,tipo:'noticia',contexto:'Tu período de moderación se renovó',
          cuerpo:'Grupo «'+nombre+'»: seguís moderando hasta el '+fechaCorta(corte)+'.',link:'/?vista=moderacion',ref_id:m.id}))
        if(filas.length)await admin.from('notificaciones').insert(filas)
      }
      return json({ok:true,id:grupoId})
    }
    case 'borrarGrupoModeracion': {
      // Sus integrantes conservan la fecha que tenían, como período individual.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
      const id=uuidOrEmpty(body.id);if(!id)return json({ok:false,error:'datos_invalidos'})
      const {error}=await admin.from('grupos_moderacion').delete().eq('id',id);if(error)throw error
      await auditar(admin,user.id,auth.llaveId,'borrar_grupo',{grupo:id})
      return json({ok:true})
    }
    case 'asignarPeriodoModerador': {
      // Período de un moderador: un grupo, una fecha individual o sin vencimiento. Extiende permisos: crítica.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin',true);if(auth instanceof Response)return auth
      const email=String(body.email||'').trim().toLowerCase()
      const u=await findUserByEmail(admin,email);if(!u)return json({ok:false,error:'no_encontrado'})
      const {data:p,error:errP}=await admin.from('profiles').select('is_moderator,is_admin').eq('id',u.id).maybeSingle()
      if(errP)throw errP
      if(!p?.is_moderator||p.is_admin)return json({ok:false,error:'no_es_moderador'})
      let cambios:Record<string,unknown>
      if(uuidOrEmpty(body.grupoId)){const g=await grupoModeracion(admin,uuidOrEmpty(body.grupoId));if(!g)return json({ok:false,error:'no_encontrado'});cambios={grupo_moderacion_id:g.id,moderador_vence_at:g.fecha_corte}}
      else if(body.fecha){const corte=fechaCorteDesde(body.fecha);if(!corte)return json({ok:false,error:'fecha_invalida'});cambios={grupo_moderacion_id:null,moderador_vence_at:corte}}
      else if(body.sinVencimiento===true)cambios={grupo_moderacion_id:null,moderador_vence_at:null}
      else return json({ok:false,error:'datos_invalidos'})
      const {error}=await admin.from('profiles').update(cambios).eq('id',u.id);if(error)throw error
      await auditar(admin,user.id,auth.llaveId,'periodo_moderador',{usuario:String(u.id),...cambios})
      if(cambios.moderador_vence_at){
        await admin.from('notificaciones').insert({user_id:u.id,tipo:'noticia',contexto:'Se actualizó tu período de moderación',
          cuerpo:'Seguís moderando hasta el '+fechaCorta(String(cambios.moderador_vence_at))+'.',link:'/?vista=moderacion',ref_id:u.id})
      }
      return json({ok:true})
    }
    case 'listarPapelera': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      return listarPapelera(admin)
    }
    case 'restaurarPapelera': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      return restaurarPapelera(admin,user,auth.llaveId,body)
    }
    case 'crearEmparejamiento': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'moderador');if(auth instanceof Response)return auth
      return crearEmparejamiento(admin,user,auth)
    }
    case 'completarEmparejamiento': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      return completarEmparejamiento(admin,user,body)
    }
    case 'renunciarModeracion': {
      // Dejar el rol en el momento. Solo quita permisos, así que alcanza con la cuenta (no pide la llave).
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      if(String(body.confirmacion||'').trim().toUpperCase()!=='RENUNCIO')return json({ok:false,error:'confirmacion_renuncia'})
      const {data:p,error:errP}=await admin.from('profiles').select('is_moderator,is_admin,pseudonimo').eq('id',user.id).maybeSingle()
      if(errP)throw errP
      if(!p||(!p.is_moderator&&!p.is_admin))return json({ok:false,error:'no_autorizado'})
      if(p.is_admin){
        if(String(user.email||'').toLowerCase()===CUENTA_OFICIAL)return json({ok:false,error:'cuenta_oficial'})
        const {count,error:errCount}=await admin.from('profiles').select('id',{count:'exact',head:true}).eq('is_admin',true)
        if(errCount)throw errCount
        if((count||0)<=1)return json({ok:false,error:'ultimo_admin'})
      }
      const {error}=await admin.from('profiles').update({is_moderator:false,is_admin:false,moderador_vence_at:null,grupo_moderacion_id:null}).eq('id',user.id)
      if(error)throw error
      await admin.from('llaves_moderacion').update({estado:'revocada',revocada_at:new Date().toISOString()}).eq('user_id',user.id).neq('estado','revocada')
      await auditar(admin,user.id,null,'renunciar_moderacion',{rol:p.is_admin?'admin':'moderador'})
      const {data:admins}=await admin.from('profiles').select('id').eq('is_admin',true)
      const filas=(admins||[]).map((a:any)=>({user_id:a.id,tipo:'noticia',contexto:(p.pseudonimo||'Alguien')+' dejó la moderación',
        cuerpo:'Renunció a su rol de '+(p.is_admin?'administrador':'moderador')+' desde su cuenta. Sus llaves y dispositivos quedaron revocados.',link:'/?vista=moderacion',ref_id:user.id}))
      if(filas.length)await admin.from('notificaciones').insert(filas)
      return json({ok:true})
    }
    case 'listarModeradores': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin');if(auth instanceof Response)return auth
      const {data:equipo,error}=await admin.from('profiles').select('id,pseudonimo,is_moderator,is_admin,moderador_vence_at,grupo_moderacion_id').or('is_moderator.eq.true,is_admin.eq.true').order('pseudonimo')
      if(error)throw error
      const miembros=[]
      for(const m of equipo||[]){
        const u=await admin.auth.admin.getUserById(String(m.id))
        const email=u.data.user?.email||''
        const vence=m.is_admin?null:(m.moderador_vence_at||null)
        miembros.push({email,pseudonimo:m.pseudonimo,rol:m.is_admin?'admin':'moderador',oficial:email.toLowerCase()===CUENTA_OFICIAL,vos:String(m.id)===user.id,
          venceAt:vence,vencido:!m.is_admin&&!moderadorVigente(vence),grupoId:m.is_admin?null:(m.grupo_moderacion_id||null)})
      }
      const {data:grupos,error:errG}=await admin.from('grupos_moderacion').select('id,nombre,fecha_corte').order('fecha_corte')
      if(errG)throw errG
      return json({ok:true,moderadores:miembros,grupos:(grupos||[]).map((g:any)=>({id:g.id,nombre:g.nombre,fechaCorte:g.fecha_corte,
        miembros:miembros.filter((m:any)=>m.grupoId===g.id).length}))})
    }
    case 'asignarModerador': {
      // Da rol de moderador o de administrador. Un admin nuevo igual necesita una llave de admin, que solo se
      // activa por SQL desde el dashboard: dar el rol desde la web no alcanza para administrar.
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin',true);if(auth instanceof Response)return auth
      const rol=body.rol==='admin'?'admin':'moderador'
      const email=String(body.email||'').trim().toLowerCase()
      const u=await findUserByEmail(admin,email);if(!u)return json({ok:false,error:'no_encontrado'})
      // Período opcional: un grupo (vence con él) o una fecha individual. Sin nada, no vence.
      let corte:string|null=null,grupoId:string|null=null
      if(rol==='moderador'&&uuidOrEmpty(body.grupoId)){const g=await grupoModeracion(admin,uuidOrEmpty(body.grupoId));if(!g)return json({ok:false,error:'no_encontrado'});grupoId=g.id;corte=g.fecha_corte}
      else if(rol==='moderador'&&body.fecha){corte=fechaCorteDesde(body.fecha);if(!corte)return json({ok:false,error:'fecha_invalida'})}
      const cambios=rol==='admin'?{is_admin:true}:{is_moderator:true,moderador_vence_at:corte,grupo_moderacion_id:grupoId}
      const {error}=await admin.from('profiles').update(cambios).eq('id',u.id).select('id').single()
      if(error)throw error
      await auditar(admin,user.id,auth.llaveId,rol==='admin'?'asignar_admin':'asignar_moderador',{usuario:String(u.id)})
      return json({ok:true})
    }
    case 'quitarModerador': {
      const rl=await rateLimit(admin,action,user.id);if(rl)return rl
      const auth=await autorizarModeracion(admin,user,body,'admin',true);if(auth instanceof Response)return auth
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
      const cambios=rol==='admin'?{is_admin:false}:{is_moderator:false,moderador_vence_at:null,grupo_moderacion_id:null}
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
        const datosPub=await datosPublicacion(admin,String(rep.tipo),String(rep.id_publicacion)),motivo=motivoModeracion(body)
        // Va a la papelera (7 días, restaurable) y se resuelven todas las denuncias pendientes de esa publicación.
        await moverAPapelera(admin,String(rep.tipo),String(rep.id_publicacion),user.id,motivo)
        await avisarAutorModeracion(admin,user.id,String(rep.tipo),String(rep.id_publicacion),datosPub,motivo)
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
  const idsMat = denuncias.filter(d => d.tipo === 'material').map(d => String(d.id_publicacion))
  const idsClas = denuncias.filter(d => d.tipo === 'clasificado').map(d => String(d.id_publicacion))
  const [hilos, resps, mats, clas] = await Promise.all([
    idsHilos.length ? admin.from('hilos').select('id,titulo,contenido,autor_id').in('id', idsHilos) : Promise.resolve({ data: [], error: null }),
    idsResp.length ? admin.from('respuestas').select('id,contenido,autor_id').in('id', idsResp) : Promise.resolve({ data: [], error: null }),
    idsMat.length ? admin.from('materiales').select('id,titulo,materia,link,creado_por,aporte_id,activo').in('id', idsMat) : Promise.resolve({ data: [], error: null }),
    idsClas.length ? admin.from('clasificados').select('id,titulo,descripcion,precio,contacto,autor_id').in('id', idsClas) : Promise.resolve({ data: [], error: null }),
  ])
  if (clas.error) throw clas.error
  if (hilos.error) throw hilos.error
  if (resps.error) throw resps.error
  if (mats.error) throw mats.error
  const pubs = new Map<string, any>()
  for (const h of hilos.data || []) pubs.set(String(h.id), h)
  for (const r of resps.data || []) pubs.set(String(r.id), r)
  for (const c of clas.data || []) pubs.set(String(c.id), {
    titulo: c.titulo, autor_id: c.autor_id,
    contenido: c.descripcion + (c.precio ? '\nPrecio: ' + c.precio : '') + (c.contacto ? '\nContacto: ' + c.contacto : ''),
  })
  // Material: el autor real es quien mandó el aporte (creado_por es el moderador que lo aprobó o lo cargó).
  const idsAportes = (mats.data || []).map((m: any) => m.aporte_id).filter(Boolean)
  const aportesAutor = new Map<string, string>()
  if (idsAportes.length) {
    const { data: aps, error: errAps } = await admin.from('aportes_material').select('id,user_id').in('id', idsAportes)
    if (errAps) throw errAps
    for (const a of aps || []) aportesAutor.set(String(a.id), String(a.user_id))
  }
  for (const m of mats.data || []) if (m.activo) pubs.set(String(m.id), { titulo: m.titulo, contenido: m.materia + ' · ' + m.link, autor_id: (m.aporte_id && aportesAutor.get(String(m.aporte_id))) || m.creado_por })
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

