const assert = require('node:assert/strict');
const test = require('node:test');

const { Rng, Storage } = require('../src/core/runtime-services.js');

test('Rng inyectable hace reproducibles selección, enteros y barajado', () => {
  const values = [0, 0.5, 0.99, 0.25];
  const rng = new Rng(() => values.shift());

  assert.equal(rng.pick(['a', 'b', 'c']), 'a');
  assert.equal(rng.integer(10, 12), 11);
  assert.deepEqual(rng.shuffle(['a', 'b', 'c']), ['b', 'a', 'c']);
});

test('Storage devuelve cero ante datos ausentes o inválidos', () => {
  const values = new Map([['valid', '42'], ['invalid', 'NaN']]);
  const storage = new Storage({ getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) });

  assert.equal(storage.getNumber('valid'), 42);
  assert.equal(storage.getNumber('invalid'), 0);
  assert.equal(storage.getNumber('missing'), 0);
});
