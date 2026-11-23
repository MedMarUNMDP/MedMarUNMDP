// Modos v3.8: Sandbox infinito y Foco por núcleo (src/core/modos.js + escena Arena).
const assert = require('node:assert/strict');
const test = require('node:test');

const Modos = require('../src/core/modos.js');
const Agentes = require('../src/data/agentes.js');
const { createScene } = require('./helpers/arena-harness.cjs');

test('Foco por núcleo: solo agentes del núcleo, su tejido, su jefe y pesos que suman 1', () => {
  for (const n of Agentes.NUCLEOS) {
    const m = Modos.crearModo({ modo: 'nucleo', nucleo: n.id }, Agentes);
    assert.equal(m.rankingModo, `nucleo-${n.id}`);
    assert.ok(Modos.esModoRankingValido(m.rankingModo));
    assert.ok(m.agentes.length >= 5, `núcleo ${n.id} con pocos agentes`);
    for (const id of m.agentes) assert.ok(Agentes.agente(id).nucleos.includes(n.id));
    assert.equal(m.jefes.length, 1);
    assert.equal(m.jefes[0].agente, n.jefe.agente);
    assert.ok(Modos.MAPA_NUCLEO[n.id], `núcleo ${n.id} sin tejido`);
    const suma = Object.values(m.pesos).reduce((s, v) => s + v, 0);
    assert.ok(Math.abs(suma - 1) < 1e-9);
    for (const f of Modos.FAMILIAS) {
      const tiene = m.agentes.some((id) => Agentes.agente(id).familia === f);
      assert.equal(m.pesos[f] > 0, tiene, `núcleo ${n.id}: peso de ${f}`);
    }
  }
});

test('Sandbox mezcla todos los agentes confirmados y los jefes de todos los núcleos; un núcleo inválido cae en Sandbox', () => {
  const m = Modos.crearModo({ modo: 'sandbox' }, Agentes);
  assert.equal(m.rankingModo, 'sandbox');
  assert.equal(m.agentes.length, Agentes.AGENTES.filter((a) => a.nucleos.length).length);
  assert.equal(m.jefes.length, Agentes.NUCLEOS.length);
  assert.equal(Modos.crearModo({ modo: 'nucleo', nucleo: '99' }, Agentes).id, 'sandbox');
  for (const malo of ['', 'nucleo-99', 'sandbox; drop', 'nucleo-1']) assert.equal(Modos.esModoRankingValido(malo), false);
});

test('el puntaje de la escena es el mismo que calcula el servidor', () => {
  const { scene: s } = createScene({ seed: 3, modo: 'sandbox', infectionDifficulty: 'inmunosuprimido', evolutionDifficulty: 'infectologo' });
  s.kills = 137; s.elapsed = 301.7; s.correctAnswers = 9;
  assert.equal(s.getScore(), Math.floor((1370 + 602 + 225) * 1.5 * 1.5));
  const p = s.getRankingPayload(s.getScore());
  assert.equal(p.modo, 'sandbox');
  assert.equal(Modos.calcularPuntaje(p), p.puntaje);
});

test('en Foco por núcleo los enemigos son solo de ese núcleo y el jefe es el del núcleo, en el centro', () => {
  for (const nucleo of ['7.1', '11', '13-14']) {
    const { scene: s, loaded } = createScene({ seed: 11, modo: 'nucleo', nucleo });
    const { agente } = loaded.context.InmuneAgentes;
    for (let i = 0; i < 60; i++) s.spawnEnemy();
    const comunes = s.enemies.filter((e) => !e.isBoss);
    assert.ok(comunes.length >= 40);
    for (const e of comunes) {
      const a = agente(e.agente);
      assert.ok(a, `enemigo sin especie en núcleo ${nucleo}`);
      assert.ok(a.nucleos.includes(nucleo), `${a.id} no es del núcleo ${nucleo}`);
    }
    s.player.setPosition(800, 800);
    s.spawnBoss();
    const jefe = s.enemies.find((e) => e.isBoss);
    assert.equal(jefe.agente, Agentes.nucleo(nucleo).jefe.agente);
    assert.ok(Math.hypot(jefe.x - 1500, jefe.y - 1500) < 1, 'el jefe emerge en el centro');
    assert.deepEqual([...s.requiredBossIds()], [`jefe-${Agentes.nucleo(nucleo).jefe.agente}`]);
  }
});

test('Sandbox alterna jefes clásicos y de núcleo; el Laboratorio no manda puntaje', () => {
  const { scene: s } = createScene({ seed: 4, modo: 'sandbox' });
  assert.equal(s.bossSpecs.length, 4 + Agentes.NUCLEOS.length);
  assert.equal(s.bossSpecs.slice(0, 8).filter((b) => b.agenteJefe).length, 4, 'los primeros 8 alternan clásico y núcleo');
  const lab = createScene({ seed: 4, modo: 'sandbox', debugMode: true }).scene;
  assert.equal(lab.getRankingPayload(100), null);
});

test('una partida larga real (bot invulnerable, 6 min, inmunosuprimido) pasa los topes del servidor', () => {
  const h = createScene({ seed: 9, modo: 'sandbox', infectionDifficulty: 'inmunosuprimido', evolutionDifficulty: 'no_curse' });
  h.scene.damagePlayer = () => {};
  const FRAME = 1000 / 60;
  for (let i = 0; i < 360 * 60; i++) {
    const s = h.scene;
    s.joyActive = true; s.joyVector = { x: Math.cos(i / 240), y: Math.sin(i / 300) };
    if (Math.hypot(s.player.x - 1500, s.player.y - 1500) > 600) s.joyVector = { x: (1500 - s.player.x) / 600, y: (1500 - s.player.y) / 600 };
    s.update(0, FRAME); h.flushTweens();
    if (s.questionPaused) {
      if (s.pendingFocusOptions) s.chooseFocusEvolution(s.pendingFocusOptions[0].id);
      else if (s.currentQuestion && !s.pendingQuestionOutcome) s.answerQuestion(s.currentQuestion.c);
      else if (s.pendingQuestionOutcome === 'correct') { s.continueAfterQuestion(); s.chooseUpgrade('cytotoxicity'); }
      else if (s.pendingQuestionOutcome) s.continueAfterQuestion();
    }
  }
  const p = h.scene.getRankingPayload(h.scene.getScore());
  assert.ok(p.segundos >= 300, `la partida se trabó a los ${p.segundos} s`);
  assert.ok(Modos.esPartidaPlausible(p), `partida rechazada: ${JSON.stringify(p)}`);
});
