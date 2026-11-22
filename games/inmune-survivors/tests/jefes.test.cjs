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
