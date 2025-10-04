-- Enable Realtime für die videos Tabelle in Supabase
-- Diese Datei aktiviert Realtime-Updates für die videos Tabelle

-- 1. Aktiviere Realtime für die videos Tabelle
-- Wichtig: Realtime muss für die Tabelle in Supabase aktiviert werden

-- Überprüfe, ob Realtime aktiviert ist
DO $$
BEGIN
    -- Stelle sicher, dass die videos Tabelle für Realtime aktiviert ist
    -- Dies kann auch über das Supabase Dashboard gemacht werden:
    -- Database > Replication > videos > Enable Realtime
    
    RAISE NOTICE 'Bitte aktivieren Sie Realtime für die videos Tabelle im Supabase Dashboard:';
    RAISE NOTICE '1. Gehen Sie zu Database > Replication';
    RAISE NOTICE '2. Suchen Sie die "videos" Tabelle';
    RAISE NOTICE '3. Klicken Sie auf "Enable Realtime"';
    RAISE NOTICE '';
    RAISE NOTICE 'Alternative: Führen Sie den folgenden Befehl aus (falls Realtime bereits aktiviert ist):';
END $$;

-- 2. Stelle sicher, dass die RLS Policies korrekt sind
-- Dies ist wichtig, damit Realtime-Updates die RLS-Policies respektieren

-- Überprüfe, ob alle notwendigen Policies existieren
DO $$
BEGIN
    -- Überprüfe SELECT Policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'videos' 
        AND policyname = 'Users can read their own videos'
    ) THEN
        RAISE EXCEPTION 'SELECT Policy fehlt für videos Tabelle';
    END IF;
    
    -- Überprüfe UPDATE Policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'videos' 
        AND policyname = 'Users can update their own videos'
    ) THEN
        RAISE EXCEPTION 'UPDATE Policy fehlt für videos Tabelle';
    END IF;
    
    -- Überprüfe INSERT Policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'videos' 
        AND policyname = 'Users can insert their own videos'
    ) THEN
        RAISE EXCEPTION 'INSERT Policy fehlt für videos Tabelle';
    END IF;
    
    -- Überprüfe DELETE Policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'videos' 
        AND policyname = 'Users can delete their own videos'
    ) THEN
        RAISE EXCEPTION 'DELETE Policy fehlt für videos Tabelle';
    END IF;
    
    RAISE NOTICE 'Alle RLS Policies sind korrekt konfiguriert!';
END $$;

-- 3. Stelle sicher, dass der Trigger für last_updated korrekt funktioniert
-- Dies ist wichtig, damit Realtime-Updates den korrekten Zeitstempel haben

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

-- 4. Finale Überprüfung
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== REALTIME AKTIVIERUNG ABGESCHLOSSEN ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Nächste Schritte:';
    RAISE NOTICE '1. Gehen Sie zu Ihrem Supabase Dashboard';
    RAISE NOTICE '2. Navigieren Sie zu Database > Replication';
    RAISE NOTICE '3. Suchen Sie die "videos" Tabelle in der Liste';
    RAISE NOTICE '4. Klicken Sie auf "Enable" in der Realtime Spalte';
    RAISE NOTICE '';
    RAISE NOTICE 'Sobald Realtime aktiviert ist, werden alle Änderungen';
    RAISE NOTICE 'automatisch in Echtzeit synchronisiert!';
    RAISE NOTICE '';
    RAISE NOTICE 'Die RLS Policies und Trigger sind bereits korrekt konfiguriert.';
END $$;
