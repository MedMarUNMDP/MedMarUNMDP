# MedMar

Red social universitaria **por y para estudiantes** de la Facultad de Medicina de la UNMDP
(medmar.com.ar). Mezcla foro estilo Reddit/X, intercambio de comisiones entre alumnos, chat
y una sección de juegos educativos. No es un sitio oficial de la facultad.

Idioma: todo (UI, código, commits, docs) en **español rioplatense** ("vos", "tenés").
Los identificadores del código ya están en español (`llamar`, `hilos`, `solicitudes`): seguí esa convención.

## Mapa del repo (monorepo)

| Carpeta | Qué es | Detalle |
|---|---|---|
| `web/` | Frontend estático (HTML + CSS + JS vanilla, sin build) | [web/CLAUDE.md](web/CLAUDE.md) |
| `supabase/` | Backend: Edge Functions (Deno/TS) + migraciones SQL | [supabase/CLAUDE.md](supabase/CLAUDE.md) |
| `games/` | Juegos Phaser, cada uno autocontenido | [games/CLAUDE.md](games/CLAUDE.md) |
| `docs/` | Arquitectura, deploy, roadmap y decisiones (ADRs) | [docs/arquitectura.md](docs/arquitectura.md) |
| `scripts/` | Utilidades Node sin dependencias (`check.mjs`) | |
| `.secrets/`, `archive/` | Credenciales y zips viejos. **Ignorados por git. No leer.** | |

Cada subcarpeta tiene su propio `CLAUDE.md` que se carga solo cuando trabajás ahí: mantené
este archivo corto y poné el detalle de cada área en el suyo.

## Comandos

```bash
npm test              # tests de todos los juegos (node --test)
npm run check         # node --check de todo el JS del repo
npm run dev:web       # sirve web/ en http://localhost:5500
npm run dev:juego     # sirve games/inmune-survivors/ en http://localhost:5501
```

No hay `npm install`: el repo no tiene dependencias. Phaser y supabase-js se cargan por CDN.

## Arquitectura en 4 líneas

1. `web/` habla con Supabase **solo** a través de la Edge Function `api` (`llamar("accion", params)` → `supabase/functions/api`).
2. La Edge Function valida sesión, aplica rate limit e idempotencia, y usa RLS (cliente de usuario) o la secret key (cliente admin) según el caso.
3. `maintenance` corre por cron: procesa la cola `notificacion_queue` y manda mails por Gmail API.
4. Deploy: GitHub Pages (workflow `.github/workflows/pages.yml`) publica `web/` + `games/*` en `/juegos/<slug>/`.

## Reglas que no se negocian

- **Secretos**: la secret key de Supabase, el client secret de Google y los tokens de Gmail viven en
  Supabase (Edge Function secrets) y en `.secrets/` local. Nunca en `web/`, `games/` ni en commits.
  La publishable key (`sb_publishable_…`) sí puede ir en el frontend. Un hook bloquea escrituras con secretos.
- **Seguridad en la base**: toda tabla nueva lleva `enable row level security` + políticas. Ver `/nueva-migracion`.
- **Plan Free de Supabase**: cuidá invocaciones de Edge Functions, egress y tamaño de DB (ver `supabase/CLAUDE.md`).
  Preferí cache en cliente, paginación y polling moderado antes que más requests.
- **Producción es real**: no hay staging. Nada de `supabase db push`, deploy de funciones o SQL de escritura
  sin que el usuario lo pida explícitamente. El MCP de Supabase está en modo solo lectura.
- **No pushear** sin pedido explícito: un push a `main` publica el sitio.
- Antes de dar algo por terminado: `npm run check` y `npm test`; si tocaste UI, probala en el navegador.

## Flujo de trabajo recomendado

- Tareas grandes: empezá en **plan mode**, explorá con subagentes, después implementá.
- Para extender el backend usá los skills: `/nueva-accion-api`, `/nueva-migracion`. Para juegos: `/publicar-juego`, `/nuevo-juego`.
- Revisiones especializadas (subagentes en `.claude/agents/`): `revisor-seguridad`, `revisor-contenido-medico`, `analista-balance`.
- Archivos grandes (`web/js/app.js` ~3.500 líneas, `games/inmune-survivors/game.js` ~1.900 líneas largas):
  buscá con Grep por sección (`// ====`) y leé por rangos; no los leas enteros.
- Decisiones de arquitectura nuevas → un ADR corto en `docs/decisiones/`.
