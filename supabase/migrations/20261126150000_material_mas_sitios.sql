-- Material de estudio: más sitios, más tipos y denuncias de material.
-- - Enlaces: antes solo Google Drive/Docs (lo exigía un CHECK). Ahora la API acepta una lista cerrada de sitios
--   legales (SITIOS_MATERIAL en supabase/functions/api/index.ts: Drive, OneDrive, Canva, Notion, Genially, Quizlet,
--   YouTube, revistas, .gob.ar, .edu.ar y más). La base solo exige https y un largo máximo: la lista vive en la API.
-- - Tipos nuevos: presentación, video, tarjetas/cuestionario, mapa conceptual y sitio web.
-- - Denuncias: se puede denunciar un material (enlace roto, contenido equivocado o con derechos de autor).
--
-- No es destructiva (las tablas de material están vacías al escribirla). Idempotente. Ejecutarla entera en
-- Supabase Dashboard > SQL Editor.
--
-- Reversión: volver a crear los CHECK anteriores (ver 20261123220000_material_estudio.sql) y
--   alter table public.denuncias drop constraint denuncias_tipo_chk,
--     add constraint denuncias_tipo_chk check (tipo in ('hilo', 'respuesta'));

alter table public.materiales drop constraint if exists materiales_link_check;
alter table public.materiales add constraint materiales_link_check
  check (char_length(link) <= 300 and link ~ '^https://[a-z0-9.-]+(/|$)');

alter table public.aportes_material drop constraint if exists aportes_material_link_check;
alter table public.aportes_material add constraint aportes_material_link_check
  check (char_length(link) <= 300 and link ~ '^https://[a-z0-9.-]+(/|$)');

alter table public.materiales drop constraint if exists materiales_tipo_check;
alter table public.materiales add constraint materiales_tipo_check
  check (tipo in ('resumen', 'apunte', 'guia', 'presentacion', 'video', 'flashcards', 'mapa', 'web', 'examen', 'libro', 'otro'));

alter table public.aportes_material drop constraint if exists aportes_material_tipo_check;
alter table public.aportes_material add constraint aportes_material_tipo_check
  check (tipo in ('resumen', 'apunte', 'guia', 'presentacion', 'video', 'flashcards', 'mapa', 'web', 'examen', 'libro', 'otro'));

alter table public.denuncias drop constraint if exists denuncias_tipo_chk;
alter table public.denuncias add constraint denuncias_tipo_chk check (tipo in ('hilo', 'respuesta', 'material'));

comment on table public.materiales is
  'Material de estudio (enlaces a sitios admitidos por la API). Lo cargan moderadores por la API o aprobando aportes.';
