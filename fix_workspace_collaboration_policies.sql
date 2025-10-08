-- Migration: Fix Workspace Collaboration RLS Policies
-- Description: Fixes infinite recursion in RLS policies
-- Date: 2025-01-08

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view workspace members they belong to" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can invite members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can remove members or members can leave" ON public.workspace_members;
DROP POLICY IF EXISTS "Service role full access to workspace_members" ON public.workspace_members;

DROP POLICY IF EXISTS "Users can view workspace videos" ON public.videos;
DROP POLICY IF EXISTS "Users can create videos with permission" ON public.videos;
DROP POLICY IF EXISTS "Users can update videos with permission" ON public.videos;
DROP POLICY IF EXISTS "Users can delete videos with permission" ON public.videos;

-- ============================================================================
-- WORKSPACE_MEMBERS POLICIES (Non-recursive)
-- ============================================================================

-- Users can view workspace_members where they are the owner or the member
CREATE POLICY "workspace_members_select_policy" 
ON public.workspace_members
FOR SELECT
USING (
  auth.uid() = workspace_owner_id OR 
  auth.uid() = user_id
);

-- Only workspace owners can insert new members
CREATE POLICY "workspace_members_insert_policy" 
ON public.workspace_members
FOR INSERT
WITH CHECK (auth.uid() = workspace_owner_id);

-- Workspace owners can update their members
CREATE POLICY "workspace_members_update_policy" 
ON public.workspace_members
FOR UPDATE
USING (auth.uid() = workspace_owner_id);

-- Workspace owners can delete members, or members can remove themselves
CREATE POLICY "workspace_members_delete_policy" 
ON public.workspace_members
FOR DELETE
USING (auth.uid() = workspace_owner_id OR auth.uid() = user_id);

-- ============================================================================
-- VIDEOS POLICIES (Simplified, no recursion)
-- ============================================================================

-- Users can view videos where:
-- 1. They are the original creator (user_id)
-- 2. They are the workspace owner (workspace_owner_id)
-- 3. They are a member with view permission (checked via workspace_members)
CREATE POLICY "videos_select_policy" 
ON public.videos
FOR SELECT
USING (
  -- Original video owner
  auth.uid() = user_id 
  OR 
  -- Workspace owner (owns all videos in their workspace)
  auth.uid() = workspace_owner_id 
  OR
  -- Member with view permission (non-recursive check)
  EXISTS (
    SELECT 1 
    FROM public.workspace_members wm 
    WHERE wm.workspace_owner_id = videos.workspace_owner_id 
    AND wm.user_id = auth.uid() 
    AND wm.status = 'active'
    AND (wm.permissions->>'can_view')::boolean = true
  )
);

-- Users can insert videos if:
-- 1. They are inserting as themselves (user_id = auth.uid())
-- 2. They are the workspace owner OR have create permission
CREATE POLICY "videos_insert_policy" 
ON public.videos
FOR INSERT
WITH CHECK (
  -- Must be inserting as themselves
  auth.uid() = user_id 
  AND
  (
    -- Is workspace owner
    auth.uid() = workspace_owner_id 
    OR
    -- Is member with create permission
    EXISTS (
      SELECT 1 
      FROM public.workspace_members wm 
      WHERE wm.workspace_owner_id = videos.workspace_owner_id 
      AND wm.user_id = auth.uid() 
      AND wm.status = 'active'
      AND (wm.permissions->>'can_create')::boolean = true
    )
  )
);

-- Users can update videos if:
-- 1. They are the workspace owner
-- 2. They are a member with edit permission
CREATE POLICY "videos_update_policy" 
ON public.videos
FOR UPDATE
USING (
  -- Is workspace owner
  auth.uid() = workspace_owner_id 
  OR
  -- Is member with edit permission
  EXISTS (
    SELECT 1 
    FROM public.workspace_members wm 
    WHERE wm.workspace_owner_id = videos.workspace_owner_id
    AND wm.user_id = auth.uid() 
    AND wm.status = 'active'
    AND (wm.permissions->>'can_edit')::boolean = true
  )
);

-- Users can delete videos if:
-- 1. They are the workspace owner
-- 2. They are a member with delete permission
CREATE POLICY "videos_delete_policy" 
ON public.videos
FOR DELETE
USING (
  -- Is workspace owner
  auth.uid() = workspace_owner_id 
  OR
  -- Is member with delete permission
  EXISTS (
    SELECT 1 
    FROM public.workspace_members wm 
    WHERE wm.workspace_owner_id = videos.workspace_owner_id
    AND wm.user_id = auth.uid() 
    AND wm.status = 'active'
    AND (wm.permissions->>'can_delete')::boolean = true
  )
);

-- ============================================================================
-- CREATE OWNER ENTRIES FOR EXISTING USERS WITH SUBSCRIPTIONS
-- ============================================================================

-- This ensures all users with active subscriptions have their owner entry
INSERT INTO public.workspace_members (
  workspace_owner_id,
  user_id,
  role,
  permissions,
  status
)
SELECT 
  s.user_id,
  s.user_id,
  'owner',
  '{"can_view": true, "can_create": true, "can_edit": true, "can_delete": true}'::jsonb,
  'active'
FROM public.subscriptions s
WHERE s.status IN ('active', 'trialing')
ON CONFLICT (workspace_owner_id, user_id) 
DO UPDATE SET 
  status = 'active',
  role = 'owner',
  permissions = '{"can_view": true, "can_create": true, "can_edit": true, "can_delete": true}'::jsonb;

-- ============================================================================
-- ENSURE ALL VIDEOS HAVE workspace_owner_id AND created_by SET
-- ============================================================================

-- Update videos that don't have workspace_owner_id or created_by set
UPDATE public.videos 
SET 
  workspace_owner_id = COALESCE(workspace_owner_id, user_id),
  created_by = COALESCE(created_by, user_id)
WHERE workspace_owner_id IS NULL OR created_by IS NULL;

