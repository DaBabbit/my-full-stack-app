-- Migration: Convert responsible_person from names to UUIDs
-- This script updates all videos where responsible_person contains a name instead of a UUID

-- 1. Update kosmamedia entries
UPDATE public.videos
SET responsible_person = (
  SELECT id 
  FROM public.users 
  WHERE email ILIKE '%kosmamedia%' 
  LIMIT 1
)
WHERE responsible_person IS NOT NULL
  AND responsible_person ILIKE '%kosmamedia%'
  AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. For other names, try to find matching users by firstname/lastname combination
-- This is more complex and might need manual review, so we'll log them first

-- First, let's see what non-UUID values we have:
SELECT DISTINCT responsible_person, COUNT(*) as count
FROM public.videos
WHERE responsible_person IS NOT NULL
  AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
GROUP BY responsible_person
ORDER BY count DESC;

-- 3. Manual update examples (adjust as needed based on your data):
-- UPDATE public.videos
-- SET responsible_person = 'USER_UUID_HERE'
-- WHERE responsible_person = 'Peter OulokAccountNachname'
--   AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Verify the migration
SELECT 
  responsible_person,
  COUNT(*) as count,
  CASE 
    WHEN responsible_person ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'UUID'
    WHEN responsible_person IS NULL THEN 'NULL'
    ELSE 'NAME (needs migration)'
  END as type
FROM public.videos
WHERE responsible_person IS NOT NULL
GROUP BY responsible_person
ORDER BY type, count DESC;

