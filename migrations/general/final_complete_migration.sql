-- FINAL COMPLETE MIGRATION
-- Fixes remaining 10 videos with names + 1 broken UUID

-- 1. Fix Peter OulokAccountNachname (6 videos remaining)
UPDATE public.videos
SET responsible_person = 'eecb20b7-bdde-4105-9052-19ae1a3febc7',
    updated_at = NOW()
WHERE responsible_person = 'Peter OulokAccountNachname'
  AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Fix David KosmahdmAccountTest (3 videos remaining)
UPDATE public.videos
SET responsible_person = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2',
    updated_at = NOW()
WHERE responsible_person = 'David KosmahdmAccountTest'
  AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 3. Fix karate_gestarrt.15 (1 video remaining)
UPDATE public.videos
SET responsible_person = '185d79b4-c3fd-4637-85f4-3a5214efa7ee',
    updated_at = NOW()
WHERE responsible_person = 'karate_gestarrt.15'
  AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 4. Fix BROKEN UUID (0c626cc7-e0b3-41e7-8dfd-12c3c046bed5 doesn't exist!)
-- Set to NULL or assign to a real user (I'll set to NULL for now)
UPDATE public.videos
SET responsible_person = NULL,
    updated_at = NOW()
WHERE responsible_person = '0c626cc7-e0b3-41e7-8dfd-12c3c046bed5';

-- 5. FINAL VERIFICATION
SELECT 
  responsible_person,
  COUNT(*) as count,
  CASE 
    WHEN responsible_person ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID'
    WHEN responsible_person IS NULL THEN '⚪ NULL'
    ELSE '❌ NAME (PROBLEM!)'
  END as status
FROM public.videos
GROUP BY responsible_person
ORDER BY status, count DESC;

-- 6. Count summary
SELECT 
  CASE 
    WHEN responsible_person ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUIDs'
    WHEN responsible_person IS NULL THEN '⚪ NULL'
    ELSE '❌ NAMEs (PROBLEM!)'
  END as type,
  COUNT(*) as total
FROM public.videos
GROUP BY type;

-- Expected result:
-- ✅ UUIDs: 28 videos
-- ⚪ NULL: 10 videos
-- ❌ NAMEs: 0 videos (MUST BE ZERO!)

