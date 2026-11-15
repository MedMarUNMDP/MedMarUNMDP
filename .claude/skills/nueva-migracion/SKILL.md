---
name: nueva-migracion
description: Crea una migración SQL nueva para la base Supabase de MedMar con RLS y políticas. Usar ante cualquier cambio de schema - tablas, columnas, índices, funciones, políticas, triggers o realtime.
argument-hint: "<descripción del cambio>"
---

# Nueva migración SQL

Cambio pedido: $ARGUMENTS

1. **Mirá el estado actual** antes de escribir: `supabase/migrations/*.sql` y, si el MCP `supabase` está conectado,
   `list_tables` / `execute_sql` (solo `SELECT`) para confirmar lo que hay en producción.
2. Creá `supabase/migrations/<AAAAMMDDHHMMSS>_<descripcion_snake>.sql` (timestamp actual, posterior al último).
   **Nunca** edites una migración ya aplicada.
3. Escribila **idempotente**, como el schema inicial: `create table if not exists`, `create or replace function`,
   `drop policy if exists … ; create policy …`, `add column if not exists`.
4. Checklist obligatorio por tabla nueva:
   - `alter table … enable row level security;`
   - Políticas explícitas por operación (`select`/`insert`/`update`/`delete`) y rol (`authenticated`), usando
     `auth.uid()` y helpers existentes (`is_moderator`, `is_admin`, `is_conversation_participant`, …).
   - Índices para los filtros y órdenes que vaya a usar la Edge Function.
   - `updated_at` con trigger `set_updated_at` si corresponde.
   - Funciones `security definer` → `set search_path = public` y validar permisos adentro.
   - Datos con vencimiento → sumarlos a `cleanup_expired_data()` (plan Free: ~500 MB).
5. Encabezado del archivo: qué hace, si es destructiva, y "Ejecutar en Supabase Dashboard > SQL Editor".
6. Si hay que actualizar `supabase/CLAUDE.md` (modelo de datos), hacelo.
7. **No la apliques.** Mostrale al usuario el SQL y cómo aplicarla (SQL Editor o, si lo pide, `apply_migration`
   del MCP en modo escritura). Sugerí correr después los advisors de seguridad (`get_advisors`).
