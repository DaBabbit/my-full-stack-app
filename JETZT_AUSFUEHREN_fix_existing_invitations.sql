-- ============================================================================
-- WICHTIG: Bestehende Einladungen fixen - user_id nachträglich setzen
-- ============================================================================
-- Beschreibung: Verknüpft bestehende Einladungen mit registrierten Usern
-- Datum: 2025-01-08
-- ============================================================================

-- Setze user_id für alle pending Einladungen, wo der User bereits registriert ist
UPDATE public.workspace_members wm
SET user_id = u.id
FROM public.users u
WHERE wm.invitation_email = u.email
  AND wm.status = 'pending'
  AND wm.user_id IS NULL;

-- Zeige Ergebnis
SELECT 
  'Fixed invitations:' as message,
  COUNT(*) as count
FROM public.workspace_members
WHERE status = 'pending' 
  AND user_id IS NOT NULL 
  AND invitation_email IS NOT NULL;

-- ============================================================================
-- FERTIG! Jetzt sollten alle Einladungen mit user_id verknüpft sein
-- ============================================================================

