// Arma el SQL que actualiza la publicación de bienvenida del foro con web/ayuda/bienvenida.md (la misma fuente que
// la novedad que ve cada cuenta al entrar). Ver docs/contenido-ayuda.md.
//
//   node scripts/bienvenida-sql.mjs        (imprime el SQL; se pega en el SQL Editor de Supabase)
//
// No escribe en la base. Valida los mismos límites que la API (título 140, contenido 5000).
import fs from 'node:fs'

const ID_PUBLICACION = 'b8946353-74a2-4d30-ace8-48978116ac3d'
const md = fs.readFileSync(new URL('../web/ayuda/bienvenida.md', import.meta.url), 'utf8').replace(/\r\n?/g, '\n')
const m = md.match(/^#\s+(.+)\n/)
if (!m) { console.error('bienvenida.md tiene que empezar con «# Título»'); process.exit(1) }
const titulo = m[1].trim()
const contenido = md.slice(m[0].length).trim()
// La API mide con length de JS (unidades UTF-16): se valida igual.
if (titulo.length > 140) { console.error(`Título de ${titulo.length} caracteres (máx. 140)`); process.exit(1) }
if (contenido.length > 5000) { console.error(`Contenido de ${contenido.length} caracteres (máx. 5000)`); process.exit(1) }
if ((titulo + contenido).includes('$bv$')) { console.error('El texto no puede contener $bv$'); process.exit(1) }

console.log(`-- Publicación de bienvenida del foro <- web/ayuda/bienvenida.md (${contenido.length} caracteres)
update public.hilos
   set titulo = $bv$${titulo}$bv$,
       contenido = $bv$${contenido}$bv$
 where id = '${ID_PUBLICACION}'
returning id, titulo, length(contenido) as caracteres;`)
