-- Step 2: Migration Script - Replace UUIDs below with results from step1_identify_user_uuids.sql
-- THIS IS A TEMPLATE - REPLACE THE UUID PLACEHOLDERS BEFORE RUNNING!

BEGIN;

-- 1. Create backup table
CREATE TABLE IF NOT EXISTS videos_backup_20251113 AS 
SELECT id, responsible_person, updated_at, title
FROM public.videos;

-- Verify backup was created
SELECT COUNT(*) as backed_up_videos FROM videos_backup_20251113;

-- 2. Update Peter OulokAccountNachname (6 videos)
-- REPLACE THIS UUID WITH PETER'S ACTUAL UUID FROM STEP 1:
UPDATE public.videos
SET responsible_person = 'REPLACE_WITH_PETER_UUID_FROM_STEP1',
    updated_at = NOW()
WHERE responsible_person = 'Peter OulokAccountNachname'
  AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Verify Peter's migration
SELECT COUNT(*) as peters_videos_migrated 
FROM public.videos 
WHERE responsible_person = 'REPLACE_WITH_PETER_UUID_FROM_STEP1';

-- 3. Update David KosmahdmAccountTest (3 videos)
-- REPLACE THIS UUID WITH DAVID'S ACTUAL UUID FROM STEP 1:
UPDATE public.videos
SET responsible_person = 'REPLACE_WITH_DAVID_UUID_FROM_STEP1',
    updated_at = NOW()
WHERE responsible_person = 'David KosmahdmAccountTest'
  AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Verify David's migration
SELECT COUNT(*) as davids_videos_migrated 
FROM public.videos 
WHERE responsible_person = 'REPLACE_WITH_DAVID_UUID_FROM_STEP1';

-- 4. Update karate_gestarrt.15 (1 video)
-- REPLACE THIS UUID WITH KARATE'S ACTUAL UUID FROM STEP 1:
UPDATE public.videos
SET responsible_person = 'REPLACE_WITH_KARATE_UUID_FROM_STEP1',
    updated_at = NOW()
WHERE responsible_person = 'karate_gestarrt.15'
  AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Verify karate's migration
SELECT COUNT(*) as karates_videos_migrated 
FROM public.videos 
WHERE responsible_person = 'REPLACE_WITH_KARATE_UUID_FROM_STEP1';

-- 5. FINAL VERIFICATION - Check if any names remain
SELECT 
  COUNT(*) as remaining_names,
  STRING_AGG(DISTINCT responsible_person, ', ') as names_list
FROM public.videos
WHERE responsible_person IS NOT NULL
  AND responsible_person !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 6. Show summary of migration
SELECT 
  responsible_person,
  COUNT(*) as count,
  CASE 
    WHEN responsible_person ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ UUID'
    WHEN responsible_person IS NULL THEN 'NULL'
    ELSE '❌ NAME (STILL NEEDS MIGRATION)'
  END as status
FROM public.videos
WHERE responsible_person IS NOT NULL
GROUP BY responsible_person
ORDER BY status, count DESC;

-- 7. DECISION POINT:
-- If remaining_names = 0 and all videos show ✅ UUID: Run COMMIT;
-- If anything shows ❌ NAME: Run ROLLBACK; and check your UUIDs

-- COMMIT; -- Uncomment this line when verification looks good
-- ROLLBACK; -- Uncomment this line if you want to undo everything

