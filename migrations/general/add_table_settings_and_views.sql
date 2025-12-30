-- Migration: Advanced Table Features
-- Datum: 2025-10-20
-- Beschreibung: Fügt Tabellen für Spalten-Einstellungen und gespeicherte Ansichten hinzu

-- =====================================================
-- Tabelle: user_table_settings
-- Speichert Benutzer-spezifische Tabellen-Einstellungen
-- =====================================================

CREATE TABLE IF NOT EXISTS user_table_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context TEXT NOT NULL CHECK (context IN ('own_videos', 'workspace_videos')),
  column_order JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_widths JSONB NOT NULL DEFAULT '{}'::jsonb,
  hidden_columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_workspace_context UNIQUE(user_id, workspace_owner_id, context)
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_user_table_settings_user_workspace 
ON user_table_settings(user_id, workspace_owner_id);

-- RLS aktivieren
ALTER TABLE user_table_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Benutzer können ihre eigenen Settings lesen
CREATE POLICY "Users can read own table settings"
ON user_table_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Benutzer können ihre eigenen Settings erstellen
CREATE POLICY "Users can create own table settings"
ON user_table_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Benutzer können ihre eigenen Settings aktualisieren
CREATE POLICY "Users can update own table settings"
ON user_table_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Benutzer können ihre eigenen Settings löschen
CREATE POLICY "Users can delete own table settings"
ON user_table_settings
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- Tabelle: workspace_views
-- Speichert gespeicherte Ansichten (Views) für Workspaces
-- =====================================================

CREATE TABLE IF NOT EXISTS workspace_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_config JSONB,
  column_settings JSONB,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_workspace_views_owner 
ON workspace_views(workspace_owner_id);

-- RLS aktivieren
ALTER TABLE workspace_views ENABLE ROW LEVEL SECURITY;

-- Policy: Workspace-Owner und Mitglieder können Views lesen
CREATE POLICY "Workspace members can read views"
ON workspace_views
FOR SELECT
USING (
  workspace_owner_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_owner_id = workspace_views.workspace_owner_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.status = 'active'
  )
);

-- Policy: Workspace-Owner und Mitglieder mit Berechtigungen können Views erstellen
CREATE POLICY "Workspace members can create views"
ON workspace_views
FOR INSERT
WITH CHECK (
  workspace_owner_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_owner_id = workspace_views.workspace_owner_id
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.status = 'active'
  )
);

-- Policy: Creator und Workspace-Owner können Views aktualisieren
CREATE POLICY "View creators and owners can update views"
ON workspace_views
FOR UPDATE
USING (
  created_by = auth.uid()
  OR
  workspace_owner_id = auth.uid()
);

-- Policy: Creator und Workspace-Owner können Views löschen
CREATE POLICY "View creators and owners can delete views"
ON workspace_views
FOR DELETE
USING (
  created_by = auth.uid()
  OR
  workspace_owner_id = auth.uid()
);

-- =====================================================
-- Trigger: updated_at automatisch aktualisieren
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für user_table_settings
DROP TRIGGER IF EXISTS update_user_table_settings_updated_at ON user_table_settings;
CREATE TRIGGER update_user_table_settings_updated_at
BEFORE UPDATE ON user_table_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger für workspace_views
DROP TRIGGER IF EXISTS update_workspace_views_updated_at ON workspace_views;
CREATE TRIGGER update_workspace_views_updated_at
BEFORE UPDATE ON workspace_views
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Kommentare für Dokumentation
-- =====================================================

COMMENT ON TABLE user_table_settings IS 'Speichert Benutzer-spezifische Tabellen-Einstellungen (Spalten-Reihenfolge, Breite, Sichtbarkeit)';
COMMENT ON COLUMN user_table_settings.context IS 'Kontext: own_videos für eigene Videos, workspace_videos für geteilte Workspaces';
COMMENT ON COLUMN user_table_settings.column_order IS 'Array von Spalten-IDs in gewünschter Reihenfolge';
COMMENT ON COLUMN user_table_settings.column_widths IS 'JSON-Objekt mit Spalten-Breiten in Pixeln';
COMMENT ON COLUMN user_table_settings.hidden_columns IS 'Array von ausgeblendeten Spalten-IDs';

COMMENT ON TABLE workspace_views IS 'Gespeicherte Ansichten für Workspaces mit Filtern und Sortierung';
COMMENT ON COLUMN workspace_views.filters IS 'JSON-Objekt mit aktiven Filtern';
COMMENT ON COLUMN workspace_views.sort_config IS 'JSON-Objekt mit Sortier-Konfiguration';
COMMENT ON COLUMN workspace_views.column_settings IS 'Optional: View-spezifische Spalten-Einstellungen';

