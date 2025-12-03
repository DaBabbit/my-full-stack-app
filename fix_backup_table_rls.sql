-- ============================================
-- RLS Fix für videos_backup_20251113
-- ============================================
-- Problem: Backup-Tabelle hat RLS nicht aktiviert
-- Lösung: RLS aktivieren + nur Service Role Zugriff
-- ============================================

BEGIN;

-- 1. Enable Row Level Security
ALTER TABLE public.videos_backup_20251113 ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (falls vorhanden)
DROP POLICY IF EXISTS "Backup: Service role only" ON public.videos_backup_20251113;
DROP POLICY IF EXISTS "Backup: No public access" ON public.videos_backup_20251113;

-- 3. Erstelle sehr restriktive Policy: NUR Service Role hat Zugriff
-- Alle anderen Rollen (authenticated, anon) werden blockiert
CREATE POLICY "Backup: Service role only" 
ON public.videos_backup_20251113
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 4. Explizit: Keine Zugriffe für authenticated Users
-- (Standardverhalten bei aktiviertem RLS ohne Policy = DENY)
-- Aber wir machen es explizit für Klarheit:

-- Anmerkung: Mit aktiviertem RLS und nur Service Role Policy,
-- sind automatisch alle anderen Rollen blockiert (DENY by default).
-- Das ist genau was wir wollen für eine Backup-Tabelle!

-- 5. Optional: Index für bessere Performance (falls Tabelle groß ist)
CREATE INDEX IF NOT EXISTS idx_videos_backup_id 
ON public.videos_backup_20251113(id);

-- 6. Verification Query
-- Diese Query sollte nur mit Service Role funktionieren
-- SELECT COUNT(*) FROM public.videos_backup_20251113;

COMMIT;

-- ============================================
-- ALTERNATIVE: Tabelle in privates Schema verschieben
-- ============================================
-- Falls du die Tabelle komplett verstecken willst:
-- 
-- BEGIN;
-- CREATE SCHEMA IF NOT EXISTS backups;
-- ALTER TABLE public.videos_backup_20251113 SET SCHEMA backups;
-- COMMIT;
--
-- Dann ist sie NICHT mehr über PostgREST erreichbar!

-- ============================================
-- ALTERNATIVE: Tabelle löschen (wenn nicht mehr benötigt)
-- ============================================
-- Falls die Backup-Tabelle nicht mehr benötigt wird:
-- 
-- DROP TABLE IF EXISTS public.videos_backup_20251113;
--
-- ⚠️ WICHTIG: Nur löschen, wenn Migration erfolgreich war
--              und du sicher bist, dass du die Daten nicht mehr brauchst!

-- ============================================
-- Nach dem Ausführen:
-- ============================================
-- 1. Prüfe in Supabase Dashboard → Table Editor → videos_backup_20251113
--    → RLS sollte "enabled" zeigen
-- 
-- 2. Prüfe Policies: Sollte nur "Backup: Service role only" zeigen
--
-- 3. Test: Versuche von einer normalen Query (ohne Service Role)
--    auf die Tabelle zuzugreifen → Sollte "permission denied" geben

