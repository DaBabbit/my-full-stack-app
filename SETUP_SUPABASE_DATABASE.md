# 🗄️ Supabase Database Setup für Video Management System

## Schritt 1: SQL Schema ausführen

1. **Öffne dein Supabase Dashboard**: https://supabase.com/dashboard
2. **Gehe zu deinem Projekt**
3. **Klicke auf "SQL Editor" in der linken Sidebar**
4. **Erstelle eine neue Query**
5. **Kopiere und führe folgenden SQL-Code aus:**

```sql
-- Videos-Tabelle für das Video-Management System
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

-- RLS Policies für Videos (User können nur ihre eigenen Videos sehen/bearbeiten)
CREATE POLICY "Users can read their own videos" ON public.videos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" ON public.videos
  FOR DELETE USING (auth.uid() = user_id);

-- Service role hat vollen Zugriff (für Admin-Funktionen)
CREATE POLICY "Service role full access to videos" ON public.videos
  FOR ALL TO service_role USING (true);

-- Index für bessere Performance
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
```

## Schritt 2: Testen

1. **Führe das SQL aus** (klicke auf "Run" Button)
2. **Prüfe ob die Tabelle erstellt wurde**: Gehe zu "Table Editor" → solltest du "videos" sehen
3. **Teste die App**: Gehe zu deiner deployed App und versuche ein Video zu erstellen

## Schritt 3: Test-Daten (Optional)

Falls du Test-Daten erstellen möchtest:

```sql
-- Ersetze 'DEINE_USER_ID' durch deine echte User-ID aus auth.users
INSERT INTO public.videos (
  user_id,
  title,
  status,
  description
) VALUES (
  'DEINE_USER_ID',
  'Mein erstes Test-Video',
  'Idee',
  'Dies ist ein Test-Video für das neue System'
);
```

**Deine User-ID findest du unter Authentication → Users in deinem Supabase Dashboard.**

## Fehlerbehebung

**Problem**: "table videos does not exist"
**Lösung**: Führe das SQL Schema oben aus

**Problem**: "RLS policy violation"  
**Lösung**: Stelle sicher, dass du eingeloggt bist und die RLS Policies korrekt erstellt wurden

**Problem**: "permission denied"
**Lösung**: Prüfe ob die Foreign Key Constraint korrekt ist (user_id → auth.users.id)
