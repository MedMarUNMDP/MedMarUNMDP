# Deploy

## Frontend + juegos (GitHub Pages)

Repo: `MedMarUNMDP/MedMarUNMDP`, rama `main`. Desde la reorganización en monorepo el sitio ya **no** está en la
raíz del repo sino en `web/`, así que GitHub Pages tiene que publicar con GitHub Actions.

**Paso único, antes del primer push del monorepo:**
1. GitHub → repo → Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Confirmá que el dominio personalizado siga siendo `medmar.com.ar` (misma pantalla) y "Enforce HTTPS".
3. Hacé push. El workflow `.github/workflows/pages.yml` corre tests, arma `_site/` (web + `/juegos/<slug>/`) y publica.

Si pusheás sin hacer el paso 1, Pages seguiría sirviendo la raíz del repo y el sitio quedaría roto
(no hay `index.html` en la raíz). Para volver atrás: Source = GitHub Actions y re-ejecutar el workflow.

Caché: al cambiar `web/css/styles.css` o `web/js/app.js`, subí el `?v=` en `web/index.html`.

## Backend (Supabase)

- **Edge Functions**: `npx supabase login`, `npx supabase link --project-ref ekfwdrsehhmrqxxlefyx`, después
  `npx supabase functions deploy api` (o `maintenance`). Alternativa: pegar el código en el editor del dashboard.
- **Secrets**: Dashboard → Edge Functions → Secrets (nombres en `.env.example`).
- **Migraciones**: pegar el archivo de `supabase/migrations/` en el SQL Editor. Orden por timestamp.
- **Cron de `maintenance`**: configurado en el proyecto (pg_cron/pg_net o scheduler) con el header `x-medmar-cron-secret`.

Orden seguro cuando un cambio toca ambos lados: migración → Edge Function → frontend.
