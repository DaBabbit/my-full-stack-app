-- =====================================================
-- Social Media Schema Erweiterung für Mixpost Integration
-- =====================================================
-- Diese Migration erweitert die bestehende social_media_accounts Tabelle
-- um Mixpost-spezifische Felder für Multi-Tenant Account-Verwaltung

-- Erweitere social_media_accounts Tabelle
ALTER TABLE social_media_accounts
ADD COLUMN IF NOT EXISTS mixpost_account_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS mixpost_account_data JSONB;

-- Kommentar zu den neuen Spalten
COMMENT ON COLUMN social_media_accounts.mixpost_account_id IS 'Eindeutige Account-ID aus Mixpost API';
COMMENT ON COLUMN social_media_accounts.mixpost_account_data IS 'Vollständige Account-Daten von Mixpost (username, provider_id, etc.)';

-- Index für schnelle Lookups nach Mixpost Account ID
CREATE INDEX IF NOT EXISTS idx_mixpost_account_id 
ON social_media_accounts(mixpost_account_id);

-- Index für User + Platform Kombination (für Multi-Account Support)
CREATE INDEX IF NOT EXISTS idx_user_platform 
ON social_media_accounts(user_id, platform);

-- Index für aktive Accounts eines Users (häufige Query)
CREATE INDEX IF NOT EXISTS idx_user_active_accounts 
ON social_media_accounts(user_id, is_active) 
WHERE is_active = true;

-- RLS Policy für User-Zugriff (aktualisiert)
DROP POLICY IF EXISTS "Users can view own accounts" ON social_media_accounts;
CREATE POLICY "Users can view own accounts" 
ON social_media_accounts FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accounts" ON social_media_accounts;
CREATE POLICY "Users can insert own accounts" 
ON social_media_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts" ON social_media_accounts;
CREATE POLICY "Users can update own accounts" 
ON social_media_accounts FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts" ON social_media_accounts;
CREATE POLICY "Users can delete own accounts" 
ON social_media_accounts FOR DELETE 
USING (auth.uid() = user_id);

-- Funktion zum Aktualisieren des updated_at Timestamps
CREATE OR REPLACE FUNCTION update_social_media_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für updated_at
DROP TRIGGER IF EXISTS update_social_media_accounts_timestamp ON social_media_accounts;
CREATE TRIGGER update_social_media_accounts_timestamp
BEFORE UPDATE ON social_media_accounts
FOR EACH ROW
EXECUTE FUNCTION update_social_media_accounts_updated_at();

-- Verify Migration
DO $$
BEGIN
  RAISE NOTICE '✅ Schema-Erweiterung abgeschlossen';
  RAISE NOTICE '📋 Neue Spalten: mixpost_account_id, mixpost_account_data';
  RAISE NOTICE '📊 Neue Indizes: idx_mixpost_account_id, idx_user_platform, idx_user_active_accounts';
  RAISE NOTICE '🔒 RLS Policies aktualisiert für CRUD-Operationen';
END $$;

