// Chequeo de sintaxis (node --check) de todo el JS del frontend y de los juegos.
// Uso: npm run check
import { readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOTS = ['web/js', 'games']
const SKIP = new Set(['node_modules', 'assets', 'docs', '.git'])
const EXT = new Set(['.js', '.cjs', '.mjs'])

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (EXT.has(extname(name))) out.push(full)
  }
  return out
}

const files = ROOTS.flatMap((r) => walk(r))
let failed = 0
for (const file of files) {
  const res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (res.status !== 0) {
    failed++
    console.error(`✗ ${file}\n${res.stderr}`)
  }
}
console.log(`${files.length - failed}/${files.length} archivos JS sin errores de sintaxis`)
process.exit(failed ? 1 : 0)
