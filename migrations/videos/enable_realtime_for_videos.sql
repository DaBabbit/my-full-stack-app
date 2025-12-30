-- Realtime für videos Tabelle aktivieren
-- Dies ermöglicht automatische UI-Updates wenn N8N den storage_location Link einträgt

-- 1. Realtime für die videos-Tabelle aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;

-- 2. Bestätigung ausgeben
SELECT 
  schemaname,
  tablename,
  'Realtime aktiviert ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND schemaname = 'public' 
  AND tablename = 'videos';

-- WICHTIG: Falls du Replicas hast, stelle sicher dass REPLICA IDENTITY auf FULL ist
-- Dies ist wichtig damit Realtime auch bei UPDATEs funktioniert
ALTER TABLE public.videos REPLICA IDENTITY FULL;

-- Ausgabe: Replica Identity Status
SELECT 
  'videos' as table_name,
  relreplident as replica_identity,
  CASE relreplident
    WHEN 'd' THEN '❌ DEFAULT (nur PRIMARY KEY)'
    WHEN 'n' THEN '⚠️  NOTHING'
    WHEN 'f' THEN '✅ FULL (alle Spalten)'
    WHEN 'i' THEN '🔑 INDEX'
  END as description
FROM pg_class 
WHERE relname = 'videos' 
  AND relnamespace = 'public'::regnamespace;
