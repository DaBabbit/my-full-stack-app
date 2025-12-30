-- Migration: Fix Invitation Email and Unique Constraint
-- Description: Fix duplicate key error and ensure invitation_email is saved
-- Date: 2025-01-08

-- Drop the old unique constraint that's causing issues
ALTER TABLE public.workspace_members 
DROP CONSTRAINT IF EXISTS workspace_members_unique_user_workspace;

-- Create a new unique constraint that allows multiple pending invitations with same email
-- but prevents duplicate active memberships
CREATE UNIQUE INDEX workspace_members_unique_active_membership 
ON public.workspace_members (workspace_owner_id, user_id) 
WHERE status = 'active';

-- Create a unique index for invitation_email to prevent duplicate invitations
CREATE UNIQUE INDEX workspace_members_unique_pending_invitation_email
ON public.workspace_members (workspace_owner_id, invitation_email)
WHERE status = 'pending' AND invitation_email IS NOT NULL;

-- Comment for documentation
COMMENT ON INDEX workspace_members_unique_active_membership IS 'Ensures only one active membership per user per workspace';
COMMENT ON INDEX workspace_members_unique_pending_invitation_email IS 'Prevents duplicate pending invitations to the same email';

