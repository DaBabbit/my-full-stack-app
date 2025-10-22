-- =====================================================
-- Migration: Hauptspeicherort für User hinzufügen
-- =====================================================
-- Dieses Feld wird von n8n automatisch befüllt
-- Beschreibung: Speichert den Hauptspeicherort des Kunden für Nextcloud/WebDAV

-- Füge main_storage_location zu users hinzu
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS main_storage_location TEXT;

-- Kommentar hinzufügen
COMMENT ON COLUMN auth.users.main_storage_location IS 'Hauptspeicherort des Kunden, wird von n8n Workflow befüllt';

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_users_main_storage_location 
ON auth.users(main_storage_location);

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE 'Migration erfolgreich: main_storage_location Spalte hinzugefügt';
END $$;

