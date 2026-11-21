# Roadmap técnico

Lista viva. Al terminar algo, borralo de acá (el historial queda en git).
Detalle de los ítems marcados con códigos (A1, M3…) en [diagnostico-web-2026-11.md](diagnostico-web-2026-11.md).

## Seguridad (urgente)
- [ ] Rotar la secret key de Supabase y el client secret de Google OAuth: estuvieron en texto plano en
      `Datos.txt` y fueron leídos durante la configuración con Claude Code. Actualizar los secrets de las Edge Functions
      (`GMAIL_CLIENT_SECRET` si cambia el de Google).
- [ ] Activar la protección contra contraseñas filtradas (Dashboard → Auth → Password security).
- [ ] Activar *Secure password change* en Auth (Dashboard → Auth → Providers → Email): el servidor exige
      reautenticación en sesiones viejas. La web ya verifica la contraseña actual (A3).
- [ ] Borrar el bucket heredado `avatares` (vacío) desde Dashboard → Storage.
- [ ] Probar un match real de punta a punta y confirmar que el mail llega (los `GMAIL_*` no se pudieron verificar).
- [ ] Documentar en un ADR (y en el aviso del sitio) que los moderadores ven el mail real del autor denunciado (M12).

## Web — bugs (diagnóstico 2026-11)
- [ ] `abrirHilo`: ignorar respuestas viejas si cambió el hilo y no llamar a `verHilo` con caché fresca (M1, M2).
- [ ] Placeholder en los selectores de comisión y foto PNG con fondo blanco al pasar a JPEG (M4, M5).

## Web — UX, accesibilidad y limpieza
- [ ] Reemplazar `alert` / `confirm` / `prompt` por mensajes en línea o un modal propio, sin "Detalle técnico" (M7).
- [ ] Sacar del registro los mensajes de error pensados para el admin (M8).
- [ ] Buscador del foro: texto de ayuda correcto, conectar o quitar el `datalist`, búsqueda sin tildes (`unaccent`) (M6).
- [ ] Evitar el parpadeo del login con sesión y del tema (aplicar el tema en el `<head>`; default "según el dispositivo") (M10).
- [ ] Selector de materia usable con teclado y lector de pantalla; `for` en los `<label>` del login (M11).
- [ ] Chat: "ver mensajes anteriores" y destrabar el botón Enviar tras un envío ambiguo (M9).
- [ ] Borrar código muerto (`cargarPerfil`, `cargarRolModerador`, `cargarSesionLocal`, `resetCodigo`,
      `medmar:perfil:optimista`, clave duplicada en `mensajeError`) y ordenar los parches del final de `styles.css`.
- [ ] Partir `web/js/app.js` en varios scripts por área (foro, intercambios, auth, …) cuidando el orden de carga;
      cada archivo < 800 líneas mejora mucho el trabajo con Claude Code y entre colaboradores.
- [ ] Tests de humo con Playwright (login, navegar vistas) contra un proyecto Supabase de prueba.
- [ ] Evaluar un proyecto Supabase de staging (el plan Free permite 2 proyectos activos).

## Juegos
Detalle de los códigos JUEGO-xx en [games/inmune-survivors/docs/diagnostico-2026-11.md](../games/inmune-survivors/docs/diagnostico-2026-11.md).

Los bugs JUEGO-01 a 14 se corrigieron en v3.5. Queda pendiente:

**Inmune Survivors — rendimiento móvil**
- [ ] Pools de objetos (proyectiles, partículas, textos) para evitar tirones del recolector en gama baja.
- [ ] Probar en celulares reales la nitidez ×1,5, el parallax y la pantalla completa (iPhone instalado en el inicio).

**Inmune Survivors — diseño y contenido**
- [ ] Ritmo: en simulaciones de 40 min salen 5–14 preguntas y nunca se llega a la multirresistencia; revisar la
      curva de XP (`xpNeed`) y medir con jugadores reales (tiempo hasta cada pregunta y duración de partida).
- [ ] Banco de preguntas: la correcta es la opción más larga en el 70 % de los casos; reescribir opciones con
      `revisor-contenido-medico` y balancear temas (Epidemiología y Patogenia tienen 1 pregunta cada una).
- [ ] Test de calidad del banco (longitudes de opciones, opciones plausibles relacionadas con la pregunta).

**Inmune Survivors — arquitectura**
- [ ] Refactor por etapas (§8 del diagnóstico): formatear `game.js` sin cambiar lógica (verificado con el arnés y la
      simulación con semilla), extraer datos a `src/data/`, estado inicial único (sin `|| valorPorDefecto`), sistemas con tests.

**Inmune Survivors — modos por núcleo de ADN** (plan en `games/inmune-survivors/docs/plan-modos-nucleos.md`)
- [ ] Etapa 2: horneado de texturas por especie (tinte y variaciones), nombre al aparecer, fichas médicas revisadas
      con `revisor-contenido-medico` y bestiario. El catálogo ya está en `src/data/agentes.js` (114 agentes, 10 núcleos).
- [ ] Revisar las 114 fichas desde la página de revisión (artifact "Fichas de agentes ADN") y aplicar las correcciones.
- [ ] 12 piezas de sprite nuevas (bacilo ácido-alcohol resistente, retrovirus, *Plasmodium*, *Pneumocystis*…).
- [ ] Modo Foco por núcleo (agentes y preguntas del núcleo) y Sandbox (Laboratorio para jugadores).

**Reportes anónimos**
- [ ] Instalar el Apps Script (`tools/reportes-apps-script/README.md`) y pegar la URL en `REPORTES_URL`
      (`web/js/app.js` y `games/inmune-survivors/game.js`). Hasta entonces la opción no se muestra.

**Integración**
- [ ] Integrar Inmune Survivors en la sección Juegos (`#vistaJuegos` → link/iframe a `/juegos/inmune-survivors/`).
      Mientras tanto, la tarjeta de Inicio no debería prometer un ranking.
- [ ] Ranking: tabla `puntajes_juegos` (RLS: select autenticados, sin insert directo) + acción `guardarPuntaje`
      con validación de plausibilidad (puntaje máximo por segundo jugado, duración mínima, rate limit) + `rankingJuego`.
      Las partidas del Laboratorio no deben poder enviar puntaje.

## Backend
- [ ] Quitar `legacyLogin` (acción, RPC `get_legacy_password` y tabla `private.legacy_password_migrations`, que ya
      está vacía): hoy cada login fallido gasta una invocación extra (M3).
- [ ] Etiquetas del foro sin leer 1000 hilos por carga (vista o tabla de etiquetas) y sin `count: 'exact'` por página (M13).
- [ ] Dividir `functions/api/index.ts` en módulos (`foro.ts`, `intercambios.ts`, …) importados por `index.ts`.
- [ ] Registrar las migraciones ya aplicadas en `supabase_migrations` (`supabase migration repair`) antes de
      usar `supabase db push`: hoy el historial está vacío.
- [ ] Versionar la configuración del cron y de Auth (providers, redirect URLs) en `docs/` o `supabase/config.toml`.
