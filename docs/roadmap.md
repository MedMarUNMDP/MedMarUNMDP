# Roadmap técnico

Lista viva. Al terminar algo, borralo de acá (el historial queda en git).

## Seguridad (urgente)
- [ ] Rotar la secret key de Supabase y el client secret de Google OAuth: estuvieron en texto plano en
      `Datos.txt` y fueron leídos durante la configuración con Claude Code. Actualizar los secrets de las Edge Functions.
- [ ] Correr los advisors de seguridad de Supabase (MCP `get_advisors`) y resolver lo que marquen.

## Juegos
- [ ] Integrar Inmune Survivors en la sección Juegos (`#vistaJuegos` → link/iframe a `/juegos/inmune-survivors/`).
- [ ] Ranking: tabla `puntajes_juegos` (RLS: select autenticados, sin insert directo) + acción `guardarPuntaje`
      con validación de plausibilidad (puntaje máximo por segundo jugado, duración mínima, rate limit) + `rankingJuego`.
- [ ] Inmune Survivors: corregir bugs del diagnóstico v3.4 (NaN en Estallido respiratorio, mejoras cuyo efecto no
      coincide con el texto), seguir extrayendo lógica de `Arena` a `src/` con tests.
- [ ] Convertir los `.png` de tejidos (~1,8 MB c/u) a `.webp` y usar solo esos.
- [ ] Unificar versiones (`?build=`, `iniciar_juego.py`, títulos de `.bat`).

## Web
- [ ] Partir `web/js/app.js` en varios scripts por área (foro, intercambios, auth, …) cuidando el orden de carga;
      cada archivo < 800 líneas mejora mucho el trabajo con Claude Code y entre colaboradores.
- [ ] Tests de humo con Playwright (login, navegar vistas) contra un proyecto Supabase de prueba.
- [ ] Evaluar un proyecto Supabase de staging (el plan Free permite 2 proyectos activos).

## Backend
- [ ] Dividir `functions/api/index.ts` en módulos (`foro.ts`, `intercambios.ts`, …) importados por `index.ts`.
- [ ] Versionar la configuración del cron y de Auth (providers, redirect URLs) en `docs/` o `supabase/config.toml`.
