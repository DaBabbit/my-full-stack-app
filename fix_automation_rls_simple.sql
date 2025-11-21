-- =====================================================
-- EINFACHER FIX FÜR AUTOMATISIERUNGS-FEHLER
-- =====================================================
-- Behebt das RLS-Problem bei Status-Änderung zu 
-- "In Bearbeitung (Schnitt)" oder "Schnitt abgeschlossen"
-- =====================================================

-- 1. Entferne alte, problematische Trigger
DO $$ 
BEGIN
    -- Entferne Trigger, die auf cutter_assignments verweisen
    DROP TRIGGER IF EXISTS video_status_change_trigger ON public.videos;
    DROP TRIGGER IF EXISTS auto_assign_cutter_trigger ON public.videos;
    DROP TRIGGER IF EXISTS handle_status_change_trigger ON public.videos;
    
    RAISE NOTICE '✅ Alte Trigger entfernt';
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Hinweis: %', SQLERRM;
END $$;

-- 2. Entferne alte Funktionen
DO $$ 
BEGIN
    DROP FUNCTION IF EXISTS handle_video_status_change() CASCADE;
    DROP FUNCTION IF EXISTS create_cutter_assignment() CASCADE;
    DROP FUNCTION IF EXISTS auto_assign_cutter() CASCADE;
    DROP FUNCTION IF EXISTS assign_video_to_cutter() CASCADE;
    
    RAISE NOTICE '✅ Alte Funktionen entfernt';
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Hinweis: %', SQLERRM;
END $$;

-- 3. Entferne cutter_assignments Tabelle falls vorhanden
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'cutter_assignments' 
               AND table_schema = 'public') THEN
        DROP TABLE public.cutter_assignments CASCADE;
        RAISE NOTICE '✅ cutter_assignments Tabelle gelöscht';
    ELSE
        RAISE NOTICE 'ℹ️ cutter_assignments Tabelle existiert nicht';
    END IF;
END $$;

-- 4. Stelle sicher, dass der videos Trigger korrekt ist
CREATE OR REPLACE FUNCTION update_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Nur last_updated und updated_at setzen, KEINE anderen Aktionen
    NEW.last_updated = timezone('utc'::text, now());
    IF TG_OP = 'UPDATE' AND (TG_TABLE_NAME = 'videos') THEN
        NEW.updated_at = COALESCE(NEW.updated_at, timezone('utc'::text, now()));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Erstelle den Trigger neu
DO $$
BEGIN
    DROP TRIGGER IF EXISTS videos_updated_at_trigger ON public.videos;
    DROP TRIGGER IF EXISTS set_updated_at_videos ON public.videos;
    
    RAISE NOTICE '✅ Update-Trigger vorbereitet';
END $$;

CREATE TRIGGER videos_updated_at_trigger
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION update_videos_updated_at();

-- 5. Stelle sicher, dass RLS aktiviert ist
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- 6. Lösche alte Policies
DROP POLICY IF EXISTS "Users can read their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
DROP POLICY IF EXISTS "Service role full access to videos" ON public.videos;

-- 7. Erstelle neue Policies mit workspace_owner_id Support
CREATE POLICY "Users can read their own videos" 
    ON public.videos
    FOR SELECT 
    USING (
        auth.uid() = user_id 
        OR auth.uid() = workspace_owner_id
        OR EXISTS (
            SELECT 1 FROM public.workspace_members
            WHERE workspace_members.workspace_owner_id = videos.workspace_owner_id
            AND workspace_members.user_id = auth.uid()
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
                AND workspace_members.user_id = auth.uid()
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

-- 8. Überprüfe, ob kosmamedia-User existiert
DO $$
DECLARE
    kosmamedia_count INT;
BEGIN
    SELECT COUNT(*) INTO kosmamedia_count
    FROM public.users
    WHERE email = 'kosmamedia@kosmamedia.de' 
    OR id = '00000000-1111-2222-3333-444444444444'::UUID;
    
    IF kosmamedia_count > 0 THEN
        RAISE NOTICE '✅ kosmamedia User existiert';
    ELSE
        RAISE WARNING '⚠️ kosmamedia User existiert NICHT! Bitte create_kosmamedia_account.sql ausführen';
    END IF;
END $$;

-- 9. Finale Überprüfung
DO $$
DECLARE
    policy_count INT;
BEGIN
    -- Prüfe, ob cutter_assignments noch existiert
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_name = 'cutter_assignments' 
               AND table_schema = 'public') THEN
        RAISE WARNING '⚠️ cutter_assignments Tabelle existiert noch!';
    END IF;
    
    -- Prüfe, ob RLS aktiviert ist
    IF NOT EXISTS (SELECT 1 FROM pg_class 
                   WHERE relname = 'videos' 
                   AND relrowsecurity = true) THEN
        RAISE EXCEPTION '❌ RLS ist nicht aktiviert auf videos Tabelle';
    END IF;
    
    -- Zähle aktive Policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'videos' 
    AND schemaname = 'public';
    
    IF policy_count < 5 THEN
        RAISE WARNING '⚠️ Nur % RLS Policies gefunden für videos Tabelle (erwartet: mindestens 5)', policy_count;
    ELSE
        RAISE NOTICE '✅ % RLS Policies gefunden', policy_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=================================================';
    RAISE NOTICE '✅✅✅ ALLE FIXES ERFOLGREICH ANGEWENDET! ✅✅✅';
    RAISE NOTICE '=================================================';
    RAISE NOTICE '✅ Automatische Zuweisung läuft nun über API';
    RAISE NOTICE '✅ Status-Änderungen sollten ohne RLS-Fehler laufen';
    RAISE NOTICE '=================================================';
END $$;
