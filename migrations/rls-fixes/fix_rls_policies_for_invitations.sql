-- ============================================================================
-- Fix RLS Policies für Einladungen
-- ============================================================================
-- Beschreibung: Ermöglicht Update/Delete von Einladungen durch eingeladene User
-- Datum: 2025-01-08
-- ============================================================================

-- Policy für UPDATE: Members können ihren eigenen Status updaten (Einladung annehmen)
DROP POLICY IF EXISTS "workspace_members_update_policy" ON public.workspace_members;

CREATE POLICY "workspace_members_update_policy" 
ON public.workspace_members
FOR UPDATE
USING (
  -- Owner can update their members
  auth.uid() = workspace_owner_id 
  OR 
  -- Members can update their own invitation (accept)
  auth.uid() = user_id 
  OR
  -- User can accept pending invitation by email
  (
    status = 'pending' 
    AND invitation_email IN (
      SELECT email FROM public.users WHERE id = auth.uid()
    )
  )
);

-- Policy für DELETE: Members können ihre eigene Einladung ablehnen
DROP POLICY IF EXISTS "workspace_members_delete_policy" ON public.workspace_members;

CREATE POLICY "workspace_members_delete_policy" 
ON public.workspace_members
FOR DELETE
USING (
  -- Owner can delete members
  auth.uid() = workspace_owner_id 
  OR 
  -- Members can delete themselves (leave)
  auth.uid() = user_id
  OR
  -- User can decline pending invitation by email
  (
    status = 'pending' 
    AND invitation_email IN (
      SELECT email FROM public.users WHERE id = auth.uid()
    )
  )
);

-- ============================================================================
-- FERTIG! Jetzt können User Einladungen annehmen und ablehnen
-- ============================================================================

