(function registerGameBalance(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.InmuneGameBalance = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createGameBalance() {
  'use strict';

  const LIMITS = Object.freeze({
    maxProjectilesPerVolley: 10,
    minimumAttackIntervalMs: 180,
    minimumPhagocytosisIntervalMs: 350,
    minimumNetCooldownMs: 2700,
    minimumAntibodyIntervalMs: 500,
    maximumBCells: 8,
    baseBCellCapacity: 2
  });

  const MULTIPLIERS = Object.freeze({
    homeostasisPhagocytosisRadius: 1.04,
    homeostasisPhagocytosisInterval: 0.98,
    homeostasisAntibodyDamage: 1.05,
    cytotoxicityGranuleDamage: 1.07,
    chemotaxisAttackInterval: 0.96,
    chemotaxisNetRadius: 1.04,
    chemotaxisNetCooldown: 0.98,
    chemotaxisPhagocytosisInterval: 0.98,
    chemotaxisAntibodyInterval: 0.98
  });

  const ABILITY_NAMES = Object.freeze({
    granules: 'Desgranulación',
    phagocytosis: 'Fagocitosis',
    antibodies: 'Secreción de anticuerpos',
    tb_collaboration: 'Colaboración T‑B',
    netosis: 'NETosis'
  });

  const hasAbility = (scene, ability) => scene.activeSkills.has(ability);
  const getBCellCap = (scene) => Math.max(LIMITS.baseBCellCapacity, scene.bCellCap || LIMITS.baseBCellCapacity);
  const increaseBCellCap = (scene) => {
    scene.bCellCap = Math.min(LIMITS.maximumBCells, getBCellCap(scene) + 1);
  };

  const percentage = (value) => `${Math.round(value * 100)}%`;
  const format = (value, decimals = 0) => Number(value).toLocaleString('es-AR', { maximumFractionDigits: decimals });
  const rate = (interval) => format(1000 / interval, 2);

  const PATH_EFFECTS = Object.freeze({
    homeostasis: Object.freeze([
      Object.freeze({
        ability: 'granules',
        isActive: (scene) => hasAbility(scene, 'granules') && scene.stats.projectileCount < LIMITS.maxProjectilesPerVolley,
        apply: (scene) => { scene.stats.projectileCount = Math.min(LIMITS.maxProjectilesPerVolley, scene.stats.projectileCount + 1); },
        describe: (scene) => `Proyectiles por descarga: ${format(scene.stats.projectileCount)} → ${format(Math.min(LIMITS.maxProjectilesPerVolley, scene.stats.projectileCount + 1))} (+1 gránulo por salva)`
      }),
      Object.freeze({
        ability: 'phagocytosis',
        isActive: (scene) => hasAbility(scene, 'phagocytosis'),
        apply: (scene) => {
          scene.stats.phagoRadius *= MULTIPLIERS.homeostasisPhagocytosisRadius;
          scene.stats.phagoInterval = Math.max(LIMITS.minimumPhagocytosisIntervalMs, scene.stats.phagoInterval * MULTIPLIERS.homeostasisPhagocytosisInterval);
        },
        describe: (scene) => `Radio: ${format(scene.stats.phagoRadius)} → ${format(scene.stats.phagoRadius * MULTIPLIERS.homeostasisPhagocytosisRadius)} px (+4%) · recarga: ${format(scene.stats.phagoInterval / 1000, 2)} → ${format(Math.max(LIMITS.minimumPhagocytosisIntervalMs, scene.stats.phagoInterval * MULTIPLIERS.homeostasisPhagocytosisInterval) / 1000, 2)} s`
      }),
      Object.freeze({
        ability: 'antibodies',
        isActive: (scene) => hasAbility(scene, 'antibodies'),
        apply: (scene) => { scene.stats.antibodyDamage *= MULTIPLIERS.homeostasisAntibodyDamage; },
        describe: (scene) => `Daño por anticuerpo: ${format(scene.stats.antibodyDamage, 1)} → ${format(scene.stats.antibodyDamage * MULTIPLIERS.homeostasisAntibodyDamage, 1)} (+5%)`
      }),
      Object.freeze({
        ability: 'tb_collaboration',
        isActive: (scene) => hasAbility(scene, 'tb_collaboration') && getBCellCap(scene) < LIMITS.maximumBCells,
        apply: increaseBCellCap,
        describe: (scene) => `Capacidad de linfocitos B: ${format(getBCellCap(scene))} → ${format(Math.min(LIMITS.maximumBCells, getBCellCap(scene) + 1))} (+1 acompañante)`
      })
    ]),
    cytotoxicity: Object.freeze([
      Object.freeze({
        ability: 'granules',
        isActive: (scene) => hasAbility(scene, 'granules'),
        apply: (scene) => { scene.stats.attackDamage *= MULTIPLIERS.cytotoxicityGranuleDamage; },
        describe: (scene) => `Daño por gránulo: ${format(scene.stats.attackDamage, 1)} → ${format(scene.stats.attackDamage * MULTIPLIERS.cytotoxicityGranuleDamage, 1)} (+${percentage(MULTIPLIERS.cytotoxicityGranuleDamage - 1)})`
      })
    ]),
    chemotaxis: Object.freeze([
      Object.freeze({
        ability: 'granules',
        isActive: (scene) => hasAbility(scene, 'granules') && scene.stats.attackInterval > LIMITS.minimumAttackIntervalMs,
        apply: (scene) => { scene.stats.attackInterval = Math.max(LIMITS.minimumAttackIntervalMs, scene.stats.attackInterval * MULTIPLIERS.chemotaxisAttackInterval); },
        describe: (scene) => `Cadencia: ${rate(scene.stats.attackInterval)} → ${rate(Math.max(LIMITS.minimumAttackIntervalMs, scene.stats.attackInterval * MULTIPLIERS.chemotaxisAttackInterval))} disparos/s (+4,17%)`
      }),
      Object.freeze({
        ability: 'netosis',
        isActive: (scene) => hasAbility(scene, 'netosis') && scene.stats.netCooldown > LIMITS.minimumNetCooldownMs,
        apply: (scene) => {
          scene.stats.netRadius *= MULTIPLIERS.chemotaxisNetRadius;
          scene.stats.netCooldown = Math.max(LIMITS.minimumNetCooldownMs, scene.stats.netCooldown * MULTIPLIERS.chemotaxisNetCooldown);
        },
        describe: (scene) => `Radio: ${format(scene.stats.netRadius)} → ${format(scene.stats.netRadius * MULTIPLIERS.chemotaxisNetRadius)} px (+4%) · recarga: ${format(scene.stats.netCooldown / 1000, 1)} → ${format(Math.max(LIMITS.minimumNetCooldownMs, scene.stats.netCooldown * MULTIPLIERS.chemotaxisNetCooldown) / 1000, 1)} s (−2%)`
      }),
      Object.freeze({
        ability: 'phagocytosis',
        isActive: (scene) => hasAbility(scene, 'phagocytosis') && scene.stats.phagoInterval > LIMITS.minimumPhagocytosisIntervalMs,
        apply: (scene) => { scene.stats.phagoInterval = Math.max(LIMITS.minimumPhagocytosisIntervalMs, scene.stats.phagoInterval * MULTIPLIERS.chemotaxisPhagocytosisInterval); },
        describe: (scene) => `Recarga: ${format(scene.stats.phagoInterval / 1000, 2)} → ${format(Math.max(LIMITS.minimumPhagocytosisIntervalMs, scene.stats.phagoInterval * MULTIPLIERS.chemotaxisPhagocytosisInterval) / 1000, 2)} s (−2%)`
      }),
      Object.freeze({
        ability: 'antibodies',
        isActive: (scene) => hasAbility(scene, 'antibodies') && scene.stats.antibodyInterval > LIMITS.minimumAntibodyIntervalMs,
        apply: (scene) => { scene.stats.antibodyInterval = Math.max(LIMITS.minimumAntibodyIntervalMs, scene.stats.antibodyInterval * MULTIPLIERS.chemotaxisAntibodyInterval); },
        describe: (scene) => `Cadencia: ${rate(scene.stats.antibodyInterval)} → ${rate(Math.max(LIMITS.minimumAntibodyIntervalMs, scene.stats.antibodyInterval * MULTIPLIERS.chemotaxisAntibodyInterval))} disparos/s (+2,04%)`
      })
    ])
  });

  const getActivePathEffects = (scene, route) => (PATH_EFFECTS[route] || []).filter((effect) => effect.isActive(scene));

  return Object.freeze({ ABILITY_NAMES, LIMITS, getActivePathEffects, getBCellCap, increaseBCellCap });
});
