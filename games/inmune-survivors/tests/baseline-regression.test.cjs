const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'game.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('conserva el banco de 98 preguntas distribuido por dificultad (25 básicas + 15 datos curiosos en fácil)', () => {
  const difficulties = [...gameSource.matchAll(/id:'[^']+', difficulty:'(facil|normal|dificil)'/g)]
    .map((match) => match[1]);
  const count = (difficulty) => difficulties.filter((value) => value === difficulty).length;

  assert.equal(count('facil'), 40);
  assert.equal(count('normal'), 28);
  assert.equal(count('dificil'), 30);
});

test('mantiene Phaser 3.90 y carga el script local del juego', () => {
  assert.match(htmlSource, /phaser\/3\.90\.0\/phaser\.min\.js/);
  assert.match(htmlSource, /<script src="\.\/game\.js\?build=/);
});
