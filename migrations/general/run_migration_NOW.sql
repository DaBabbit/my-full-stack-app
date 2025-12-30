-- MIGRATION: Namen zu UUIDs konvertieren
-- Dieses Script führt die Migration DIREKT aus und committed automatisch

-- 1. Backup erstellen (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS videos_backup_20251113 AS 
SELECT id, responsible_person, updated_at, title
FROM public.videos;

-- 2. Peter OulokAccountNachname → UUID
UPDATE public.videos
SET responsible_person = 'eecb20b7-bdde-4105-9052-19ae1a3febc7',
    updated_at = NOW()
WHERE responsible_person = 'Peter OulokAccountNachname';

-- 3. David KosmahdmAccountTest → UUID
UPDATE public.videos
SET responsible_person = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2',
    updated_at = NOW()
WHERE responsible_person = 'David KosmahdmAccountTest';

-- 4. karate_gestarrt.15 → UUID
UPDATE public.videos
SET responsible_person = '185d79b4-c3fd-4637-85f4-3a5214efa7ee',
    updated_at = NOW()
WHERE responsible_person = 'karate_gestarrt.15';

-- 5. VERIFICATION - Zeige Ergebnis
SELECT 
  responsible_person,
  COUNT(*) as count,
  CASE 
    WHEN responsible_person ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID'
    WHEN responsible_person IS NULL THEN '⚪ NULL'
    ELSE '❌ NAME'
  END as status
FROM public.videos
GROUP BY responsible_person
ORDER BY status, count DESC;

-- SUCCESS MESSAGE
SELECT 
  '✅ MIGRATION COMPLETED!' as message,
  COUNT(*) as total_videos_migrated
FROM public.videos
WHERE responsible_person IN (
  'eecb20b7-bdde-4105-9052-19ae1a3febc7',
  '8ed7f903-a032-4bb8-adde-4248b2d3c0d2',
  '185d79b4-c3fd-4637-85f4-3a5214efa7ee'
);

