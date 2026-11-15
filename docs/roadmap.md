# Roadmap técnico

Lista viva. Al terminar algo, borralo de acá (el historial queda en git).

## Seguridad (urgente)
- [ ] Rotar la secret key de Supabase y el client secret de Google OAuth: estuvieron en texto plano en
      `Datos.txt` y fueron leídos durante la configuración con Claude Code. Actualizar los secrets de las Edge Functions.
- [ ] Resolver los hallazgos de [auditoria-supabase-2026-11.md](auditoria-supabase-2026-11.md) (advisors ya corridos):
  - [ ] **A1** Programar `maintenance`: hoy nada la invoca y los mails de match no salen. Antes, decidir qué hacer
        con las 4 notificaciones `pendiente` de septiembre.
  - [ ] **A2** Reemplazar el cron roto `medmar-limpieza-diaria` (`limpiar_expirados`, falla a diario) por
        `cleanup_expired_data()`.
  - [ ] **A3** Commitear la migración de alineación B1 (`profile_completed`, `is_sensitive`, `parent_id`, índices).
  - [ ] **M1–M4** Migración B2: borrar 50 RPC heredadas y el bucket `avatares`, revocar `consume_rate_limit` a
        `authenticated`, fijar `search_path` y poner límites al bucket `profile-photos`.
  - [ ] **M5** `maintenance` fail-closed si falta `MEDMAR_CRON_SECRET` (requiere deploy).
  - [ ] Activar la protección contra contraseñas filtradas en Auth.
- [ ] Keep-alive semanal (GitHub Actions → acción `health`) para que el proyecto no se pause en el receso.

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
- [ ] Registrar las migraciones ya aplicadas en `supabase_migrations` (`supabase migration repair`) antes de
      usar `supabase db push`: hoy el historial está vacío.
- [ ] Versionar la configuración del cron y de Auth (providers, redirect URLs) en `docs/` o `supabase/config.toml`.
