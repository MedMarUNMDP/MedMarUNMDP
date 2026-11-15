# 0001 — Monorepo único para web, backend y juegos

Fecha: 2026-11-15 · Estado: aceptada

## Contexto
El sitio vivía en `MedMarPage/` (repo git propio, publicado por GitHub Pages desde la raíz) y el backend y los
juegos estaban sueltos en `MedMar arch/` (con extensiones `.txt`, sin control de versiones, junto a credenciales).

## Decisión
Un solo repo (se conserva el historial y el remoto de `MedMarPage`) con `web/`, `supabase/`, `games/<slug>/`, `docs/`.
Pages pasa a publicarse con GitHub Actions armando `_site/` desde `web/` + `games/*`.
Credenciales a `.secrets/` (ignorado); zips a `archive/` (ignorado).
`web/index.html` se separó en `index.html` + `css/styles.css` + `js/app.js` sin cambios de lógica.

## Consecuencias
- Claude Code y colaboradores ven todo el sistema y sus `CLAUDE.md` por área; un cambio que cruza web+API va en un commit.
- Si el repo es público (requisito de Pages en planes gratuitos de GitHub), el código del backend y el schema quedan visibles. Es aceptable porque la
  seguridad descansa en RLS y en secretos fuera del repo, pero obliga a no commitear nada sensible nunca.
- Hay que cambiar una vez la fuente de Pages a "GitHub Actions" (ver `docs/deploy.md`).
