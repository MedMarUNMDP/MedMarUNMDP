(function registerLabActions(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.InmuneLabActions = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createLabActions() {
  'use strict';

  const SCENE_FIELDS = Object.freeze({
    complementChance: 0.18,
    macrophageCap: 1,
    bCellCap: 2,
    patternRadius: 220,
    differentiationBonus: 0.055
  });

  const getSkillStatTarget = (scene, key) => (Object.hasOwn(SCENE_FIELDS, key) ? scene : scene.stats);
  const getCurrentSkillStat = (scene, key) => {
    const target = getSkillStatTarget(scene, key);
    return target[key] ?? SCENE_FIELDS[key] ?? 0;
  };

  const changeSkillStat = (scene, key, direction, step, minimum = 0) => {
    const target = getSkillStatTarget(scene, key);
    const delta = direction === 'up' ? step : -step;
    target[key] = Math.max(minimum, getCurrentSkillStat(scene, key) + delta);
    return target[key];
  };

  const changeSkillLevel = (scene, id, direction) => {
    const currentLevel = scene.skillLevels[id] || 0;
    if (direction === 'down' && currentLevel <= 1) {
      scene.removeDebugSkill(id);
      return 0;
    }
    const nextLevel = Math.max(1, currentLevel + (direction === 'down' ? -1 : 1));
    scene.activeSkills.add(id);
    scene.skillLevels[id] = nextLevel;
    if (nextLevel > currentLevel && currentLevel > 0) scene.applySkillEvolution(id, nextLevel);
    return nextLevel;
  };

  return Object.freeze({ changeSkillLevel, changeSkillStat, getCurrentSkillStat, getSkillStatTarget });
});
