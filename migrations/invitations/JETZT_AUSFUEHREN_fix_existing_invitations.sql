-- ============================================================================
-- WICHTIG: Bestehende Einladungen fixen - user_id nachträglich setzen
-- ============================================================================
-- Beschreibung: Verknüpft bestehende Einladungen mit registrierten Usern
-- Datum: 2025-01-08
-- ============================================================================

-- Setze user_id für alle pending Einladungen, wo der User bereits registriert ist
UPDATE public.workspace_members wm
SET user_id = u.id,
    updated_at = NOW()
FROM public.users u
WHERE wm.invitation_email = u.email
  AND wm.status = 'pending'
  AND wm.user_id IS NULL;

-- Zeige Ergebnis: Wie viele wurden gefixt?
SELECT 
  'Gefixte Einladungen:' as status,
  COUNT(*) as anzahl
FROM public.workspace_members
WHERE status = 'pending' 
  AND user_id IS NOT NULL 
  AND invitation_email IS NOT NULL;

-- Zeige Details der gefixten Einladungen
SELECT 
  id,
  workspace_owner_id,
  user_id,
  invitation_email,
  status,
  created_at,
  updated_at
FROM public.workspace_members
WHERE status = 'pending' 
  AND user_id IS NOT NULL 
  AND invitation_email IS NOT NULL
ORDER BY updated_at DESC;

-- ============================================================================
-- FERTIG! Jetzt sollten alle Einladungen mit user_id verknüpft sein
-- ============================================================================

