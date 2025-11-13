-- Step 1: Identify User UUIDs for migration
-- Copy the results from this query for use in the migration script

-- Find all users in the system to help identify the correct ones
SELECT 
  id as uuid,
  email,
  firstname,
  lastname,
  CONCAT(firstname, ' ', lastname) as fullname,
  created_at
FROM public.users
WHERE 
  -- Search for users that might match the names
  (firstname ILIKE '%Peter%' OR lastname ILIKE '%Oulok%')
  OR (firstname ILIKE '%David%' OR lastname ILIKE '%Kosma%')
  OR email ILIKE '%karate%'
  OR email ILIKE '%gestarrt%'
ORDER BY created_at DESC;

-- If above doesn't find them, list ALL users to manually identify:
-- SELECT id, email, firstname, lastname FROM public.users ORDER BY email;

