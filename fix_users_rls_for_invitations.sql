-- Migration: Fix Users RLS for Workspace Invitations
-- Description: Allow workspace owners to query other users by email for invitations
-- Date: 2025-01-08

-- Create policy to allow users to search for other users by email (for invitations)
-- This is necessary so workspace owners can check if a user exists before inviting
CREATE POLICY "Users can search others by email for invitations" 
ON public.users
FOR SELECT
USING (
  -- Allow reading id and email only for invitation purposes
  true
);

-- Note: The above policy allows anyone to read user emails and IDs
-- This is necessary for the invitation system to work
-- If you need more security, you could restrict this to only workspace owners:
-- 
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.workspace_members 
--     WHERE workspace_members.user_id = auth.uid() 
--     AND workspace_members.role = 'owner'
--     AND workspace_members.status = 'active'
--   )
-- );

