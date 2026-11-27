// Filtro automático de contenido (ADR 0007). Local, liviano y sin dependencias: lo usa la Edge Function `api`
// al publicar en el foro y en Compra venta y al elegir un seudónimo. Los tests están en supabase/tests/filtro.test.ts.
//
// Criterio (definido con el equipo): las malas palabras sueltas se permiten (el rioplatense insulta «de onda»).
// Se retira solo lo que es claramente una infracción:
//   · insultos DIRIGIDOS a una persona («sos un pelotudo», «hijo de puta», «andate a la mierda»),
//   · expresiones discriminatorias, amenazas o incitación a hacerse daño, acoso sexual,
//   · datos que pueden identificar a un paciente (DNI, CUIL, número de historia clínica).
// Mails y teléfonos se permiten. Ante la duda, NO se retira: es mejor un falso negativo (lo cubre la denuncia)
// que retirar algo legítimo. Términos médicos (pene, vagina, violación, suicidio…) nunca se filtran solos.
//
// Antes de comparar se normaliza: minúsculas, sin tildes, «leet» (p3l0tud0), letras repetidas (boluuudo) y letras
// separadas (p.u.t.o). Los patrones están escritos sobre ese texto normalizado.

export type ResultadoFiltro = { categoria: string, motivo: string, regla: string }

const MOTIVOS: Record<string, [string, string]> = {
  agresion: ['acoso', 'Insulto o agresión dirigida a una persona'],
  discriminacion: ['discriminacion', 'Expresión discriminatoria'],
  amenaza: ['acoso', 'Amenaza o incitación a hacerse daño'],
  sexual: ['contenido_inapropiado', 'Acoso o contenido sexual'],
  pacientes: ['pacientes', 'Posibles datos que identifican a un paciente (DNI, CUIL o historia clínica)'],
  seudonimo: ['otro', 'Seudónimo ofensivo'],
}

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' }

export function normalizar(texto: string) {
  let t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  t = t.replace(/[013457@$]/g, (c) => LEET[c] || c)
  t = t.replace(/[^a-z]+/g, ' ')
  // «p u t o» → «puto» (tres o más letras sueltas seguidas).
  t = t.replace(/\b(?:[a-z] ){2,}[a-z]\b/g, (m) => m.replace(/ /g, ''))
  // Letras repetidas: «boluuuudo» → «boludo», «forrrro» → «forro» (las dobles legítimas se conservan).
  t = t.replace(/([a-z])\1{2,}/g, '$1$1')
  return ' ' + t.trim().replace(/ +/g, ' ') + ' '
}

// Una palabra escrita normal se vuelve tolerante a letras estiradas: «boludo» → b+o+l+u+d+o+ («boluudo» también).
function estirar(palabra: string) {
  return palabra.replace(/([a-z])\1*/g, (run, c) => c + (run.length > 1 ? '{' + run.length + ',}' : '+'))
}
const alt = (lista: string[]) => '(?:' + lista.map((w) => w.split(' ').map(estirar).join(' ')).join('|') + ')'
const formas = (raiz: string, finales: string[]) => finales.map((f) => raiz + f)
const OA = ['o', 'a', 'os', 'as']

// Insultos fuertes: cuentan solo cuando van dirigidos a alguien (ver MARCOS).
const INSULTOS = [
  ...formas('pelotud', OA), ...formas('forr', OA), ...formas('estupid', OA), ...formas('mogolic', OA), ...formas('mongolic', OA),
  ...formas('malparid', OA), ...formas('conchud', OA), ...formas('pajer', OA), ...formas('cornud', OA), ...formas('put', OA),
  ...formas('trol', OA), ...formas('retrasad', OA), ...formas('subnormal', ['', 'es']),
  'imbecil', 'imbeciles', 'idiota', 'idiotas', 'sorete', 'soretes', 'lacra', 'lacras', 'maricon', 'maricones', 'chupapija', 'chupapijas',
  'hijo de puta', 'hija de puta', 'hijos de puta', 'hijas de puta', 'mierda', 'basura', 'escoria', 'cancer',
]
// «es una mierda» suele hablar de una cosa («la cursada es una mierda»): con «es/son» no cuentan estas.
const SOLO_SEGUNDA_PERSONA = new Set(['mierda', 'basura', 'cancer', 'escoria'])
const GRUPOS = [
  ...formas('negr', OA), ...formas('judi', OA), ...formas('bolivian', OA), ...formas('peruan', OA), ...formas('paraguay', OA),
  ...formas('chin', OA), ...formas('viller', OA), ...formas('put', OA), ...formas('trol', OA), ...formas('gord', OA),
  ...formas('discapacitad', OA), ...formas('autist', ['a', 'as']), ...formas('mogolic', OA),
  'bolita', 'bolitas', 'paragua', 'paraguas', 'trava', 'travas', 'travesti', 'travestis', 'gay', 'gays', 'lesbiana', 'lesbianas', 'zurdo', 'zurdos',
]
const INTENS = '(?:(?:re|muy|flor de|tremend[oa]|terrible|alt[oa]|grandisim[oa]|pedazo de) )*'

type Regla = { id: string, tipo: keyof typeof MOTIVOS, re: RegExp }
const r = (id: string, tipo: keyof typeof MOTIVOS, fuente: string): Regla => ({ id, tipo, re: new RegExp(fuente) })

const INS_TODOS = alt(INSULTOS)
const INS_TERCERA = alt(INSULTOS.filter((w) => !SOLO_SEGUNDA_PERSONA.has(w)))

const REGLAS: Regla[] = [
  // ---- Agresión dirigida ----
  r('sos_insulto', 'agresion', ' (?:sos|sois|eres|vos sos) (?:un |una |unos |unas )?' + INTENS + INS_TODOS + ' '),
  r('es_insulto', 'agresion', ' (?:es|son|sea|sean) (?:un |una |unos |unas )' + INTENS + INS_TERCERA + ' '),
  r('que_insulto_sos', 'agresion', ' (?:que|tremendo|flor de) ' + INS_TODOS + ' (?:que )?(?:sos|eres) '),
  r('pedazo_de', 'agresion', ' pedazo de ' + INS_TODOS + ' '),
  r('insulto_de_mierda', 'agresion', ' ' + INS_TERCERA + ' de mierda '),
  r('callate_insulto', 'agresion', ' (?:callate|calla|cerra el orto|cerra la boca) ' + INS_TODOS + ' '),
  r('cerra_el_orto', 'agresion', ' cerra (?:el|tu) ' + alt(['orto', 'culo', 'ojete']) + ' '),
  r('hdp', 'agresion', ' ' + alt(['hijo de puta', 'hija de puta', 'hijos de puta', 'hijas de puta', 'hijo de re puta', 'hdp', 'hijodeputa']) + ' '),
  r('hijo_de_mil_puta', 'agresion', ' hij+[oa]+s? de (?:re )?(?:mil )?put+a+s? '),
  r('concha_madre', 'agresion', ' (?:la )?(?:re )?' + alt(['concha', 'conchita']) + ' de (?:tu|su|la) ' + alt(['madre', 'hermana', 'vieja', 'abuela', 'mama']) + ' '),
  r('conchatumadre', 'agresion', ' ' + alt(['conchatumadre', 'conchetumare', 'conchesumadre']) + ' '),
  r('puta_que_te_pario', 'agresion', ' (?:la )?puta (?:madre )?que te (?:re )?pario '),
  r('andate_a', 'agresion', ' (?:andate|anda|vayanse|andense|anda te) a (?:la )?' + alt(['mierda', 'concha', 'puta', 'cagar', 'la concha de tu madre']) + ' '),
  r('metetela', 'agresion', ' (?:metetel[oa]|metansel[oa]|metetelo) (?:en el|por el) ' + alt(['orto', 'culo', 'ojete']) + ' '),
  // ---- Discriminación ----
  r('grupo_de_mierda', 'discriminacion', ' ' + alt(GRUPOS) + ' (?:de mierda|de porqueria|asquerosos?|asquerosas?) '),
  r('insulto_discriminatorio', 'discriminacion', ' ' + alt(['maricon', 'maricones', 'sudaca', 'sudacas', 'negrata', 'negratas', 'sidoso', 'sidosos', 'retrasado mental', 'retrasados mentales']) + ' '),
  r('mueran_grupo', 'discriminacion', ' (?:mueran|maten a|exterminen a) (?:los |las |todos los |todas las )' + alt(GRUPOS) + ' '),
  // ---- Amenazas e incitación a hacerse daño ----
  r('te_voy_a', 'amenaza', ' te (?:voy|vamos) a (?:' + alt(['matar', 'cagar a palos', 'cagar a trompadas', 'cagar a pinas', 'cagar a tiros', 'romper la cara', 'romper el orto', 'reventar', 'apunalar', 'pegar un tiro', 'prender fuego']) + ') '),
  r('te_cago_a', 'amenaza', ' te (?:cago|cagamos) a ' + alt(['palos', 'trompadas', 'pinas', 'tiros', 'patadas']) + ' '),
  r('ojala_te', 'amenaza', ' ojala (?:te|que te) ' + alt(['mueras', 'muras', 'maten', 'violen', 'agarre cancer', 'de cancer', 'pise un tren', 'pise un auto', 'pise un colectivo']) + ' '),
  r('autolesion', 'amenaza', ' ' + alt(['matate', 'suicidate', 'ahorcate', 'cortate las venas', 'tirate de un puente', 'tirate de un edificio', 'tirate abajo de un tren', 'andate a matar', 'deberias matarte', 'deberias suicidarte', 'mejor matate']) + ' '),
  // ---- Acoso o contenido sexual ----
  r('te_voy_a_sexual', 'sexual', ' (?:te|la|lo) (?:voy a|quiero|vamos a) ' + alt(['coger', 'cojer', 'garchar', 'violar', 'culear']) + ' '),
  r('chupame', 'sexual', ' (?:chupame|chupen|chupenme|chupala|chupalo|mamame) (?:la |el |las |los )?' + alt(['pija', 'verga', 'poronga', 'pito', 'bolas', 'huevos', 'concha', 'pene']) + ' '),
  r('chupala', 'sexual', ' ' + alt(['chupala', 'chupame la pija', 'chupapija']) + ' '),
  r('pack', 'sexual', ' (?:pasame|mandame|pasa|manda|vendo|compro) (?:el |tu |un |tus )?' + alt(['pack', 'nudes', 'fotos en bolas', 'fotos desnuda', 'fotos desnudo', 'fotos hot']) + ' '),
]

// Datos de pacientes: sobre el texto original (con números).
const REGLAS_DATOS: { id: string, re: RegExp }[] = [
  { id: 'dni_rotulado', re: /\bd\.?\s?n\.?\s?i\.?(?:\s*(?:n[°ºo.]?|nro\.?|n[uú]mero|:|#))?\s*\d{1,2}[.\s]?\d{3}[.\s]?\d{3}\b/i },
  { id: 'dni_con_puntos', re: /(?<![$\d.,]\s?)\b\d{2}\.\d{3}\.\d{3}\b(?!\s*(?:pesos|ars|\$|usd|dolares|dólares))/i },
  { id: 'cuil', re: /\b(?:20|23|24|27)-\d{8}-\d\b/ },
  { id: 'historia_clinica', re: /\b(?:h\.?\s?c\.?|historia\s+cl[ií]nica)\s*(?:n[°ºo.]?|nro\.?|n[uú]mero|#|:)?\s*\d{4,}/i },
]

// Lo más grave primero: «putos de mierda» es discriminación antes que agresión.
const PRIORIDAD = ['discriminacion', 'amenaza', 'sexual', 'agresion']
const REGLAS_POR_PRIORIDAD = [...REGLAS].sort((a, b) => PRIORIDAD.indexOf(a.tipo) - PRIORIDAD.indexOf(b.tipo))

export function revisarTexto(texto: string): ResultadoFiltro | null {
  const original = String(texto || '')
  if (!original.trim()) return null
  for (const d of REGLAS_DATOS) {
    if (d.re.test(original)) return { categoria: MOTIVOS.pacientes[0], motivo: MOTIVOS.pacientes[1], regla: d.id }
  }
  const norm = normalizar(original)
  for (const regla of REGLAS_POR_PRIORIDAD) {
    if (regla.re.test(norm)) return { categoria: MOTIVOS[regla.tipo][0], motivo: MOTIVOS[regla.tipo][1], regla: regla.id }
  }
  return null
}

// Seudónimos: además de las reglas de texto, no pueden CONTENER palabras ofensivas ni estar formados por ellas.
const SUBCADENAS_SEUDONIMO = ['hijodeputa', 'hdp', 'pelotud', 'mierda', 'verga', 'poronga', 'garcha', 'mogolic', 'mongolic', 'maricon',
  'sudaca', 'negrata', 'nazi', 'hitler', 'violador', 'pedofil', 'conchatumadre', 'conchadetumadre', 'chupapija', 'chupala', 'forro', 'sorete', 'malparid']
const PALABRAS_SEUDONIMO = new Set(['puto', 'puta', 'putos', 'putas', 'trolo', 'trola', 'trava', 'pija', 'pito', 'culo', 'orto', 'ojete', 'teta', 'tetas',
  'concha', 'garche', 'coger', 'cogeme', 'pajero', 'pajera', 'idiota', 'imbecil', 'boludo', 'boluda', 'tarado', 'tarada', 'gil', 'ano', 'pene', 'vagina'])

export function revisarSeudonimo(seudonimo: string): ResultadoFiltro | null {
  const norm = normalizar(seudonimo)
  const junto = norm.replace(/ /g, '')
  const palabras = norm.trim().split(' ')
  if (SUBCADENAS_SEUDONIMO.some((s) => junto.includes(s)) || palabras.some((p) => PALABRAS_SEUDONIMO.has(p))) {
    return { categoria: MOTIVOS.seudonimo[0], motivo: MOTIVOS.seudonimo[1], regla: 'seudonimo' }
  }
  const texto = revisarTexto(seudonimo)
  return texto ? { ...texto, motivo: MOTIVOS.seudonimo[1] } : null
}
