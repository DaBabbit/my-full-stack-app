-- Videos-Tabelle für das Video-Management System
-- Basierend auf dem ursprünglichen Notion Content Planner

CREATE TABLE public.videos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'Idee',
  publication_date date NULL,
  responsible_person text NULL,
  storage_location text NULL,
  inspiration_source text NULL,
  description text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  last_updated timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  CONSTRAINT videos_pkey PRIMARY KEY (id),
  CONSTRAINT videos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
  CONSTRAINT videos_status_check CHECK (status IN ('Idee', 'Warten auf Aufnahme', 'In Bearbeitung (Schnitt)', 'Schnitt abgeschlossen', 'Hochgeladen'))
) TABLESPACE pg_default;

-- Enable RLS (Row Level Security)
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies für Videos
-- Users können nur ihre eigenen Videos lesen
CREATE POLICY "Users can read their own videos" ON public.videos
  FOR SELECT USING (auth.uid() = user_id);

-- Users können ihre eigenen Videos erstellen
CREATE POLICY "Users can insert their own videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users können ihre eigenen Videos bearbeiten
CREATE POLICY "Users can update their own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);

-- Users können ihre eigenen Videos löschen
CREATE POLICY "Users can delete their own videos" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

-- Service role hat vollen Zugriff (für Admin-Funktionen)
CREATE POLICY "Service role full access to videos" ON public.videos
  FOR ALL TO service_role USING (true);

-- Index für bessere Performance bei User-spezifischen Abfragen
CREATE INDEX videos_user_id_idx ON public.videos (user_id);
CREATE INDEX videos_status_idx ON public.videos (status);
CREATE INDEX videos_created_at_idx ON public.videos (created_at DESC);

-- Trigger für automatisches Update von last_updated
CREATE OR REPLACE FUNCTION update_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER videos_updated_at_trigger
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION update_videos_updated_at();
