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

// ---------- Tope de eliminaciones: no se puede eliminar más de lo que pudo aparecer (v3.12) ----------

test('maxApariciones crece con el tiempo, acelera con los minutos y rechaza eliminaciones imposibles', () => {
  const tope = (segundos, extra = {}) => Modos.maxApariciones({ segundos, dificultadInfeccion: 'internado', ...extra });
  assert.ok(tope(120) > tope(60) && tope(600) > tope(300));
  assert.ok(tope(1200) / 1200 > tope(120) / 120, 'el ritmo de aparición sube con el tiempo');
  assert.ok(tope(1200, { multirresistencia: 600, jefes: 2 }) > tope(1200), 'la multirresistencia agrega apariciones');
  assert.equal(tope(1200, { multirresistencia: 60, jefes: 2 }), tope(1200), 'multirresistencia antes de los 120 s no cuenta');
  assert.equal(tope(1200, { multirresistencia: 600, jefes: 0 }), tope(1200), 'multirresistencia sin jefes vencidos no cuenta');
  assert.ok(tope(300, { preguntas: 10, correctas: 0 }) > tope(300, { preguntas: 10, correctas: 10 }), 'las respuestas incorrectas traen oleadas');
  const base = { segundos: 300, correctas: 5, preguntas: 5, jefes: 1, dificultadInfeccion: 'internado' };
  assert.ok(Modos.esPartidaPlausible({ ...base, kills: 900, aparecidos: 950 }));
  assert.ok(!Modos.esPartidaPlausible({ ...base, kills: 50000 }), 'eliminaciones muy por encima de lo que puede aparecer');
  assert.ok(!Modos.esPartidaPlausible({ ...base, kills: 960, aparecidos: 950 }), 'más eliminaciones que aparecidos');
  assert.ok(!Modos.esPartidaPlausible({ ...base, kills: 900, aparecidos: 50000 }), 'aparecidos imposibles');
});

test('partidas simuladas con un jugador muy fuerte nunca superan el tope de apariciones (las tres dificultades)', () => {
  const FRAME = 1000 / 60;
  for (const [dificultad, seed, erra] of [['ambulatorio', 11, false], ['internado', 12, true], ['inmunosuprimido', 13, false]]) {
    const h = createScene({ seed, modo: 'sandbox', infectionDifficulty: dificultad });
    const s = h.scene;
    s.damagePlayer = () => {};
    Object.assign(s.stats, { attackDamage: 400, projectileCount: 8, attackInterval: 160, projectilePierce: 6, attackRange: 900 });
    for (let i = 0; i < 180 * 60; i++) {
      s.joyActive = true; s.joyVector = { x: Math.cos(i / 240), y: Math.sin(i / 300) };
      if (Math.hypot(s.player.x - 1500, s.player.y - 1500) > 600) s.joyVector = { x: (1500 - s.player.x) / 600, y: (1500 - s.player.y) / 600 };
      s.update(0, FRAME); h.flushTweens();
      if (s.questionPaused) {
        if (s.pendingFocusOptions) s.chooseFocusEvolution(s.pendingFocusOptions[0].id);
        else if (s.currentQuestion && !s.pendingQuestionOutcome) s.answerQuestion(erra ? (s.currentQuestion.c + 1) % s.currentQuestion.a.length : s.currentQuestion.c);
        else if (s.pendingQuestionOutcome === 'correct') { s.continueAfterQuestion(); s.chooseUpgrade('cytotoxicity'); }
        else if (s.pendingQuestionOutcome) s.continueAfterQuestion();
      }
      if (i % 300 === 0 && i) {
        const p = s.getRankingPayload(s.getScore());
        const tope = Modos.maxApariciones(p);
        assert.ok(p.kills <= p.aparecidos, `${dificultad}: ${p.kills} eliminaciones > ${p.aparecidos} aparecidos`);
        assert.ok(p.aparecidos <= tope, `${dificultad} a los ${p.segundos} s: ${p.aparecidos} aparecidos > tope ${tope}`);
      }
    }
    assert.ok(s.kills > 300, `${dificultad}: el bot fuerte debería eliminar mucho (${s.kills})`);
    assert.ok(Modos.esPartidaPlausible(s.getRankingPayload(s.getScore())));
  }
});
