-- Migration: Add Workspace Collaboration System
-- Description: Adds workspace_members table and extends videos table for team collaboration
-- Date: 2025-01-08

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_owner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'collaborator', 'viewer')),
  permissions jsonb NOT NULL DEFAULT '{"can_view": true, "can_create": false, "can_edit": false, "can_delete": false}'::jsonb,
  invited_by uuid NULL,
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'removed')),
  invitation_token text NULL,
  invitation_email text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_pkey PRIMARY KEY (id),
  CONSTRAINT workspace_members_workspace_owner_id_fkey FOREIGN KEY (workspace_owner_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT workspace_members_unique_user_workspace UNIQUE (workspace_owner_id, user_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_owner ON public.workspace_members(workspace_owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_status ON public.workspace_members(status);
CREATE INDEX IF NOT EXISTS idx_workspace_members_invitation_token ON public.workspace_members(invitation_token) WHERE invitation_token IS NOT NULL;

-- Extend videos table for collaboration
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS workspace_owner_id uuid NULL,
ADD COLUMN IF NOT EXISTS created_by uuid NULL;

-- Add foreign keys for videos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'videos_workspace_owner_id_fkey'
  ) THEN
    ALTER TABLE public.videos 
    ADD CONSTRAINT videos_workspace_owner_id_fkey 
    FOREIGN KEY (workspace_owner_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'videos_created_by_fkey'
  ) THEN
    ALTER TABLE public.videos 
    ADD CONSTRAINT videos_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for videos
CREATE INDEX IF NOT EXISTS idx_videos_workspace_owner_id ON public.videos(workspace_owner_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_by ON public.videos(created_by);

-- Migrate existing videos: Set workspace_owner_id and created_by to user_id for all existing videos
UPDATE public.videos 
SET 
  workspace_owner_id = COALESCE(workspace_owner_id, user_id),
  created_by = COALESCE(created_by, user_id)
WHERE workspace_owner_id IS NULL OR created_by IS NULL;

-- Create automatic owner entry when user gets subscription
-- This function ensures every user with subscription is their own workspace owner
CREATE OR REPLACE FUNCTION public.create_workspace_owner_entry()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert workspace_members entry making user their own owner
  INSERT INTO public.workspace_members (
    workspace_owner_id,
    user_id,
    role,
    permissions,
    status
  ) VALUES (
    NEW.user_id,
    NEW.user_id,
    'owner',
    '{"can_view": true, "can_create": true, "can_edit": true, "can_delete": true}'::jsonb,
    'active'
  )
  ON CONFLICT (workspace_owner_id, user_id) 
  DO UPDATE SET status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create owner entry when subscription becomes active
DROP TRIGGER IF EXISTS trigger_create_workspace_owner ON public.subscriptions;
CREATE TRIGGER trigger_create_workspace_owner
  AFTER INSERT OR UPDATE OF status ON public.subscriptions
  FOR EACH ROW
  WHEN (NEW.status IN ('active', 'trialing'))
  EXECUTE FUNCTION public.create_workspace_owner_entry();

-- Enable RLS on workspace_members
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspace_members

-- Users can view members of workspaces they are part of
CREATE POLICY "Users can view workspace members they belong to" 
ON public.workspace_members
FOR SELECT
USING (
  auth.uid() = workspace_owner_id OR 
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_owner_id = workspace_members.workspace_owner_id 
    AND wm.user_id = auth.uid() 
    AND wm.status = 'active'
  )
);

-- Only workspace owners can insert new members (invite)
CREATE POLICY "Workspace owners can invite members" 
ON public.workspace_members
FOR INSERT
WITH CHECK (auth.uid() = workspace_owner_id);

-- Workspace owners can update their members
CREATE POLICY "Workspace owners can update members" 
ON public.workspace_members
FOR UPDATE
USING (auth.uid() = workspace_owner_id);

-- Workspace owners can delete members, or members can remove themselves
CREATE POLICY "Workspace owners can remove members or members can leave" 
ON public.workspace_members
FOR DELETE
USING (auth.uid() = workspace_owner_id OR auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to workspace_members" 
ON public.workspace_members
FOR ALL 
TO service_role 
USING (true);

-- Update RLS policies for videos to include collaboration

-- Drop existing video policies if they exist
DROP POLICY IF EXISTS "Users can view their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;

-- Users can view videos from workspaces they are members of
CREATE POLICY "Users can view workspace videos" 
ON public.videos
FOR SELECT
USING (
  auth.uid() = user_id OR
  auth.uid() = workspace_owner_id OR
  EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_owner_id = videos.workspace_owner_id 
    AND wm.user_id = auth.uid() 
    AND wm.status = 'active'
    AND (wm.permissions->>'can_view')::boolean = true
  )
);

-- Users can insert videos if they have create permission
CREATE POLICY "Users can create videos with permission" 
ON public.videos
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    auth.uid() = workspace_owner_id OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid() 
      AND wm.status = 'active'
      AND (wm.permissions->>'can_create')::boolean = true
    )
  )
);

-- Users can update videos if they have edit permission
CREATE POLICY "Users can update videos with permission" 
ON public.videos
FOR UPDATE
USING (
  auth.uid() = workspace_owner_id OR
  EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_owner_id = videos.workspace_owner_id
    AND wm.user_id = auth.uid() 
    AND wm.status = 'active'
    AND (wm.permissions->>'can_edit')::boolean = true
  )
);

-- Users can delete videos if they have delete permission
CREATE POLICY "Users can delete videos with permission" 
ON public.videos
FOR DELETE
USING (
  auth.uid() = workspace_owner_id OR
  EXISTS (
    SELECT 1 FROM public.workspace_members wm 
    WHERE wm.workspace_owner_id = videos.workspace_owner_id
    AND wm.user_id = auth.uid() 
    AND wm.status = 'active'
    AND (wm.permissions->>'can_delete')::boolean = true
  )
);

-- Comments for documentation
COMMENT ON TABLE public.workspace_members IS 'Manages workspace collaboration and team members';
COMMENT ON COLUMN public.workspace_members.workspace_owner_id IS 'The user who owns the workspace (has paid subscription)';
COMMENT ON COLUMN public.workspace_members.user_id IS 'The user who is a member of this workspace';
COMMENT ON COLUMN public.workspace_members.role IS 'Role of the member: owner, collaborator, or viewer';
COMMENT ON COLUMN public.workspace_members.permissions IS 'JSON object with permissions: can_view, can_create, can_edit, can_delete';
COMMENT ON COLUMN public.workspace_members.invitation_token IS 'Unique token for invitation links';
COMMENT ON COLUMN public.workspace_members.invitation_email IS 'Email address where invitation was sent';

COMMENT ON COLUMN public.videos.workspace_owner_id IS 'The workspace owner this video belongs to';
COMMENT ON COLUMN public.videos.created_by IS 'The user who created this video';

