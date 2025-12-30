-- =====================================================
-- Migration: Hauptspeicherort zu bestehender public.users hinzufügen
-- =====================================================
-- public.users Tabelle existiert bereits, wir fügen nur das Feld hinzu

-- Füge main_storage_location zur bestehenden public.users Tabelle hinzu
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS main_storage_location TEXT;

-- Kommentar hinzufügen
COMMENT ON COLUMN public.users.main_storage_location IS 'Hauptspeicherort des Kunden, wird von n8n Workflow befüllt';

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_users_main_storage_location 
ON public.users(main_storage_location);

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE '✅ Migration erfolgreich: main_storage_location zu public.users hinzugefügt';
END $$;

