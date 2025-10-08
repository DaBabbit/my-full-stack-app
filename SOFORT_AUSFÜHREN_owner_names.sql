-- ============================================================================
-- WICHTIG: Diese SQL Migration SOFORT in Supabase ausführen!
-- ============================================================================
-- 
-- PROBLEM: Workspace-Namen werden nicht richtig angezeigt
-- LÖSUNG: Diese RPC Function erstellen für sichere Owner-Namen Abfrage
--
-- ============================================================================

-- Funktion erstellen (falls noch nicht vorhanden)
CREATE OR REPLACE FUNCTION public.get_workspace_owner_details(owner_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT,
  firstname TEXT,
  lastname TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.firstname,
    u.lastname
  FROM
    public.users u
  WHERE
    u.id = ANY(owner_ids);
END;
$$;

-- Berechtigungen setzen
GRANT EXECUTE ON FUNCTION public.get_workspace_owner_details(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_owner_details(UUID[]) TO service_role;

-- ============================================================================
-- FERTIG! Nach dem Ausführen:
-- 1. Seite neu laden
-- 2. Sidebar zeigt: "Workspace: Vorname Nachname" ✅
-- 3. Kein "User..." mehr ✅
-- ============================================================================

