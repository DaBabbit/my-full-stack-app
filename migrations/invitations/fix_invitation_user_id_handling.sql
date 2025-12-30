-- Migration: Fix Invitation User ID Handling
-- Description: Allow NULL user_id for pending invitations to non-registered users
-- Date: 2025-01-08

-- First, make user_id nullable for pending invitations
ALTER TABLE public.workspace_members
ALTER COLUMN user_id DROP NOT NULL;

-- Update existing invitations where user_id = workspace_owner_id to NULL
-- These are invitations to users who don't exist yet
UPDATE public.workspace_members
SET user_id = NULL
WHERE status = 'pending' 
  AND user_id = workspace_owner_id
  AND invitation_email IS NOT NULL;

-- Drop the old unique constraint if it exists
DROP INDEX IF EXISTS workspace_members_unique_active_membership;
DROP INDEX IF EXISTS workspace_members_unique_pending_invitation_email;

-- Create new unique constraints that handle NULL user_id properly
-- For active memberships: user_id must be unique per workspace
CREATE UNIQUE INDEX workspace_members_unique_active_membership 
ON public.workspace_members (workspace_owner_id, user_id) 
WHERE status = 'active' AND user_id IS NOT NULL;

-- For pending invitations: invitation_email must be unique per workspace
CREATE UNIQUE INDEX workspace_members_unique_pending_invitation_email
ON public.workspace_members (workspace_owner_id, invitation_email)
WHERE status = 'pending' AND invitation_email IS NOT NULL;

-- Comments
COMMENT ON INDEX workspace_members_unique_active_membership IS 'Ensures only one active membership per user per workspace';
COMMENT ON INDEX workspace_members_unique_pending_invitation_email IS 'Prevents duplicate pending invitations to the same email per workspace';

