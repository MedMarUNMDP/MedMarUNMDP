// Los assets del juego son WebP (ver assets/README.md). Este test evita que vuelva a entrar un PNG pesado
// o que preload() pida un archivo que no existe (en el navegador eso deja un sprite vacío sin error visible).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const gameSource = fs.readFileSync(path.join(root, 'game.js'), 'utf8');

const listar = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entrada) =>
  entrada.isDirectory() ? listar(path.join(dir, entrada.name)) : [path.join(dir, entrada.name)]);

test('no hay PNG ni JPG en assets/ (todo en WebP)', () => {
  const pesados = listar(path.join(root, 'assets')).filter((f) => /\.(png|jpe?g)$/i.test(f));
  assert.deepEqual(pesados.map((f) => path.relative(root, f)), []);
});

test('cada textura que usa el juego tiene su archivo .webp', () => {
  const claves = new Set([...gameSource.matchAll(/texture:\s*'([a-z_]+)'/g)].map((m) => m[1]));
  for (const m of gameSource.matchAll(/'((?:tissue|focus|boss|helminth|bacteria|virus|fungus|parasite)_[a-z_]+)'/g)) claves.add(m[1]);
  const faltan = [...claves].filter((clave) => !fs.existsSync(path.join(root, 'assets', `${clave}.webp`)));
  assert.deepEqual(faltan, []);
});

test('preload() solo pide archivos .webp', () => {
  const preload = gameSource.slice(gameSource.indexOf('preload() {'), gameSource.indexOf('init(data) {'));
  assert.doesNotMatch(preload, /\.png/);
  assert.match(preload, /assets\/skills\/phagocytosis_frame1\.webp/);
});

test('ningún asset supera los 300 KB', () => {
  const grandes = listar(path.join(root, 'assets'))
    .filter((f) => fs.statSync(f).size > 300 * 1024)
    .map((f) => `${path.relative(root, f)} (${Math.round(fs.statSync(f).size / 1024)} KB)`);
  assert.deepEqual(grandes, []);
});
