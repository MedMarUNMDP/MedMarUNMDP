// Banco de preguntas por núcleo (src/data/preguntas-nucleos.js, generado desde docs/preguntas-nucleos/*.json).
const assert = require('node:assert/strict');
const test = require('node:test');

const Banco = require('../src/data/preguntas-nucleos.js');
const Agentes = require('../src/data/agentes.js');
const { createScene } = require('./helpers/arena-harness.cjs');

const MINIMO = { facil: 8, normal: 15, dificil: 10 };

test('cada núcleo tiene su banco con suficientes preguntas por dificultad', () => {
  for (const n of Agentes.NUCLEOS) {
    const propias = Banco.porNucleo(n.id);
    for (const [dif, min] of Object.entries(MINIMO)) {
      const cuantas = propias.filter((p) => p.difficulty === dif).length;
      assert.ok(cuantas >= min, `núcleo ${n.id}: ${cuantas} preguntas ${dif} (mínimo ${min})`);
    }
  }
});

test('formato: 4 opciones distintas, una correcta, explicación y fuente', () => {
  const ids = new Set();
  for (const p of Banco.PREGUNTAS) {
    assert.ok(!ids.has(p.id), `id repetido ${p.id}`); ids.add(p.id);
    assert.equal(p.a.length, 4, p.id);
    assert.equal(new Set(p.a).size, 4, p.id);
    assert.ok(p.c >= 0 && p.c < 4, p.id);
    assert.ok(p.exp.length > 20 && p.source.length > 5, p.id);
  }
});

test('la correcta no es sistemáticamente la opción más larga', () => {
  const masLarga = Banco.PREGUNTAS.filter((p) => p.a[p.c].length === Math.max(...p.a.map((x) => x.length))).length;
  const proporcion = masLarga / Math.max(1, Banco.PREGUNTAS.length);
  assert.ok(proporcion < 0.5, `la correcta es la más larga en el ${Math.round(proporcion * 100)} % de las preguntas`);
});

test('en Foco por núcleo solo aparecen preguntas de ese núcleo; en Sandbox, todas', () => {
  for (const nucleo of ['7', '13-14']) {
    const { scene: s } = createScene({ seed: 2, modo: 'nucleo', nucleo, evolutionDifficulty: 'estudiante' });
    const pool = s.questionPool();
    assert.ok(pool.length >= 30);
    assert.ok(pool.every((q) => q.nucleo === nucleo), `núcleo ${nucleo}: se coló una pregunta de otro núcleo`);
    for (let i = 0; i < 8; i++) {
      const q = s.selectUnusedQuestion();
      assert.equal(q.nucleo, nucleo);
      s.usedQuestionIds.add(q.id);
    }
  }
  const sandbox = createScene({ seed: 2, modo: 'sandbox', evolutionDifficulty: 'estudiante' }).scene.questionPool();
  assert.ok(sandbox.some((q) => !q.nucleo) && sandbox.some((q) => q.nucleo === '7') && sandbox.some((q) => q.nucleo === '11'));
  const noCurse = createScene({ seed: 2, modo: 'sandbox', evolutionDifficulty: 'no_curse' }).scene.questionPool();
  assert.ok(noCurse.every((q) => !q.nucleo), 'con «No cursé» el Sandbox usa solo el banco general');
});
