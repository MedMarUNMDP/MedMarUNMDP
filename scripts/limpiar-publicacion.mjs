// Saca los comentarios de lo que se publica (lo arma el workflow de Pages en _site/), sin tocar el código fuente:
// el repo conserva su documentación y quien abre «Inspeccionar elemento» ve solo el código.
//
//   node scripts/limpiar-publicacion.mjs _site
//
// - .js y .css: esbuild (versión fija) los reescribe sin comentarios y sin espacios de más, sin cambiar lo que hacen:
//   no renombra ni empaqueta (los scripts clásicos siguen compartiendo sus globales). Las licencias (/*! … */) quedan.
// - .html: se quitan los comentarios <!-- … --> y los /* … */ dentro de <style>.
// Al final se verifica la sintaxis de cada .js publicado.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ESBUILD = 'esbuild@0.24.0'
const raiz = path.resolve(process.argv[2] || '_site')
if (!fs.existsSync(raiz)) { console.error('No existe ' + raiz); process.exit(1) }

const archivos = []
;(function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) recorrer(p)
    else archivos.push(p)
  }
})(raiz)

const codigo = archivos.filter((f) => /\.(js|css)$/.test(f))
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
let pesoAntes = 0
for (const f of codigo) pesoAntes += fs.statSync(f).size
// De a tandas para no pasar el largo máximo de la línea de comandos.
for (let i = 0; i < codigo.length; i += 40) {
  execFileSync(npx, ['--yes', ESBUILD, ...codigo.slice(i, i + 40).map((f) => path.relative(raiz, f)),
    '--outdir=.', '--outbase=.', '--allow-overwrite', '--minify-whitespace', '--charset=utf8', '--legal-comments=inline', '--log-level=error'],
  { cwd: raiz, stdio: 'inherit', shell: process.platform === 'win32' }) // npx.cmd necesita shell; los argumentos son rutas propias
}
let pesoDespues = 0
for (const f of codigo) pesoDespues += fs.statSync(f).size

let htmls = 0
for (const f of archivos.filter((x) => x.endsWith('.html'))) {
  const antes = fs.readFileSync(f, 'utf8')
  const despues = antes
    .replace(/<!--[\s\S]*?-->\s*/g, '')
    .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, a, css, c) => a + css.replace(/\/\*[\s\S]*?\*\//g, '') + c)
  if (despues !== antes) { fs.writeFileSync(f, despues); htmls++ }
}

for (const f of codigo.filter((x) => x.endsWith('.js'))) execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' })
console.log(`Sin comentarios: ${codigo.length} .js/.css (${Math.round(pesoAntes / 1024)} → ${Math.round(pesoDespues / 1024)} KB) y ${htmls} .html.`)
