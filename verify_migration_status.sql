-- Verify Migration Status
-- Run this to check if the migration was successful

SELECT 
  responsible_person,
  COUNT(*) as count,
  CASE 
    WHEN responsible_person ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID'
    WHEN responsible_person IS NULL THEN '⚪ NULL'
    ELSE '❌ NAME (NEEDS MIGRATION!)'
  END as status
FROM public.videos
GROUP BY responsible_person
ORDER BY status, count DESC;

-- Count breakdown
SELECT 
  CASE 
    WHEN responsible_person ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUIDs'
    WHEN responsible_person IS NULL THEN '⚪ NULL'
    ELSE '❌ NAMEs (PROBLEM!)'
  END as type,
  COUNT(*) as total
FROM public.videos
GROUP BY type;

