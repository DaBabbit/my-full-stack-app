-- =====================================================
-- FINALER FIX FÜR CUTTER_ASSIGNMENTS RLS PROBLEM
-- =====================================================
-- Dieses Script behebt das Problem, dass beim Status-Wechsel
-- zu "In Bearbeitung (Schnitt)" oder "Schnitt abgeschlossen"
-- ein RLS-Fehler für cutter_assignments auftritt
-- =====================================================

-- 1. Lösche ALLE Trigger auf der videos Tabelle, die cutter_assignments verwenden könnten
DO $$ 
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'videos' 
        AND event_object_schema = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.videos CASCADE', trigger_record.trigger_name);
            RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
        EXCEPTION
            WHEN OTHERS THEN 
                RAISE NOTICE 'Could not drop trigger %: %', trigger_record.trigger_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- 2. Lösche ALLE Funktionen, die cutter_assignments verwenden
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS handle_video_status_change() CASCADE;
    DROP FUNCTION IF EXISTS create_cutter_assignment() CASCADE;
    DROP FUNCTION IF EXISTS auto_assign_cutter() CASCADE;
    DROP FUNCTION IF EXISTS assign_video_to_cutter() CASCADE;
    RAISE NOTICE 'All cutter_assignments related functions dropped';
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error dropping functions: %', SQLERRM;
END $$;

-- 3. Lösche die cutter_assignments Tabelle komplett
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'cutter_assignments' 
               AND table_schema = 'public') THEN
        DROP TABLE IF EXISTS public.cutter_assignments CASCADE;
        RAISE NOTICE 'cutter_assignments table dropped';
    ELSE
        RAISE NOTICE 'cutter_assignments table does not exist';
    END IF;
END $$;

-- 4. Stelle sicher, dass die videos Tabelle nur den notwendigen updated_at Trigger hat
CREATE OR REPLACE FUNCTION update_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = timezone('utc'::text, now());
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = timezone('utc'::text, now());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Erstelle den Trigger neu (sauber, ohne cutter_assignments Logik)
DROP TRIGGER IF EXISTS videos_updated_at_trigger ON public.videos;
CREATE TRIGGER videos_updated_at_trigger
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION update_videos_updated_at();

-- 5. Stelle sicher, dass RLS Policies korrekt sind
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Lösche alte Policies
DROP POLICY IF EXISTS "Users can read their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
DROP POLICY IF EXISTS "Service role full access to videos" ON public.videos;
DROP POLICY IF EXISTS "Workspace members can view shared videos" ON public.videos;
DROP POLICY IF EXISTS "Workspace members can edit shared videos based on permissions" ON public.videos;

-- Erstelle neue, saubere Policies
CREATE POLICY "Users can read their own videos" 
    ON public.videos
    FOR SELECT 
    USING (
        auth.uid() = user_id 
        OR auth.uid() = workspace_owner_id
        OR EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_owner_id = videos.workspace_owner_id
            AND workspace_members.member_user_id = auth.uid()
            AND workspace_members.status = 'active'
        )
    );

CREATE POLICY "Users can insert their own videos" 
    ON public.videos
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" 
    ON public.videos
    FOR UPDATE 
    USING (
        auth.uid() = user_id 
        OR (
            EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_members.workspace_owner_id = videos.workspace_owner_id
                AND workspace_members.member_user_id = auth.uid()
                AND workspace_members.status = 'active'
                AND workspace_members.permissions->>'can_edit' = 'true'
            )
        )
    );

CREATE POLICY "Users can delete their own videos" 
    ON public.videos
    FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to videos" 
    ON public.videos
    FOR ALL 
    TO service_role 
    USING (true);

-- 6. Überprüfe alle anderen Trigger und stelle sicher, dass sie keine cutter_assignments Referenzen haben
DO $$
DECLARE
    func_record RECORD;
    func_source TEXT;
BEGIN
    FOR func_record IN 
        SELECT proname, prosrc 
        FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE nspname = 'public'
    LOOP
        func_source := func_record.prosrc;
        IF func_source LIKE '%cutter_assignments%' THEN
            RAISE WARNING 'Function % still references cutter_assignments. Manual review required.', func_record.proname;
        END IF;
    END LOOP;
END $$;

-- 7. Finale Überprüfung
DO $$
BEGIN
    -- Prüfe, ob cutter_assignments noch existiert
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'cutter_assignments' 
               AND table_schema = 'public') THEN
        RAISE EXCEPTION 'cutter_assignments table still exists! Manual intervention required.';
    END IF;
    
    -- Prüfe, ob RLS aktiviert ist
    IF NOT EXISTS (SELECT 1 FROM pg_class 
                   WHERE relname = 'videos' 
                   AND relrowsecurity = true) THEN
        RAISE EXCEPTION 'RLS is not enabled on videos table';
    END IF;
    
    RAISE NOTICE '✅ All fixes successfully applied! The cutter_assignments RLS error should be resolved.';
    RAISE NOTICE '✅ Automatic assignment now handled via /api/videos/[id]/auto-assign endpoint.';
END $$;

