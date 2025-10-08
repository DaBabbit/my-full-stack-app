-- ============================================================================
-- Function: Get Workspace Owner Details (RLS-sicher)
-- ============================================================================
-- Beschreibung: Gibt Owner-Details für Workspace zurück (umgeht RLS)
-- Datum: 2025-01-08
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_workspace_owner_details(owner_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT,
  firstname TEXT,
  lastname TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.firstname,
    u.lastname
  FROM public.users u
  WHERE u.id = ANY(owner_ids);
END;
$$;

-- Kommentar hinzufügen
COMMENT ON FUNCTION public.get_workspace_owner_details(UUID[]) IS 
'Gibt Owner-Details für Workspaces zurück. Umgeht RLS für Workspace-Mitglieder.';

-- Berechtigungen setzen
GRANT EXECUTE ON FUNCTION public.get_workspace_owner_details(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_owner_details(UUID[]) TO service_role;

-- ============================================================================
-- FERTIG! Jetzt können Workspace-Mitglieder Owner-Details sehen
-- ============================================================================

