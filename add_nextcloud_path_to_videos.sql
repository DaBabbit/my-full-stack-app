-- Migration: Nextcloud Path für WebDAV Uploads
-- Fügt nextcloud_path Spalte zur videos Tabelle hinzu

-- Neue Spalte hinzufügen
ALTER TABLE public.videos
ADD COLUMN nextcloud_path TEXT;

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_videos_nextcloud_path 
ON public.videos(nextcloud_path);

-- Kommentar für Dokumentation
COMMENT ON COLUMN public.videos.nextcloud_path IS 
'WebDAV path for direct file uploads (e.g. /KosmahdmAccountTest/01_Status_Idee/n8ntestpublia)';

-- Info ausgeben
DO $$
BEGIN
  RAISE NOTICE 'Migration erfolgreich! nextcloud_path Spalte wurde hinzugefügt.';
END $$;

