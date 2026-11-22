// Arma el banco de preguntas por núcleo de Inmune Survivors a partir de las fuentes revisadas.
//   Fuentes:  games/inmune-survivors/docs/preguntas-nucleos/nucleo-<id>.json  (no se publican)
//   Salida:   games/inmune-survivors/src/data/preguntas-nucleos.js           (lo que carga el juego)
//             games/inmune-survivors/docs/catalogo-preguntas-nucleos.md      (catálogo legible)
// Uso: node scripts/armar-preguntas-nucleos.mjs   (falla si alguna pregunta no cumple el formato)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const juego = path.join(raiz, 'games', 'inmune-survivors');
const dirFuentes = path.join(juego, 'docs', 'preguntas-nucleos');
const NUCLEOS = ['6', '7', '7.1', '8', '9', '10', '11', '12', '13-14'];
const DIFICULTADES = ['facil', 'normal', 'dificil'];
const NOMBRE_DIF = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' };

const errores = [];
const todas = [];
const ids = new Set();
for (const n of NUCLEOS) {
  const archivo = path.join(dirFuentes, `nucleo-${n}.json`);
  if (!fs.existsSync(archivo)) { console.warn(`(sin banco todavía) núcleo ${n}`); continue; }
  const lista = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  for (const p of lista) {
    const donde = `${path.basename(archivo)} ${p.id}`;
    if (!p.id || ids.has(p.id)) errores.push(`${donde}: id vacío o repetido`);
    ids.add(p.id);
    if (p.nucleo !== n) errores.push(`${donde}: núcleo ${p.nucleo} en el archivo del ${n}`);
    if (!DIFICULTADES.includes(p.difficulty)) errores.push(`${donde}: dificultad ${p.difficulty}`);
    if (!Array.isArray(p.a) || p.a.length !== 4 || p.a.some((x) => typeof x !== 'string' || !x.trim())) errores.push(`${donde}: tiene que tener 4 opciones`);
    if (new Set(p.a || []).size !== 4) errores.push(`${donde}: opciones repetidas`);
    if (!Number.isInteger(p.c) || p.c < 0 || p.c > 3) errores.push(`${donde}: índice de correcta inválido`);
    for (const k of ['topic', 'q', 'exp', 'source']) if (typeof p[k] !== 'string' || !p[k].trim()) errores.push(`${donde}: falta ${k}`);
    todas.push({ id: p.id, nucleo: p.nucleo, difficulty: p.difficulty, topic: p.topic, q: p.q, a: p.a, c: p.c, exp: p.exp, source: p.source });
  }
}
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }

const js = `// Banco de preguntas por núcleo de ADN (Foco por núcleo usa solo las de su núcleo; Sandbox, todas).
// Redactadas a partir de los cuadernillos 2026 de la cátedra y del Compendio ADN, y revisadas con
// \`revisor-contenido-medico\`. GENERADO por scripts/armar-preguntas-nucleos.mjs desde
// docs/preguntas-nucleos/*.json: no lo edites a mano (editá el JSON y volvé a correr el script).
(function registerPreguntasNucleos(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.InmunePreguntasNucleos = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createPreguntasNucleos() {
  'use strict';
  const PREGUNTAS = Object.freeze([
${todas.map((p) => '    ' + JSON.stringify(p)).join(',\n')}
  ].map(Object.freeze));
  const porNucleo = (id) => PREGUNTAS.filter((p) => p.nucleo === id);
  return Object.freeze({ PREGUNTAS, porNucleo });
});
`;
fs.writeFileSync(path.join(juego, 'src', 'data', 'preguntas-nucleos.js'), js);

let md = `# Catálogo de preguntas por núcleo\n\nGenerado por \`scripts/armar-preguntas-nucleos.mjs\`. La opción correcta va primero (en el juego se mezclan).\n`;
md += `Total: **${todas.length}** preguntas.\n`;
for (const n of NUCLEOS) {
  const del = todas.filter((p) => p.nucleo === n);
  if (!del.length) continue;
  md += `\n## Núcleo ${n} (${del.length})\n`;
  for (const d of DIFICULTADES) {
    const lista = del.filter((p) => p.difficulty === d);
    if (!lista.length) continue;
    md += `\n### ${NOMBRE_DIF[d]} (${lista.length})\n\n`;
    for (const p of lista) {
      md += `- **${p.q}** _(${p.topic})_\n  - ✔ ${p.a[p.c]}\n`;
      for (let i = 0; i < 4; i++) if (i !== p.c) md += `  - ✘ ${p.a[i]}\n`;
      md += `  - ${p.exp} — *${p.source}*\n`;
    }
  }
}
fs.writeFileSync(path.join(juego, 'docs', 'catalogo-preguntas-nucleos.md'), md);
console.log(`${todas.length} preguntas → src/data/preguntas-nucleos.js y docs/catalogo-preguntas-nucleos.md`);
