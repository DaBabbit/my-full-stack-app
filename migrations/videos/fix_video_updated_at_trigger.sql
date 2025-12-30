-- =====================================================
-- Migration: updated_at automatisch aktualisieren
-- =====================================================
-- Problem: updated_at wird nicht automatisch aktualisiert bei Video-Updates
-- Lösung: Trigger für updated_at Feld hinzufügen

-- Schritt 1: updated_at Spalte hinzufügen (falls nicht vorhanden)
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Schritt 2: Trigger-Funktion für updated_at erstellen
CREATE OR REPLACE FUNCTION update_videos_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Schritt 3: Alten Trigger löschen falls vorhanden
DROP TRIGGER IF EXISTS set_updated_at_videos ON public.videos;

-- Schritt 4: Neuen Trigger erstellen
CREATE TRIGGER set_updated_at_videos
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION update_videos_updated_at_column();

-- Schritt 5: Bestehende Videos aktualisieren (updated_at = last_updated falls NULL)
UPDATE public.videos 
SET updated_at = last_updated 
WHERE updated_at IS NULL;

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_videos_updated_at 
ON public.videos(updated_at DESC);

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE 'Migration erfolgreich: updated_at Trigger hinzugefügt und bestehende Daten aktualisiert';
END $$;

