-- ============================================================================
-- WICHTIG: Diese SQL-Migration MUSS in Supabase ausgeführt werden!
-- ============================================================================
-- Beschreibung: Behebt alle Probleme mit Workspace-Einladungen
-- Datum: 2025-01-08
-- ============================================================================

-- SCHRITT 1: user_id nullable machen für pending invitations
ALTER TABLE public.workspace_members
ALTER COLUMN user_id DROP NOT NULL;

-- SCHRITT 2: Bestehende fehlerhafte Einladungen fixen
-- Setze user_id auf NULL wo es gleich workspace_owner_id ist (fehlerhafte Einladungen)
UPDATE public.workspace_members
SET user_id = NULL
WHERE status = 'pending' 
  AND user_id = workspace_owner_id
  AND invitation_email IS NOT NULL;

-- SCHRITT 3: Alte Unique Constraints löschen
DROP INDEX IF EXISTS workspace_members_unique_user_workspace;
DROP INDEX IF EXISTS workspace_members_unique_active_membership;
DROP INDEX IF EXISTS workspace_members_unique_pending_invitation_email;

-- SCHRITT 4: Neue Unique Constraints erstellen
-- Für aktive Mitgliedschaften: user_id muss unique sein pro workspace
CREATE UNIQUE INDEX workspace_members_unique_active_membership 
ON public.workspace_members (workspace_owner_id, user_id) 
WHERE status = 'active' AND user_id IS NOT NULL;

-- Für pending Einladungen: invitation_email muss unique sein pro workspace
CREATE UNIQUE INDEX workspace_members_unique_pending_invitation_email
ON public.workspace_members (workspace_owner_id, invitation_email)
WHERE status = 'pending' AND invitation_email IS NOT NULL;

-- SCHRITT 5: RLS Policies anpassen für NULL user_id
-- Policies müssen NULL user_id berücksichtigen

-- Kommentare für Dokumentation
COMMENT ON INDEX workspace_members_unique_active_membership IS 'Stellt sicher, dass nur eine aktive Mitgliedschaft pro User pro Workspace existiert';
COMMENT ON INDEX workspace_members_unique_pending_invitation_email IS 'Verhindert doppelte Einladungen zur selben E-Mail pro Workspace';

-- ============================================================================
-- FERTIG! Nach Ausführung sollten:
-- ✅ Einladungen in der Bell angezeigt werden
-- ✅ Einladungen unter "Eingehende Einladungen zur Mitarbeit" erscheinen
-- ✅ Keine Duplikat-Fehler mehr auftreten
-- ============================================================================

