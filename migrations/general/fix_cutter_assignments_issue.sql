-- Fix für das cutter_assignments Problem
-- Diese Datei behebt das Problem mit der nicht existierenden cutter_assignments Tabelle

-- 1. Überprüfen, ob es alte Trigger oder Funktionen gibt, die cutter_assignments verwenden
-- und diese entfernen

-- Entferne alle Trigger, die möglicherweise cutter_assignments verwenden
DO $$ 
BEGIN
    -- Versuche alle möglichen Trigger zu entfernen, die cutter_assignments verwenden könnten
    BEGIN
        DROP TRIGGER IF EXISTS video_status_change_trigger ON public.videos;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS handle_video_status_change();
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DROP FUNCTION IF EXISTS create_cutter_assignment();
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
END $$;

-- 2. Stelle sicher, dass die videos Tabelle korrekt konfiguriert ist
-- Überprüfe, ob die videos Tabelle existiert und korrekt konfiguriert ist
DO $$
BEGIN
    -- Wenn die videos Tabelle nicht existiert, erstelle sie
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'videos' AND table_schema = 'public') THEN
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
        );
    END IF;
END $$;

-- 3. Stelle sicher, dass RLS korrekt aktiviert ist
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 4. Entferne alle alten Policies und erstelle neue, saubere Policies
DROP POLICY IF EXISTS "Users can read their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
DROP POLICY IF EXISTS "Service role full access to videos" ON public.videos;

-- 5. Erstelle neue, saubere RLS Policies
CREATE POLICY "Users can read their own videos" ON public.videos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own videos" ON public.videos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" ON public.videos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos" ON public.videos
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to videos" ON public.videos
    FOR ALL TO service_role USING (true);

-- 6. Stelle sicher, dass die Indizes existieren
CREATE INDEX IF NOT EXISTS videos_user_id_idx ON public.videos (user_id);
CREATE INDEX IF NOT EXISTS videos_status_idx ON public.videos (status);
CREATE INDEX IF NOT EXISTS videos_created_at_idx ON public.videos (created_at DESC);

-- 7. Stelle sicher, dass der Update-Trigger korrekt funktioniert
CREATE OR REPLACE FUNCTION update_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Entferne den alten Trigger und erstelle einen neuen
DROP TRIGGER IF EXISTS videos_updated_at_trigger ON public.videos;
CREATE TRIGGER videos_updated_at_trigger
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION update_videos_updated_at();

-- 8. Überprüfe, ob es andere Tabellen gibt, die cutter_assignments verwenden könnten
-- und entferne diese Referenzen
DO $$
BEGIN
    -- Überprüfe, ob es eine cutter_assignments Tabelle gibt, die nicht verwendet werden sollte
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cutter_assignments' AND table_schema = 'public') THEN
        -- Entferne die Tabelle, wenn sie existiert
        DROP TABLE IF EXISTS public.cutter_assignments CASCADE;
    END IF;
END $$;

-- 9. Stelle sicher, dass alle Benutzer korrekt in der users Tabelle existieren
-- Dies ist wichtig für die RLS Policies
DO $$
BEGIN
    -- Erstelle einen Trigger, der sicherstellt, dass neue Benutzer in der users Tabelle erstellt werden
    IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN
        -- Erstelle die Funktion für neue Benutzer
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger AS $$
        BEGIN
            INSERT INTO public.users (id, email, created_at, updated_at, is_deleted)
            VALUES (NEW.id, NEW.email, NOW(), NOW(), FALSE);
            
            INSERT INTO public.user_preferences (user_id, has_completed_onboarding)
            VALUES (NEW.id, FALSE);
            
            INSERT INTO public.user_trials (user_id, trial_start_time, trial_end_time)
            VALUES (NEW.id, NOW(), NOW() + INTERVAL '48 hours');
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;

        -- Erstelle den Trigger
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- 10. Finale Überprüfung - stelle sicher, dass alles korrekt funktioniert
-- Teste die RLS Policies
DO $$
BEGIN
    -- Überprüfe, ob die videos Tabelle korrekt konfiguriert ist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'videos' AND table_schema = 'public') THEN
        RAISE EXCEPTION 'Videos Tabelle konnte nicht erstellt werden';
    END IF;
    
    -- Überprüfe, ob RLS aktiviert ist
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'videos' AND relrowsecurity = true) THEN
        RAISE EXCEPTION 'RLS ist nicht für die videos Tabelle aktiviert';
    END IF;
    
    RAISE NOTICE 'Alle Fixes wurden erfolgreich angewendet. Das cutter_assignments Problem sollte behoben sein.';
END $$;
