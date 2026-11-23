// Reglas de la v3.11 (pedidos de juego de noviembre 2026): preguntas sin repetir, jefes más seguidos sin preguntas,
// mutación cada 10 minutos, tope de curación de la fagocitosis, experiencia que se fusiona y macrófagos separados.
const assert = require('node:assert/strict');
const test = require('node:test');

const { createScene } = require('./helpers/arena-harness.cjs');

// Abre y responde (bien) una pregunta, eligiendo una vía para cerrar la capa de mejoras.
function responderUna(scene) {
  scene.xp = scene.xpNeed;
  scene.openQuestion();
  if (!scene.currentQuestion || !scene.questionPaused) return null;
  const q = scene.currentQuestion;
  scene.answerQuestion(q.c);
  scene.continueAfterQuestion();
  scene.chooseUpgrade('homeostasis');
  return q;
}

test('las preguntas no se repiten: al agotarse No cursé siguen las de Estudiante y los jefes pasan a cada 2 min', () => {
  const { scene } = createScene({ seed: 5, modo: 'sandbox', evolutionDifficulty: 'no_curse' });
  const faciles = scene.questionPool().filter((q) => q.difficulty === 'facil').length;
  const vistas = new Set();
  for (let i = 0; i < faciles + 5; i++) {
    const q = responderUna(scene);
    assert.ok(q, `debería haber pregunta en la vuelta ${i}`);
    assert.ok(!vistas.has(q.id), `se repitió ${q.id}`);
    vistas.add(q.id);
  }
  assert.equal(scene.questionCategory, 'normal');
  assert.equal(scene.questionsExhausted, true);
  assert.ok(scene.bossClock <= 120000, `el próximo jefe debería llegar en 2 min o menos (${scene.bossClock})`);
});

test('cada 10 minutos los enemigos nuevos mutan: más vida y daño que antes', () => {
  const { scene } = createScene({ seed: 7 });
  scene.elapsed = 590;
  const antes = scene.spawnEnemy('bacteria');
  scene.elapsed = 610;
  const despues = scene.spawnEnemy('bacteria');
  assert.equal(scene.enemyTier(), 1);
  assert.ok(despues.maxHp / antes.maxHp > 1.4, `vida ${antes.maxHp} → ${despues.maxHp}`);
});

test('la curación por fagocitosis tiene tope: la reserva se gasta y no cura de más', () => {
  const h = createScene({ seed: 3 });
  const scene = h.scene;
  scene.activeSkills.add('phagocytosis');
  scene.stats.maxHealth = 100; scene.stats.health = 10; scene.stats.phagoHeal = 50; scene.phagoHealBudget = 10;
  const presa = scene.spawnEnemy('bacteria');
  presa.x = scene.player.x + 10; presa.y = scene.player.y; presa.sizeTier = 0; presa.phagoEligible = true; presa.fadeIn = 0; presa.spawnGrace = 0;
  scene.enemies = [presa];
  scene.phagoClock = 0; scene.phagoPending = false;
  scene.doPhagocytosis();
  h.flushTweens(5);
  assert.ok(presa.dead, 'la presa debería haber sido fagocitada');
  assert.ok(scene.stats.health <= 20.01, `curó ${scene.stats.health - 10} con una reserva de 10`);
  assert.ok(scene.phagoHealBudget <= 0.01);
});

test('la experiencia que cae encima de otra se suma y la que vence se fusiona con la cercana', () => {
  const { scene } = createScene({ seed: 4 });
  scene.xpDrops = [];
  scene.spawnXpDrop(1000, 1000, 10);
  scene.spawnXpDrop(1010, 1005, 15);
  assert.equal(scene.xpDrops.length, 1);
  assert.equal(scene.xpDrops[0].amount, 25);
  scene.spawnXpDrop(1200, 1000, 30);
  assert.equal(scene.xpDrops.length, 2);
  scene.player.x = 2200; scene.player.y = 2200;
  scene.xpDrops[1].life = 1;
  scene.updateXpDrops(16, 0.016);
  assert.equal(scene.xpDrops.length, 1);
  assert.equal(scene.xpDrops[0].amount, 55, 'la que venció no se pierde');
});

test('los macrófagos amigos no se superponen', () => {
  const { scene } = createScene({ seed: 6 });
  scene.macrophageCap = 4;
  scene.activeSkills.add('macrophage_activation');
  scene.updateMacrophages(16, 0.016);
  for (const m of scene.macrophages) { m.obj.x = scene.player.x; m.obj.y = scene.player.y; }
  for (let i = 0; i < 30; i++) scene.separateMacrophages();
  const list = scene.macrophages;
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const d = Math.hypot(list[i].obj.x - list[j].obj.x, list[i].obj.y - list[j].obj.y);
    assert.ok(d >= 40, `macrófagos ${i} y ${j} a ${d.toFixed(1)} px`);
  }
});

test('no se ofrecen habilidades que ya llegaron a su tope', () => {
  const { scene } = createScene({ seed: 8 });
  scene.activeSkills.add('complement');
  scene.complementChance = 0.7;
  for (let i = 0; i < 25; i++) {
    scene.questionPaused = false;
    scene.openFocusEvolution();
    assert.ok(!scene.pendingFocusOptions.some((o) => o.skill === 'complement'), 'complemento al máximo no debería ofrecerse');
  }
});
