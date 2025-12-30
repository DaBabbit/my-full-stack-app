-- Find "Broken" UUIDs - UUIDs in videos.responsible_person that don't exist in users table
-- This explains the 406 errors!

-- 1. Find all UUIDs that don't match any user
SELECT 
  v.responsible_person as broken_uuid,
  COUNT(*) as affected_videos,
  STRING_AGG(v.title, ', ') as video_titles
FROM public.videos v
WHERE v.responsible_person IS NOT NULL
  AND v.responsible_person ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND NOT EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id::text = v.responsible_person
  )
GROUP BY v.responsible_person;

-- 2. List all existing users (to find correct replacement)
SELECT 
  id as user_uuid,
  email,
  firstname,
  lastname,
  CONCAT(firstname, ' ', lastname) as fullname
FROM public.users
ORDER BY email;

-- 3. Recommended Action:
-- If broken UUIDs found: Set them to NULL or assign to correct user
-- Example:
-- UPDATE public.videos 
-- SET responsible_person = NULL 
-- WHERE responsible_person = 'BROKEN_UUID_HERE';

