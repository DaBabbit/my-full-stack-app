-- Step 3: ROLLBACK Script (Only use if migration went wrong)
-- This restores responsible_person values from the backup

BEGIN;

-- Restore all responsible_person values from backup
UPDATE public.videos v
SET responsible_person = b.responsible_person,
    updated_at = NOW()
FROM videos_backup_20251113 b
WHERE v.id = b.id
  AND v.responsible_person != b.responsible_person; -- Only update changed ones

-- Verify rollback
SELECT 
  COUNT(*) as restored_videos
FROM public.videos v
JOIN videos_backup_20251113 b ON v.id = b.id
WHERE v.responsible_person = b.responsible_person;

-- Show comparison
SELECT 
  'After Rollback' as status,
  responsible_person,
  COUNT(*) as count
FROM public.videos
WHERE responsible_person IS NOT NULL
GROUP BY responsible_person
ORDER BY count DESC;

COMMIT;

-- After successful rollback, you can drop the backup:
-- DROP TABLE videos_backup_20251113;

