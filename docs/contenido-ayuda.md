# Bienvenida y Ayuda: cómo mantenerlas al día

MedMar tiene dos textos para las personas que lo usan. Tienen que contar **cómo funciona la web hoy**.

| Texto | Dónde vive | Dónde se ve |
|---|---|---|
| **Bienvenida** | `web/ayuda/bienvenida.md` | Novedad al entrar por primera vez (`#modalBienvenida`), Ayuda → «Leer la bienvenida» y la publicación de bienvenida del foro |
| **Ayuda** | `#vistaAyuda` en `web/index.html` (HTML estático) | Inicio → Ayuda, Perfil → Ayuda y contacto, pie de página y `/?vista=ayuda` |

## Regla

**Si un cambio modifica algo que ven o hacen las personas, en el mismo commit se actualiza la Ayuda. Si es una
función general o cambia un dato de la bienvenida, también se actualiza la bienvenida.**

Pasa, por ejemplo, con una herramienta nueva, un plazo que cambia («14 días», «60 días»), un botón que cambia de
nombre, una sanción o un límite nuevo, o un dato de contacto distinto.

Datos que hoy aparecen en los dos textos (si cambian, buscalos en ambos):

| Dato | Valor |
|---|---|
| Vencimiento de las solicitudes de intercambio | 14 días |
| Duración de los avisos de Compra venta | 60 días, renovables; hasta 5 activos |
| Etiquetas por publicación del foro | hasta 5 |
| Sanciones | strikes de 30 días; el 3.º en 12 meses es permanente |
| Material del catálogo | revisado; el material del foro no |

## Bienvenida (`web/ayuda/bienvenida.md`)

Usa el mismo markdown liviano del foro (`renderizarFormato`): `##`, listas, **negrita**, cuadros `> [!nota|importante|consejo]`
y tablas.

- La **primera línea** es `# Título`. Es el título de la publicación y del aviso.
- Lo que va después del **último `---`** sale solo en el foro, por ejemplo «comentala acá abajo». El aviso lo corta.
- Máximo 5000 caracteres de contenido y 140 de título, los mismos límites de la API.

**Al cambiarla:**

1. Editá `web/ayuda/bienvenida.md`.
2. ¿Querés que **todas las cuentas la vuelvan a ver** como novedad? Subí `BIENVENIDA_VERSION` en `web/js/app.js`
   (formato `AAAA-MM-DD` o `AAAA-MM-DD.N`). Si es una corrección chica, no la subas.
3. Actualizá la publicación del foro:

   ```powershell
   node scripts/bienvenida-sql.mjs
   ```

   Pegá el SQL que imprime en el SQL Editor de Supabase. Es un `update` sobre una sola publicación, por id.
4. Commit y push (Pages publica el `.md` con el resto de `web/`).

Cómo funciona por dentro: `bootstrap` devuelve `perfil.bienvenidaVersion`, y si no coincide con `BIENVENIDA_VERSION`, la web
muestra el aviso cuando no hay otra ventana abierta (completar el perfil, términos o sanción). Se da por vista al
mostrarla: `marcarBienvenida` la guarda en `profiles.bienvenida_version`.

## Ayuda (`#vistaAyuda`)

Está en tres grupos (`h3.grupoAyuda`): **Cómo usar MedMar**, **Situaciones especiales** e **Información legal y contacto**.

- Cada tema es un `<details class="guiaTema" id="ayuda…" data-palabras="…">`. En `data-palabras` van sinónimos y
  palabras que la gente buscaría sin tildes («contraseña olvide recuperar»). El buscador mira el título, el texto y esas palabras.
- `<button class="guiaIr" data-ayuda-ir="foro">` lleva a una vista (`foro`, `intercambios`, `material`, `clasificados`,
  `juegos`, `configuracion`, `reportes`). `data-ayuda-tema="ayudaContacto"` abre otro tema.
- Texto corto, en segunda persona y en rioplatense. Contá qué hacer, no cómo está programado.
- Los teléfonos de **«Estoy pasando un mal momento»** se revisan una vez por año contra la fuente oficial
  (Centro de Asistencia al Suicida: asistenciaalsuicida.org.ar). Última revisión: 2026-11-29.

**Tema nuevo:** copiá uno existente y ponele un `id` único y `data-palabras`. Ponelo en el grupo que corresponde.

## Relacionado

- Términos y Privacidad (`web/terminos/`, `web/privacidad/`): si cambian de fondo, ver `web/CLAUDE.md`. El tema
  «Información legal» de la Ayuda los resume, así que revisalo.
- Guía de moderación (pestaña «Guía» del panel): es para el equipo y se mantiene aparte.
