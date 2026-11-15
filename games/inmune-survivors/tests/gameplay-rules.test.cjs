const assert = require('node:assert/strict');
const test = require('node:test');

const balance = require('../src/config/game-balance.js');
const labActions = require('../src/core/lab-actions.js');

const makeScene = () => ({
  activeSkills: new Set(['granules', 'phagocytosis', 'tb_collaboration']),
  skillLevels: { granules: 1, phagocytosis: 1, tb_collaboration: 1 },
  stats: { projectileCount: 1, attackInterval: 520, phagoRadius: 50, phagoInterval: 800 },
  bCellCap: undefined,
  applySkillEvolutionCalls: [],
  applySkillEvolution(id, level) { this.applySkillEvolutionCalls.push([id, level]); },
  removeDebugSkill(id) { this.activeSkills.delete(id); delete this.skillLevels[id]; }
});

test('cada efecto de vía visible es el mismo que modifica el estado', () => {
  const scene = makeScene();
  const effects = balance.getActivePathEffects(scene, 'homeostasis');

  assert.deepEqual(effects.map((effect) => effect.ability), ['granules', 'phagocytosis', 'tb_collaboration']);
  effects.forEach((effect) => effect.apply(scene));

  assert.equal(scene.stats.projectileCount, 2);
  assert.equal(scene.stats.phagoRadius, 52);
  assert.equal(scene.bCellCap, 3);
});

test('la primera mejora de colaboración T-B aumenta su capacidad efectiva', () => {
  const scene = makeScene();
  balance.increaseBCellCap(scene);
  assert.equal(scene.bCellCap, 3);
});

test('el laboratorio aplica evoluciones al aumentar un nivel existente', () => {
  const scene = makeScene();
  labActions.changeSkillLevel(scene, 'phagocytosis', 'up');
  assert.equal(scene.skillLevels.phagocytosis, 2);
  assert.deepEqual(scene.applySkillEvolutionCalls, [['phagocytosis', 2]]);
});

test('el laboratorio ajusta atributos que pertenecen a la escena fuera de stats', () => {
  const scene = makeScene();
  labActions.changeSkillStat(scene, 'bCellCap', 'up', 1);
  assert.equal(scene.bCellCap, 3);
  assert.equal(scene.stats.bCellCap, undefined);
});
