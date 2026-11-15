(function registerRuntimeServices(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.InmuneRuntime = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createRuntimeServices() {
  'use strict';

  const DEFAULT_RANDOM = () => Math.random();
  const DEFAULT_NOW = () => Date.now();

  class Rng {
    constructor(next = DEFAULT_RANDOM) { this.nextValue = next; }

    next() { return Math.min(0.9999999999999999, Math.max(0, Number(this.nextValue()) || 0)); }

    float(minimum, maximum) { return minimum + (maximum - minimum) * this.next(); }

    integer(minimum, maximum) { return minimum + Math.floor(this.next() * (maximum - minimum + 1)); }

    pick(list) { return list.length ? list[Math.floor(this.next() * list.length)] : undefined; }

    shuffle(list) {
      const result = [...list];
      for (let index = result.length - 1; index > 0; index--) {
        const selected = this.integer(0, index);
        [result[index], result[selected]] = [result[selected], result[index]];
      }
      return result;
    }
  }

  class Clock {
    constructor(now = DEFAULT_NOW) { this.nowValue = now; }

    now() { return this.nowValue(); }
  }

  class Storage {
    constructor(backend) { this.backend = backend; }

    getNumber(key) {
      const value = Number(this.backend?.getItem(key));
      return Number.isFinite(value) ? value : 0;
    }

    setNumber(key, value) {
      if (!Number.isFinite(value)) return;
      this.backend?.setItem(key, String(value));
    }
  }

  const createRuntime = ({ random, now, storage } = {}) => Object.freeze({
    rng: random instanceof Rng ? random : new Rng(random),
    clock: now instanceof Clock ? now : new Clock(now),
    storage: storage instanceof Storage ? storage : new Storage(storage)
  });

  return Object.freeze({ Clock, Rng, Storage, createRuntime });
});
