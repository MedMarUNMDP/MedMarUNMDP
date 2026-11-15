-- MedMarUNMDP - Realtime para detectar matches sin recargar la página
-- Ejecutar una sola vez en Supabase > SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'solicitudes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes;
  END IF;
END $$;

-- Opcional pero útil para futuras actualizaciones de la UI del intercambio.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'intercambio_participantes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.intercambio_participantes;
  END IF;
END $$;

SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
  AND tablename IN ('mensajes', 'solicitudes', 'intercambio_participantes')
ORDER BY tablename;
