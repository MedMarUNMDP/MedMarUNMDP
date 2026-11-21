// Tests de la escena Arena completa (game.js) corriendo en Node con el arnés de tests/helpers.
// Un bug conocido sin corregir va como `test(..., { todo: 'motivo' }, ...)`: se ejecuta y se reporta, pero no
// rompe `npm test` (el deploy de Pages corre los tests). Al corregirlo, se le saca el `todo`.
// Códigos (JUEGO-01…) en docs/diagnostico-2026-11.md.
const assert = require('node:assert/strict');
const test = require('node:test');

const { createScene } = require('./helpers/arena-harness.cjs');

const FRAME_MS = 1000 / 60;

// Bot mínimo: se aleja de los enemigos cercanos, va al ADN más cercano y no se pega al borde.
function bot(scene) {
  const p = scene.player;
  let vx = 0, vy = 0;
  for (const e of scene.enemies) {
    if (e.dead) continue;
    const dx = p.x - e.x, dy = p.y - e.y, d2 = Math.max(400, dx * dx + dy * dy);
    if (d2 < 300 * 300) { vx += dx / d2 * 900; vy += dy / d2 * 900; }
  }
  let best = null, bestD = Infinity;
  for (const drop of scene.xpDrops) {
    const d = (drop.x - p.x) ** 2 + (drop.y - p.y) ** 2;
    if (!drop.collected && d < bestD) { bestD = d; best = drop; }
  }
  if (best) { const d = Math.sqrt(bestD) || 1; vx += (best.x - p.x) / d * 1.2; vy += (best.y - p.y) / d * 1.2; }
  const cx = 1500 - p.x, cy = 1500 - p.y, cd = Math.hypot(cx, cy);
  if (cd > 700) { vx += cx / cd * 1.5; vy += cy / cd * 1.5; }
  const len = Math.hypot(vx, vy);
  scene.joyActive = len > 0.05;
  scene.joyVector = { x: len ? vx / Math.max(1, len) : 0, y: len ? vy / Math.max(1, len) : 0 };
}

// Responde lo que esté pendiente: preguntas (bien), vías (alternando) y evoluciones de foco (la primera).
function autoResponder(scene, vias = ['homeostasis', 'cytotoxicity', 'chemotaxis']) {
  if (!scene.questionPaused) return;
  if (scene.pendingFocusOptions) { scene.chooseFocusEvolution(scene.pendingFocusOptions[0].id); return; }
  if (scene.currentQuestion && !scene.pendingQuestionOutcome) { scene.answerQuestion(scene.currentQuestion.c); return; }
  if (scene.pendingQuestionOutcome === 'correct') {
    scene.continueAfterQuestion();
    scene.chooseUpgrade(vias[scene.evolutionChoiceCount % vias.length]);
  } else if (scene.pendingQuestionOutcome === 'wrong') scene.continueAfterQuestion();
}

function simulate(harness, seconds, onFrame) {
  const frames = Math.round(seconds * 1000 / FRAME_MS);
  for (let i = 0; i < frames && !harness.scene.gameEnded; i++) {
    bot(harness.scene);
    harness.scene.update(0, FRAME_MS);
    harness.flushTweens();
    autoResponder(harness.scene);
    if (onFrame) onFrame(harness.scene);
  }
}

const nonFiniteStats = (scene) =>
  Object.entries(scene.stats).filter(([, v]) => typeof v === 'number' && !Number.isFinite(v)).map(([k]) => k);

// Opciones de vía que ofrece la escena, como lo hace chooseUpgrade.
function prepararEleccion(scene, loaded) {
  scene.questionPaused = true;
  scene.pendingQuestionOutcome = 'correct';
  scene.currentUpgrades = loaded.EVOLUTION_STRATEGIES;
}

test('la escena arranca con el estado inicial esperado', () => {
  const { scene, emitted } = createScene({ seed: 1 });
  assert.equal(scene.stats.health, 100);
  assert.deepEqual([...scene.activeSkills], ['granules']);
  assert.equal(scene.enemies.length, 0);
  assert.equal(scene.xpNeed, 150);
  assert.ok(emitted.some((e) => e.name === 'is:run-start'));
});

test('con la misma semilla la partida simulada es idéntica (simulación determinista)', () => {
  const resumen = (seed) => {
    const h = createScene({ seed });
    simulate(h, 30);
    const s = h.scene;
    return { kills: s.kills, xp: Math.round(s.xp), hp: Math.round(s.stats.health), enemigos: s.enemies.length };
  };
  assert.deepEqual(resumen(7), resumen(7));
});

test('2 min de partida con preguntas y mejoras: topes respetados, sin NaN ni congelamiento', () => {
  const h = createScene({ seed: 3 });
  h.scene.damagePlayer = () => {}; // invulnerable: el bot es simple y lo que se prueba son los sistemas
  const max = { enemigos: 0, adn: 0, textos: 0 };
  simulate(h, 120, (s) => {
    max.enemigos = Math.max(max.enemigos, s.enemies.filter((e) => !e.dead && !e.isBoss).length);
    max.adn = Math.max(max.adn, s.xpDrops.length);
    max.textos = Math.max(max.textos, s.floatingTexts.length);
  });
  const s = h.scene;
  assert.ok(s.elapsed > 115, `la partida se trabó a los ${Math.round(s.elapsed)} s`);
  assert.ok(s.questionCount >= 1, 'debería haber al menos una pregunta en 2 min');
  assert.ok(max.enemigos <= s.maxEnemyCount, `enemigos ${max.enemigos} > tope ${s.maxEnemyCount}`);
  assert.ok(max.adn <= s.maxXpDrops, `ADN ${max.adn} > tope ${s.maxXpDrops}`);
  assert.ok(max.textos <= s.maxFloatingTexts, `textos ${max.textos} > tope ${s.maxFloatingTexts}`);
  assert.deepEqual(nonFiniteStats(s), []);
  assert.ok(s.enemies.every((e) => Number.isFinite(e.hp)));
});

// ---------- regresiones de los bugs del diagnóstico 2026-11 (corregidos en v3.5) ----------

test('JUEGO-01: subir de nivel abre una pregunta sin congelar la partida', () => {
  const { scene, emitted } = createScene({ seed: 2 });
  scene.xp = scene.xpNeed;
  assert.doesNotThrow(() => scene.openQuestion());
  assert.ok(emitted.some((e) => e.name === 'is:question'), 'debería emitirse is:question');
  assert.ok(scene.currentQuestion, 'debería quedar una pregunta activa');
});

test('JUEGO-01: responder bien ofrece las vías y elegir una reanuda la partida', () => {
  const { scene, emitted } = createScene({ seed: 2 });
  scene.xp = scene.xpNeed;
  scene.openQuestion();
  scene.answerQuestion(scene.currentQuestion.c);
  scene.continueAfterQuestion();
  assert.ok(emitted.some((e) => e.name === 'is:upgrades'));
  scene.chooseUpgrade('cytotoxicity');
  assert.equal(scene.questionPaused, false);
});

test('JUEGO-02: el Estallido respiratorio que desbloquea Fagocitosis nivel 3 hace daño finito', () => {
  const h = createScene({ seed: 4 });
  const s = h.scene;
  s.activeSkills.add('phagocytosis');
  s.skillLevels.phagocytosis = 1;
  s.applySkillEvolution('phagocytosis', 2);
  s.applySkillEvolution('phagocytosis', 3);
  assert.ok(s.activeSkills.has('respiratory_burst'));
  assert.equal(s.skillLevels.respiratory_burst, 1);

  s.stats.phagoMaxTier = 3;
  const cerca = (dx) => s.spawnEnemy('bacteria', false, { x: s.player.x + dx, y: s.player.y });
  cerca(30); cerca(70); cerca(-70);
  for (const e of s.enemies) { e.phagoEligible = true; e.sizeTier = 0; }
  s.phagoClock = 0;
  s.doPhagocytosis();
  h.flushTweens();

  assert.ok(s.kills >= 1, 'la fagocitosis debería englobar al más cercano');
  assert.ok(s.enemies.every((e) => Number.isFinite(e.hp)), 'ningún enemigo debería quedar con vida NaN');
  assert.ok(Number.isFinite(s.damageTotal));
});

test('JUEGO-03: el jefe emerge en el centro y no hace daño de contacto durante la entrada', () => {
  const { scene: s } = createScene({ seed: 5 });
  s.player.setPosition(1500, 1500); // el jugador arranca en el centro, justo donde emerge el jefe
  s.spawnBoss();
  const boss = s.enemies.find((e) => e.isBoss);
  assert.ok(boss, 'debería existir un jefe');
  assert.ok(Math.hypot(boss.x - 1500, boss.y - 1500) < 1, 'el jefe emerge en el centro de la arena');
  const vida = s.stats.health;
  s.updateEnemies(500, 0.5); // dentro de la ventana de entrada
  assert.equal(s.stats.health, vida, 'durante la entrada no debería dañar al jugador');
  for (let i = 0; i < 6; i++) { s.player.setPosition(boss.x, boss.y); s.invulnerable = 0; s.updateEnemies(500, 0.5); }
  assert.ok(s.stats.health < vida, 'pasada la entrada, el contacto sí hace daño');
});

test('JUEGO-04: Fagocitosis expansiva habilita los patógenos grandes (tamaño 2) desde la primera vez', () => {
  const { scene, loaded } = createScene({ seed: 6 });
  const expansiva = loaded.EVOLUTION_STRATEGIES.find((x) => x.id === 'homeostasis').advanced.find((u) => u.name === 'Fagocitosis expansiva');
  expansiva.apply(scene);
  assert.equal(scene.stats.phagoMaxTier, 2);
});

test('JUEGO-05: las vías solo ofrecen mejoras de habilidades que el jugador tiene', () => {
  const { scene, loaded } = createScene({ seed: 7 });
  const comprobar = () => {
    for (const opcion of scene.getEvolutionOptions()) {
      const via = loaded.EVOLUTION_STRATEGIES.find((x) => x.id === opcion.id);
      const mejora = [...via.basics, ...via.advanced].find((u) => u.name === opcion.nextName);
      assert.ok(mejora, `no encontré la mejora ${opcion.nextName}`);
      const req = [].concat(mejora.requires || []);
      assert.ok(!req.length || req.some((id) => scene.activeSkills.has(id)), `${opcion.nextName} requiere ${req.join('/')} y el jugador no la tiene`);
    }
  };
  for (let n = 0; n < 15; n++) {
    scene.evolutionCounts = { homeostasis: n, cytotoxicity: n, chemotaxis: n };
    comprobar();
  }
  // Con fagocitosis activa, Homeostasis vuelve a ofrecer sus mejoras de fagocitosis.
  scene.activeSkills.add('phagocytosis');
  const nombres = new Set();
  for (let n = 0; n < 10; n++) {
    scene.evolutionCounts.homeostasis = n;
    nombres.add(scene.getEvolutionOptions().find((o) => o.id === 'homeostasis').nextName);
  }
  assert.ok(nombres.has('Fagocitosis eficaz'));
});

test('JUEGO-05: cada elección de Homeostasis o Quimiotaxis sin habilidades extra cambia algún atributo', () => {
  for (const via of ['homeostasis', 'chemotaxis']) {
    const { scene, loaded } = createScene({ seed: 8 });
    for (let i = 0; i < 9; i++) {
      const antes = JSON.stringify(scene.stats);
      prepararEleccion(scene, loaded);
      scene.chooseUpgrade(via);
      assert.notEqual(JSON.stringify(scene.stats), antes, `la elección ${i + 1} de ${via} no cambió nada`);
    }
  }
});

test('topes únicos: ninguna combinación de mejoras baja de los mínimos de LIMITS', () => {
  const { scene, loaded } = createScene({ seed: 9 });
  const { LIMITS } = loaded.context.InmuneGameBalance;
  scene.activeSkills.add('phagocytosis');
  scene.activeSkills.add('netosis');
  const todas = loaded.EVOLUTION_STRATEGIES.flatMap((x) => [...x.basics, ...x.advanced]);
  for (let ronda = 0; ronda < 60; ronda++) {
    for (const u of todas) u.apply(scene);
    scene.applySkillEvolution('phagocytosis', 3);
    scene.applySkillEvolution('netosis', 3);
    scene.applyAlternationBonus('homeostasis');
  }
  assert.equal(scene.stats.phagoInterval, LIMITS.minimumPhagocytosisIntervalMs);
  assert.equal(scene.stats.netCooldown, LIMITS.minimumNetCooldownMs);
  assert.equal(scene.stats.maxNetHelpers, LIMITS.maximumNetHelpers);
});

test('JUEGO-06: al cerrar la escena se saca el listener de resize del ScaleManager global', () => {
  const { scene } = createScene({ seed: 10 });
  assert.equal(scene.scale.count('resize'), 1);
  scene.destroyTransientObjects();
  assert.equal(scene.scale.count('resize'), 0);
});

test('JUEGO-07: el historial de una evolución muestra el cambio real (antes → después)', () => {
  const { scene } = createScene({ seed: 12 });
  scene.activeSkills.add('phagocytosis');
  scene.skillLevels.phagocytosis = 1;
  scene.questionPaused = true;
  scene.pendingFocusOptions = [{ id: 'phagocytosis:upgrade', skill: 'phagocytosis' }];
  scene.chooseFocusEvolution('phagocytosis:upgrade');
  const ultima = scene.upgradeHistory.at(-1);
  assert.match(ultima.detail, /Radio \+9 \(50→59\)/);
  assert.equal(scene.stats.phagoRadius, 59);
});

test('JUEGO-09: no se puede pausar con una pregunta abierta; pausar y reanudar funcionan', () => {
  const { scene } = createScene({ seed: 11 });
  scene.questionPaused = true;
  scene.pauseGame();
  assert.equal(scene.manualPaused, false);
  scene.questionPaused = false;
  scene.pauseGame();
  assert.equal(scene.manualPaused, true);
  scene.resumeGame();
  assert.equal(scene.manualPaused, false);
});

test('JUEGO-08: las opciones plausibles de la pregunta del frotis delgado responden esa pregunta', () => {
  const { loaded } = createScene({ seed: 13 });
  const opciones = loaded.PLAUSIBLE_OPTIONS['hard-blood-smear-quant-01'];
  assert.match(opciones[0], /especie/);
  const largos = opciones.map((o) => o.length);
  assert.ok(largos[0] < Math.max(...largos), 'la correcta no debería ser la opción más larga');
});

// ---------- v3.6: pseudópodos, animaciones, parallax ----------

test('pseudópodos: con un patógeno fagocitable cerca lo marcan y avisan las primeras veces', () => {
  const { scene: s } = createScene({ seed: 14 });
  s.activeSkills.add('phagocytosis');
  s.skillLevels.phagocytosis = 1;
  s.spawnEnemy('bacteria', false, { x: s.player.x + 60, y: s.player.y });
  for (const e of s.enemies) { e.phagoEligible = true; e.sizeTier = 0; }
  const textosAntes = s.floatingTexts.length;
  assert.doesNotThrow(() => s.updatePhagoTendrils());
  assert.equal(s.phagoHintsLeft, 2, 'debería consumir una pista');
  assert.ok(s.floatingTexts.length > textosAntes, 'debería mostrar "FAGOCITABLE"');
  s.enemies.length = 0;
  assert.doesNotThrow(() => s.updatePhagoTendrils(), 'sin blanco los pseudópodos tantean sin errores');
});

test('animaciones: los enemigos aparecen con rebote y terminan en su escala normal', () => {
  const { scene: s } = createScene({ seed: 15 });
  for (const tipo of ['bacteria', 'virus', 'fungus', 'parasite']) s.spawnEnemy(tipo, false, { x: s.player.x + 400, y: s.player.y });
  for (let i = 0; i < 30; i++) s.updateEnemies(1000 / 60, 1 / 60);
  for (const e of s.enemies.filter((x) => !x.isWorm)) {
    assert.equal(e.spawnAge, 1);
    assert.ok(Number.isFinite(e.obj.rotation));
  }
});

test('parallax: se crean las capas de ambiente y la cámara de HUD', () => {
  const { scene: s } = createScene({ seed: 16 });
  assert.ok(s.ambientLayers.length >= 1);
  assert.ok(s.hudCam, 'debería existir la cámara de HUD');
  assert.doesNotThrow(() => s.updateAmbientLayers());
});
