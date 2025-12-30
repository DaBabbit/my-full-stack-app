-- ============================================================================
-- PostgreSQL Function: User-ID nach E-Mail abfragen (RLS-sicher)
-- ============================================================================
-- Beschreibung: Ermöglicht das Abfragen einer User-ID anhand der E-Mail
--               Diese Function läuft mit Security Definer und umgeht RLS
-- Datum: 2025-01-08
-- ============================================================================

-- Function erstellen: User-ID nach E-Mail zurückgeben
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Läuft mit Owner-Rechten (umgeht RLS)
SET search_path = public
AS $$
DECLARE
  found_user_id UUID;
BEGIN
  -- Suche User mit dieser E-Mail
  SELECT id INTO found_user_id
  FROM public.users
  WHERE email = user_email
  LIMIT 1;
  
  -- Gib user_id zurück (oder NULL wenn nicht gefunden)
  RETURN found_user_id;
END;
$$;

-- Kommentar hinzufügen
COMMENT ON FUNCTION public.get_user_id_by_email(TEXT) IS 
'Gibt die User-ID für eine E-Mail-Adresse zurück. Umgeht RLS für Einladungsfunktion.';

-- Berechtigungen setzen: Alle authentifizierten User dürfen diese Function aufrufen
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO service_role;

-- ============================================================================
-- TEST: Function testen
-- ============================================================================
-- SELECT public.get_user_id_by_email('david.kosma@gmail.com');
-- Sollte eine User-ID zurückgeben wenn der User existiert, sonst NULL

-- ============================================================================
-- FERTIG! Jetzt kann user_id automatisch gesetzt werden
-- ============================================================================

