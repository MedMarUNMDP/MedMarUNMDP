// Tests del filtro automático de contenido (supabase/functions/api/filtro.ts). Corren con `npm test` (Node quita los tipos).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizar, revisarSeudonimo, revisarTexto } from '../functions/api/filtro.ts'

const retira = (texto: string, categoria?: string) => {
  const r = revisarTexto(texto)
  assert.ok(r, 'debería retirarse: ' + texto)
  if (categoria) assert.equal(r!.categoria, categoria, texto + ' → ' + r!.regla)
}
const permite = (texto: string) => {
  const r = revisarTexto(texto)
  assert.equal(r, null, 'debería permitirse: ' + texto + (r ? ' (regla ' + r.regla + ')' : ''))
}

test('normaliza tildes, leet, letras estiradas y separadas', () => {
  assert.equal(normalizar('Sos un P3L0TUDÓ!!'), ' sos un pelotudo ')
  assert.equal(normalizar('boluuuuudo'), ' boluudo ')
  assert.equal(normalizar('h.d.p'), ' hdp ')
  assert.equal(normalizar('forrrrro'), ' forro ')
})

test('retira insultos dirigidos', () => {
  for (const t of ['sos un pelotudo', 'Sos una re forra', 'vos sos un PELOTUDO de verdad', 'sos un p3l0tud0', 'sos un pelooootudo',
    'qué pelotudo que sos', 'el profe es un imbécil', 'pedazo de forro', 'callate pelotudo', 'cerrá el orto',
    'sos una mierda', 'hijo de puta', 'HDP', 'h.d.p.', 'la concha de tu madre', 'andate a la mierda', 'andá a cagar',
    'la puta que te parió', 'forro de mierda', 'sos un hijo de re mil puta']) retira(t, 'acoso')
})

test('permite malas palabras no dirigidas y el habla de todos los días', () => {
  for (const t of ['qué boludo, me olvidé el apunte', 'la puta madre, desaprobé', 'esta cursada es una mierda', 'qué mierda pasó con el aula',
    'che boludo, ¿alguien tiene el resumen?', 'callate que no te escucho, jaja', 'me re cagué en el parcial', 'qué forro el horario nuevo',
    'el foro de mierda no carga', 'te voy a buscar el apunte', 'te mato si no venís jaja', 'la vida es una basura a veces',
    'fumar es un cáncer', 'tengo el resumen de patología']) permite(t)
})

test('no filtra vocabulario médico', () => {
  for (const t of ['Lesiones del pene y la vagina', 'Abordaje de la víctima de violación en la guardia', 'Ideación suicida: evaluación del riesgo',
    'Cáncer de mama: estadificación', 'Paciente con hemorragia en el ano', 'Clasificación de las lesiones negras de piel',
    'Síndrome de Down: no usar términos como mogólico (es discriminatorio)', 'Pacientes trans y travestis: atención sin discriminación']) permite(t)
})

test('retira discriminación', () => {
  for (const t of ['negros de mierda', 'bolivianos de mierda', 'maricón', 'sudacas', 'putos de mierda', 'judíos asquerosos', 'maten a los gays'])
    retira(t, 'discriminacion')
})

test('retira amenazas e incitación a hacerse daño', () => {
  for (const t of ['te voy a matar', 'te cago a trompadas', 'ojalá te mueras', 'matate', 'suicidate', 'deberías matarte', 'te vamos a romper la cara'])
    retira(t, 'acoso')
})

test('retira acoso sexual', () => {
  for (const t of ['te voy a coger', 'chupame la pija', 'pasame el pack', 'mandame nudes']) retira(t, 'contenido_inapropiado')
})

test('datos de pacientes: DNI, CUIL e historia clínica; mails y teléfonos se permiten', () => {
  for (const t of ['Paciente Juan, DNI 34.567.890, ingresó por guardia', 'dni: 34567890', 'HC 123456', 'historia clínica n° 98765',
    'CUIL 20-34567890-3', 'el paciente 34.567.890 tiene']) retira(t, 'pacientes')
  for (const t of ['escribime a juan@gmail.com', 'mi cel es 223 512-3456', 'llamame al +54 9 223 5123456', 'vendo a $1.500.000',
    'cuesta 12.500.000 pesos', 'llevá el DNI al parcial', 'la HC hay que completarla entera', 'aula 3, 14 hs']) permite(t)
})

test('un NN.NNN.NNN cuenta como DNI solo con un rótulo cerca', () => {
  for (const t of ['documento 30.123.456', 'Paciente de 45 años: 28.765.432, derivada', 'HC: 34.111.222', 'el número es 33.444.555 (DNI)',
    'historia clínica del 41.222.333']) retira(t, 'pacientes')
  for (const t of ['La provincia tiene 46.044.703 habitantes', 'Argentina: 46.044.703 habitantes según el censo',
    'En 2022 hubo 12.345.678 consultas', 'el presupuesto fue de 10.500.000 y no alcanzó']) permite(t)
})

test('Compra venta: el contacto también pasa por el filtro (mismo revisarTexto)', () => {
  // La API concatena título, descripción, precio y contacto: un contacto agresivo se retira, uno normal no.
  retira('Vendo apuntes\nImpecables\n$5000\nescribime pelotudo, sos un forro', 'acoso')
  permite('Vendo apuntes\nImpecables\n$5000\nescribime al 223 512-3456')
})

test('seudónimos', () => {
  for (const s of ['ElPelotudo', 'hijodeputa22', 'La Puta Ama', 'Nazi_88', 'forro.total', 'sorete']) assert.ok(revisarSeudonimo(s), s)
  for (const s of ['Juan Pérez', 'Computadora', 'Anatomista', 'Conchita', 'Dr. House', 'Nazareno', 'Patricio', 'Escucha']) assert.equal(revisarSeudonimo(s), null, s)
})

test('seudónimos: apellidos y nombres reales que contienen una raíz ofensiva', () => {
  for (const s of ['Vergara', 'Lucía Vergara', 'Vergani', 'Nazira', 'Nazir', 'Nazim', 'Juan Gil', 'Gilda']) assert.equal(revisarSeudonimo(s), null, s)
  for (const s of ['Verga', 'VergaLoca', 'la verga 22', 'v3rga', 'Nazi', 'ElNazi', 'nazis_unidos', 'NeoNazi', 'Hitler88', 'Pelotudo99'])
    assert.ok(revisarSeudonimo(s), s)
})

test('trucos para esquivar el filtro: invisibles, cirílicas, inclusivo e intensificadores', () => {
  for (const t of ['sos un pelo​tudo', 'sos un pelo­tudo', 'ѕоѕ un pelotudo', 'sos un pelotudx', 'sos un forre',
    'sos re contra pelotudo', 'sos recontra forro', 'sos un boludo de mierda']) retira(t, 'acoso')
  for (const t of ['te re voy a matar', 'te voy a re matar', 'te voy a buscar a la salida', 'sé dónde vivís', 'ya sabemos dónde cursás']) retira(t, 'acoso')
  for (const t of ['me voy a matar estudiando', 'te voy a pasar el resumen', 'sé dónde queda el aula', 'sos un capo', 'la cursada es una mierda']) permite(t)
})
