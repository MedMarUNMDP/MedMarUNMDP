// Arnés para correr la escena `Arena` de game.js en Node, sin navegador ni Phaser real.
//
// - Carga los módulos de src/ (UMD) y game.js en un contexto `vm` con un DOM mínimo.
// - Phaser se reemplaza por objetos "comodín": cualquier método devuelve el mismo objeto, así que
//   `this.add.circle(...).setDepth(...).setAlpha(...)` funciona sin dibujar nada.
// - Los tweens no corren solos: quedan en una cola y se completan con `flushTweens()`, para poder
//   probar los efectos que dependen de `onComplete` (por ejemplo la fagocitosis).
// - El RNG es determinista (semilla), así una partida simulada siempre da el mismo resultado.
//
// game.js no exporta nada: para obtener la clase se inyecta `globalThis.__inmune = {...}` antes del
// cierre del IIFE. Si el archivo cambia de forma y el arnés no puede inyectar, falla con un mensaje claro.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');

// ---------- objetos comodín ----------
const NUMERIC_DEFAULTS = { width: 256, height: 256, naturalWidth: 256, naturalHeight: 256, scale: 1, alpha: 1, rotation: 0, depth: 0 };

function makeStub(initial = {}) {
  const state = { x: 0, y: 0, active: true, visible: true, ...initial };
  const fn = function stub() { return proxy; };
  const proxy = new Proxy(fn, {
    get(_target, key) {
      if (key === Symbol.toPrimitive) return () => 0;
      if (key === 'then') return undefined; // que no parezca una promesa
      if (key in state) return state[key];
      if (key in NUMERIC_DEFAULTS) return NUMERIC_DEFAULTS[key];
      if (key === 'destroy') return () => { state.active = false; return proxy; };
      if (key === 'setPosition') return (x, y) => { state.x = x; if (y !== undefined) state.y = y; return proxy; };
      if (key === 'setVisible') return v => { state.visible = !!v; return proxy; };
      if (key === 'list' || key === 'children') return [];
      return () => proxy;
    },
    set(_target, key, value) { state[key] = value; return true; },
    has(_target, key) { return key in state; },
    apply() { return proxy; }
  });
  return proxy;
}

// Fábrica tipo `this.add` / `this.make`: cada llamada crea un objeto nuevo con posición inicial.
function makeFactory() {
  return new Proxy({}, {
    get(_t, key) {
      if (key === 'existing') return obj => obj;
      return (x, y) => makeStub({ x: typeof x === 'number' ? x : 0, y: typeof y === 'number' ? y : 0 });
    }
  });
}

function makeTweens() {
  const pending = [];
  return {
    pending,
    add(cfg) { pending.push(cfg); return makeStub(); },
    addCounter(cfg) { pending.push(cfg); return makeStub(); },
    pauseAll() {}, resumeAll() {}, killTweensOf() {}, killAll() { pending.length = 0; }
  };
}

const TWEEN_CONFIG_KEYS = new Set(['targets', 'duration', 'ease', 'delay', 'yoyo', 'repeat', 'onComplete', 'onUpdate', 'onStart', 'hold', 'loop']);

// Completa los tweens pendientes: asigna los valores finales y llama onUpdate/onComplete.
function flushTweens(scene, rounds = 5) {
  for (let r = 0; r < rounds; r++) {
    const batch = scene.tweens.pending.splice(0);
    if (!batch.length) return;
    for (const cfg of batch) {
      if (cfg.repeat === -1 || cfg.loop) continue; // los tweens infinitos nunca "terminan"
      const targets = Array.isArray(cfg.targets) ? cfg.targets : cfg.targets ? [cfg.targets] : [];
      for (const target of targets) {
        for (const [key, value] of Object.entries(cfg)) {
          if (TWEEN_CONFIG_KEYS.has(key) || typeof value !== 'number' || !target || typeof target !== 'object' && typeof target !== 'function') continue;
          try { target[key] = value; } catch (_) { /* propiedades de solo lectura */ }
        }
      }
      if (typeof cfg.onUpdate === 'function') cfg.onUpdate();
      if (typeof cfg.onComplete === 'function') cfg.onComplete();
    }
  }
}

// ---------- DOM mínimo para el código de menú al final de game.js ----------
function makeDom() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        id, style: {}, dataset: {}, innerHTML: '', textContent: '', value: '',
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        addEventListener() {}, removeEventListener() {}, appendChild() {}, append() {}, replaceChildren() {},
        querySelector: () => null, querySelectorAll: () => [], setAttribute() {}, closest: () => null,
        getBoundingClientRect: () => ({ width: 480, height: 800 }), scrollIntoView() {}, click() {}
      });
    }
    return elements.get(id);
  };
  return {
    hidden: false,
    getElementById: element,
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: () => element(`__tmp_${elements.size}`),
    addEventListener() {},
    body: element('body'),
    documentElement: element('html')
  };
}

// PRNG chico y determinista (mulberry32).
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- carga de game.js ----------
function loadGame() {
  const window = {
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } },
    innerWidth: 480, innerHeight: 800, devicePixelRatio: 1
  };
  class Scene { constructor(config) { this.sceneConfig = config; } }
  const Phaser = {
    Scene,
    AUTO: 0,
    Scale: { NONE: 0, RESIZE: 0, Events: { RESIZE: 'resize' } },
    Game: class { constructor() { this.scene = { add() {}, start() {}, stop() {} }; } },
    Math: { FloatBetween: (a, b) => a + (b - a) * 0.5, Between: (a, b) => Math.floor((a + b) / 2), Clamp: (v, a, b) => Math.max(a, Math.min(b, v)) },
    Input: { Keyboard: { KeyCodes: {} } }
  };
  const context = {
    window, document: makeDom(), navigator: { hardwareConcurrency: 8, deviceMemory: 8, maxTouchPoints: 0 },
    screen: {}, Phaser, console,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() {}, confirm: () => false, performance: { now: () => 0 }
  };
  vm.createContext(context);
  context.globalThis = context;

  for (const file of ['src/core/runtime-services.js', 'src/config/game-balance.js', 'src/core/lab-actions.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context, { filename: file });
  }

  let source = fs.readFileSync(path.join(ROOT, 'game.js'), 'utf8');
  const closing = source.lastIndexOf('})();');
  if (closing === -1) throw new Error('arena-harness: no encontré el cierre del IIFE de game.js');
  source = source.slice(0, closing) +
    'globalThis.__inmune={Arena,QUESTION_BANK,EVOLUTION_STRATEGIES,BOSS_MORPHOLOGIES,INFECTIONS,MORPHOLOGY,PLAUSIBLE_OPTIONS,INFECTION_DIFFICULTIES,EVOLUTION_DIFFICULTIES};\n' +
    source.slice(closing);
  vm.runInContext(source, context, { filename: 'game.js' });
  return { ...context.__inmune, context };
}

// ---------- escena lista para usar ----------
// options: seed, infection, infectionDifficulty, evolutionDifficulty, debugMode, coarse
function createScene(options = {}) {
  const loaded = loadGame();
  const { Arena, context } = loaded;
  const emitted = [];
  const runtime = context.InmuneRuntime.createRuntime({
    random: mulberry32(options.seed ?? 1),
    now: () => 0,
    storage: new context.InmuneRuntime.Storage(context.window.localStorage)
  });
  const scene = new Arena();
  Object.assign(scene, {
    add: makeFactory(),
    make: makeFactory(),
    tweens: makeTweens(),
    time: makeStub({ paused: false }),
    events: makeStub(),
    cameras: { main: makeStub({ worldView: { contains: () => true }, width: 480, height: 800 }), add: () => makeStub() },
    children: { list: [] },
    input: makeStub({ keyboard: makeStub({ addKeys: () => ({}) }) }),
    // ScaleManager con registro de listeners: permite verificar que la escena los saca al cerrarse.
    scale: {
      listeners: new Map(),
      gameSize: { width: 480, height: 800 },
      on(event, fn) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event).add(fn); return this; },
      off(event, fn) { this.listeners.get(event)?.delete(fn); return this; },
      count(event) { return this.listeners.get(event)?.size || 0; },
      refresh() {}
    },
    sys: makeStub(),
    load: makeStub(),
    textures: {
      get: () => ({ getSourceImage: () => ({ width: 256, height: 256 }) }),
      exists: () => false,
      createCanvas: () => makeStub({ context: makeStub() }),
      addCanvas: () => makeStub(),
      remove() {}
    }
  });

  scene.init({
    infection: options.infection || 'bacteriana',
    infectionDifficulty: options.infectionDifficulty || 'internado',
    evolutionDifficulty: options.evolutionDifficulty || 'estudiante',
    debugMode: !!options.debugMode,
    runtime,
    uiBridge: {
      emit: (name, detail) => emitted.push({ name, detail }),
      setActions() {}, clearActions() {},
      isHidden: () => false,
      getDeviceProfile: () => ({ cores: 8, memory: 8, coarse: !!options.coarse })
    }
  });
  scene.create();
  return { scene, emitted, loaded, flushTweens: rounds => flushTweens(scene, rounds) };
}

module.exports = { createScene, loadGame, flushTweens, mulberry32 };
