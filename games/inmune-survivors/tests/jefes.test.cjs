// Jefes de núcleo (v3.9): arte propio, mecánica de cada uno y selección desde el Laboratorio.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const Agentes = require('../src/data/agentes.js');
const { createScene } = require('./helpers/arena-harness.cjs');

const FRAME = 1000 / 60;

// Laboratorio en Sandbox (tiene todos los jefes), jugador invencible y sin ataque para que el jefe viva.
function escenaConJefe(agenteId, seed = 7) {
  const h = createScene({ seed, modo: 'sandbox', debugMode: true });
  const s = h.scene;
  s.debugInvincible = true;
  s.activeSkills.delete('granules');
  s.player.setPosition(1500, 1800);
  s.debugAction(`boss:jefe-${agenteId}`);
  const jefe = s.enemies.find((e) => e.isBoss);
  return { h, s, jefe };
}
function correr(h, segundos, cadaCuadro) {
  for (let i = 0; i < segundos * 60; i++) { h.scene.update(0, FRAME); h.flushTweens(); if (cadaCuadro) cadaCuadro(h.scene); }
}

test('cada jefe de núcleo tiene su sprite en assets/ y una mecánica', () => {
  const root = path.resolve(__dirname, '..');
  const { scene: s } = createScene({ seed: 1, modo: 'sandbox' });
  for (const n of Agentes.NUCLEOS) {
    const spec = s.bossSpecs.find((b) => b.id === `jefe-${n.jefe.agente}`);
    assert.ok(spec, `falta el jefe del núcleo ${n.id}`);
    assert.ok(spec.art && fs.existsSync(path.join(root, 'assets', `${spec.art}.webp`)), `sin sprite: ${n.jefe.agente}`);
    assert.equal(spec.mechanic, n.jefe.agente);
    assert.ok(!spec.worm, 'con arte propio ningún jefe se dibuja como gusano');
  }
});

test('el Laboratorio invoca el jefe elegido en el centro, con su mecánica', () => {
  for (const n of Agentes.NUCLEOS) {
    const { s, jefe } = escenaConJefe(n.jefe.agente);
    assert.ok(jefe, `no apareció ${n.jefe.agente}`);
    assert.equal(jefe.agente, n.jefe.agente);
    assert.equal(jefe.mechanic, n.jefe.agente);
    assert.ok(Math.hypot(jefe.x - 1500, jefe.y - 1500) < 1);
    assert.ok(jefe.visualSize > 250 && jefe.visualSize < 340, `${n.jefe.agente}: tamaño ${Math.round(jefe.visualSize)}`);
    assert.equal(s.bossSequenceIndex, 0, 'elegir un jefe no avanza la secuencia');
  }
});

test('todas las mecánicas corren 15 s sin errores ni valores inválidos', () => {
  for (const n of Agentes.NUCLEOS) {
    const { h, s, jefe } = escenaConJefe(n.jefe.agente, 3);
    assert.doesNotThrow(() => correr(h, 15), n.jefe.agente);
    assert.ok(Number.isFinite(jefe.x) && Number.isFinite(jefe.y) && Number.isFinite(jefe.hp), n.jefe.agente);
    assert.ok(s.enemyProjectiles.length <= 70 && s.biofilmZones.length <= 16);
  }
});

test('E. coli STEC deja nubes de toxina Shiga que frenan al jugador', () => {
  const { h, s } = escenaConJefe('escherichia-coli');
  correr(h, 6);
  const nube = s.biofilmZones.find((z) => z.label === 'TOXINA SHIGA');
  assert.ok(nube, 'debería dejar una nube de toxina');
  s.player.setPosition(nube.x, nube.y);
  s.updateBiofilm(16);
  assert.ok(s.playerSpeedFactor() < 1, 'dentro de la nube el jugador va más lento');
});

test('el granuloma se encapsula (casi no recibe daño) y al abrirse libera bacilos', () => {
  const { h, s, jefe } = escenaConJefe('mycobacterium-tuberculosis');
  correr(h, 7);
  assert.equal(jefe.mech.phase, 'cerrado');
  const vida = jefe.hp;
  s.damageEnemy(jefe, 100, false);
  assert.ok(vida - jefe.hp <= 16, 'encapsulado recibe ~15 % del daño');
  correr(h, 5);
  assert.equal(jefe.mech.phase, 'abierto');
  assert.ok(s.enemies.some((e) => e.minion && e.agente === 'mycobacterium-tuberculosis'), 'libera bacilos');
});

test('la cápsula del meningococo absorbe daño y al romperse suelta endotoxina', () => {
  const { s, jefe } = escenaConJefe('neisseria-meningitidis');
  jefe.spawnGrace = 0;
  const vida = jefe.hp, escudo = jefe.mech.shield;
  s.damageEnemy(jefe, escudo * 0.5, false);
  assert.equal(jefe.hp, vida, 'con cápsula la vida no baja');
  const antes = s.enemyProjectiles.length;
  s.damageEnemy(jefe, escudo, false);
  assert.ok(jefe.mech.shield <= 0 && jefe.hp < vida, 'rota la cápsula, el resto del daño pasa');
  assert.ok(s.enemyProjectiles.length >= antes + 14, 'ráfaga de endotoxina');
});

test('el VIH queda inmune durante la variación antigénica y entra en latencia una sola vez', () => {
  const { h, s, jefe } = escenaConJefe('vih');
  correr(h, 6.75);
  assert.ok(s.elapsed < jefe.mech.invulnUntil, 'en plena variación antigénica');
  const vida = jefe.hp;
  s.damageEnemy(jefe, 500, false);
  assert.equal(jefe.hp, vida, 'inmune mientras cambia');
  jefe.mech.invulnUntil = -1;
  jefe.hp = jefe.maxHp * 0.3;
  s.updateBossMechanic(jefe, 16, 0.016, 0, 300, 300);
  assert.ok(jefe.mech.latencyUsed && jefe.hp > jefe.maxHp * 0.3, 'latencia: se oculta y recupera algo de vida');
});

test('Toxoplasma se desliza y cada tres movimientos invade y sale con taquizoítos', () => {
  const { h, s } = escenaConJefe('toxoplasma-gondii');
  correr(h, 14);
  assert.ok(s.enemies.some((e) => e.minion && e.agente === 'toxoplasma-gondii'));
});

test('Plasmodium se hincha y estalla en merozoítos; el quiste hidatídico se rompe a mitad de vida', () => {
  const p = escenaConJefe('plasmodium');
  let maxPulso = 1;
  correr(p.h, 7, () => { maxPulso = Math.max(maxPulso, p.jefe.mech.pulse); });
  assert.ok(maxPulso > 1.1, 'el glóbulo rojo se hincha antes de estallar');
  assert.ok(p.s.enemyProjectiles.length >= 10, 'merozoítos');

  const q = escenaConJefe('echinococcus-granulosus');
  assert.ok(q.jefe.stationary);
  q.jefe.hp = q.jefe.maxHp * 0.45;
  correr(q.h, 2);
  assert.ok(q.jefe.mech.ruptured, 'rotura del quiste');
  assert.ok(Math.hypot(q.jefe.x - 1500, q.jefe.y - 1500) < 1, 'el quiste no se mueve');
});

test('C. perfringens deja burbujas de gas que explotan; Pneumocystis frena con su aura', () => {
  const c = escenaConJefe('clostridium-perfringens');
  let minas = 0;
  correr(c.h, 6, (s) => { minas = Math.max(minas, s.biofilmZones.filter((z) => z.mine).length); });
  assert.ok(minas >= 1, 'aparecen burbujas de gas');

  const pc = escenaConJefe('pneumocystis-jirovecii');
  pc.s.player.setPosition(1500, 1650);
  correr(pc.h, 3.5);
  assert.ok(pc.s.playerSpeedFactor() < 1, 'cerca de Pneumocystis el jugador va más lento');
});

test('Neisseria: cápsula → endotoxina y la suelta → endotoxina → cápsula otra vez', () => {
  const { h, s, jefe } = escenaConJefe('neisseria-meningitidis');
  const fases = [];
  correr(h, 22, () => { if (fases[fases.length - 1] !== jefe.mech.phase) fases.push(jefe.mech.phase); });
  assert.deepEqual(fases.slice(0, 4), ['capsula', 'expuesta1', 'expuesta2', 'capsula']);
  assert.ok(jefe.mech.shield > 0, 'la cápsula vuelve completa');
});

test('el granuloma libera pocos bacilos, pero rápidos, resistentes y no fagocitables', () => {
  const { h, s } = escenaConJefe('mycobacterium-tuberculosis');
  correr(h, 11.5); // 1,6 s de entrada + 5 s abierto + 4,5 s encapsulado
  const bacilos = s.enemies.filter((e) => e.minion && e.agente === 'mycobacterium-tuberculosis');
  assert.equal(bacilos.length, 2);
  const comun = s.spawnEnemy('bacteria', false, { x: 1200, y: 1200 });
  for (const b of bacilos) {
    assert.ok(b.maxHp > comun.maxHp * 4, 'mucha más vida que un enemigo común');
    assert.ok(b.speed > comun.speed * 1.3, 'más rápidos');
    assert.equal(b.sizeTier, 2);
  }
});

test('C. perfringens lanza burbujas que caen como minas y deja otras alrededor', () => {
  const { h, s, jefe } = escenaConJefe('clostridium-perfringens');
  let lanzadas = 0, minas = [];
  correr(h, 8, (sc) => {
    lanzadas = Math.max(lanzadas, sc.enemyProjectiles.filter((p) => p.landAt).length);
    for (const z of sc.biofilmZones) if (z.mine && !minas.includes(z)) minas.push(z);
  });
  assert.ok(lanzadas >= 1, 'lanza burbujas');
  assert.ok(minas.length >= 3, 'quedan minas (dejadas y lanzadas)');
  assert.ok(minas.every((z) => z.mine.radius >= 120), 'más rango de explosión');
  assert.ok(minas.some((z) => Math.hypot(z.x - jefe.x, z.y - jefe.y) > jefe.radius + 15), 'alrededor suyo, no encima');
});

test('los proyectiles que vencen se desvanecen en vez de desaparecer de golpe', () => {
  const { h, s, jefe } = escenaConJefe('plasmodium');
  s.spawnBossBurst(jefe, 4, { color: 0xff5a6e, speed: 10, damage: 1, size: 10, life: 50 });
  const objs = s.enemyProjectiles.map((p) => p.obj);
  let tweensDeFundido = 0;
  const add = s.tweens.add.bind(s.tweens);
  s.tweens.add = (cfg) => { if (objs.includes(cfg.targets) && cfg.alpha === 0) tweensDeFundido++; return add(cfg); };
  for (let i = 0; i < 6; i++) s.update(0, FRAME);
  assert.ok(objs.every((o) => !s.enemyProjectiles.some((p) => p.obj === o)), 'salen de la lista (ya no dañan)');
  assert.equal(tweensDeFundido, 4, 'cada uno con su fundido');
});

test('el helminto colosal embiste, se aleja y vuelve a embestir (no orbita al jugador)', () => {
  const h = createScene({ seed: 5, modo: 'sandbox', debugMode: true });
  const s = h.scene;
  s.debugInvincible = true;
  s.activeSkills.delete('granules');
  s.player.setPosition(1500, 1900);
  s.debugAction('boss:helminto-colosal');
  const jefe = s.enemies.find((e) => e.isBoss);
  const fases = [];
  let lejosEnRetirada = 0;
  correr(h, 25, () => {
    const f = jefe.charge?.phase;
    if (f && fases[fases.length - 1] !== f) fases.push(f);
    if (f === 'retirada') lejosEnRetirada = Math.max(lejosEnRetirada, Math.hypot(jefe.x - s.player.x, jefe.y - s.player.y));
  });
  assert.ok(fases.filter((f) => f === 'embestida').length >= 2, `debería embestir varias veces (${fases.join(' → ')})`);
  assert.ok(fases.includes('retirada') && fases.includes('acecho'));
  assert.ok(lejosEnRetirada > 400, 'en la retirada se aleja');
});
