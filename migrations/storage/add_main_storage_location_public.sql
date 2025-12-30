-- =====================================================
-- Migration: Hauptspeicherort für User (public.users)
-- =====================================================
-- Alternative zu auth.users - verwendet public.users Tabelle
-- Diese Tabelle haben wir vollen Zugriff

-- Prüfen ob public.users existiert, falls nicht erstellen
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  firstname TEXT,
  lastname TEXT,
  main_storage_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- main_storage_location hinzufügen (falls Tabelle schon existiert)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS main_storage_location TEXT;

-- Kommentar hinzufügen
COMMENT ON COLUMN public.users.main_storage_location IS 'Hauptspeicherort des Kunden, wird von n8n Workflow befüllt';

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_users_main_storage_location 
ON public.users(main_storage_location);

-- RLS aktivieren
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies (falls noch nicht vorhanden)
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role full access" ON public.users;
CREATE POLICY "Service role full access" 
ON public.users FOR ALL 
TO service_role 
USING (true);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_users ON public.users;
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Erfolgsmeldung
DO $$
BEGIN
  RAISE NOTICE 'Migration erfolgreich: main_storage_location in public.users hinzugefügt';
END $$;

