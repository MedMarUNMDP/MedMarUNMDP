// Consistencia del catálogo de agentes y núcleos (src/data/agentes.js). Ver docs/plan-modos-nucleos.md.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const datos = require('../src/data/agentes.js');
const { FAMILIAS, RASGOS, MORFOLOGIAS, AGENTES, NUCLEOS, EXCLUIDOS } = datos;
const assets = path.resolve(__dirname, '..', 'assets');

test('ids de agentes únicos y en kebab-case', () => {
  const ids = AGENTES.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length, 'hay ids repetidos');
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, id);
});

test('cada agente tiene familia, morfología y rasgos válidos', () => {
  for (const a of AGENTES) {
    assert.ok(FAMILIAS.includes(a.familia), `${a.id}: familia ${a.familia}`);
    assert.ok(MORFOLOGIAS[a.morfologia], `${a.id}: morfología ${a.morfologia}`);
    for (const r of a.rasgos) assert.ok(RASGOS[r], `${a.id}: rasgo ${r}`);
  }
});

test('cada morfología apunta a una textura WebP existente', () => {
  for (const [id, m] of Object.entries(MORFOLOGIAS)) {
    assert.ok(fs.existsSync(path.join(assets, `${m.textura}.webp`)), `${id}: falta assets/${m.textura}.webp`);
    assert.ok(['existe', 'variacion', 'nuevo'].includes(m.estado), `${id}: estado ${m.estado}`);
  }
});

test('cada agente está en al menos un núcleo (confirmado o a confirmar) y los núcleos existen', () => {
  const ids = new Set(NUCLEOS.map((n) => n.id));
  for (const a of AGENTES) {
    assert.ok(a.nucleos.length + a.nucleosAConfirmar.length > 0, `${a.id} no está en ningún núcleo`);
    for (const n of [...a.nucleos, ...a.nucleosAConfirmar]) assert.ok(ids.has(n), `${a.id}: núcleo ${n} inexistente`);
    for (const n of a.nucleosAConfirmar) assert.ok(!a.nucleos.includes(n), `${a.id}: ${n} confirmado y a confirmar a la vez`);
  }
});

test('un jefe por núcleo, distinto en cada uno y perteneciente a ese núcleo', () => {
  const jefes = NUCLEOS.map((n) => n.jefe.agente);
  assert.equal(new Set(jefes).size, jefes.length, 'hay jefes repetidos entre núcleos');
  for (const n of NUCLEOS) {
    const ag = datos.agente(n.jefe.agente);
    assert.ok(ag, `${n.id}: jefe ${n.jefe.agente} no existe`);
    assert.ok(ag.nucleos.includes(n.id), `${n.id}: el jefe ${ag.id} no pertenece al núcleo`);
    for (const r of n.jefe.rasgos) assert.ok(RASGOS[r], `${n.id}: rasgo de jefe ${r}`);
  }
});

test('cada núcleo tiene variedad suficiente para una partida', () => {
  for (const n of NUCLEOS) {
    const ags = datos.agentesDeNucleo(n.id);
    assert.ok(ags.length >= 5, `${n.id} tiene solo ${ags.length} agentes`);
    // El material de 6.1 (urinario) solo trae bacterias: es un dato de la cátedra, no un error de carga.
    if (n.id !== '6.1') assert.ok(new Set(ags.map((a) => a.familia)).size >= 2, `${n.id} tiene una sola familia`);
    assert.ok(fs.existsSync(path.join(assets, `${n.tejido}.webp`)), `${n.id}: falta el tejido ${n.tejido}`);
  }
});

test('los núcleos 1-5 y los artrópodos grandes quedan afuera', () => {
  const nucleos = new Set(NUCLEOS.map((n) => n.id));
  for (const n of EXCLUIDOS.nucleos) assert.ok(!nucleos.has(n), `núcleo ${n} debería estar excluido`);
  const nombres = AGENTES.map((a) => a.nombre.toLowerCase());
  for (const ex of EXCLUIDOS.agentes) {
    const genero = ex.split(' ')[0].toLowerCase();
    assert.ok(!nombres.some((nm) => nm.startsWith(genero)), `${ex} está excluido y figura como agente`);
  }
});
