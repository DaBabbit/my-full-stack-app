-- =====================================================
-- Realtime für Videos-Tabelle aktivieren
-- =====================================================
-- 
-- Dieses Script aktiviert Supabase Realtime für die videos-Tabelle,
-- sodass Clients sofort über Änderungen (INSERT, UPDATE, DELETE) benachrichtigt werden.
-- 
-- Wichtig für: Automatisches UI-Update wenn N8N den storage_location Link einträgt!
--
-- Ausführen in: Supabase SQL Editor
-- =====================================================

-- 1. Realtime für die videos-Tabelle aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;

-- 2. Prüfen ob Realtime aktiviert ist (zur Bestätigung)
SELECT 
  schemaname,
  tablename,
  'Realtime aktiviert' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND schemaname = 'public' 
  AND tablename = 'videos';

-- Erwartetes Ergebnis:
-- | schemaname | tablename | status              |
-- |------------|-----------|---------------------|
-- | public     | videos    | Realtime aktiviert  |
--
-- Falls keine Zeile zurückkommt, wurde Realtime NICHT aktiviert!

