-- Social Media Integration Schema (Clean Version)
-- Prüft auf existierende Strukturen und erstellt nur fehlende

-- ========================================
-- 1. TABELLEN ERSTELLEN (IF NOT EXISTS)
-- ========================================

-- Social Media Accounts Tabelle
CREATE TABLE IF NOT EXISTS social_media_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  mixpost_account_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),
  platform_user_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, mixpost_account_id)
);

-- Social Media Posts Tabelle
CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mixpost_post_id VARCHAR(255),
  platform VARCHAR(50) NOT NULL,
  post_url TEXT,
  status VARCHAR(50) DEFAULT 'scheduled',
  caption TEXT,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mixpost Konfiguration pro User
CREATE TABLE IF NOT EXISTS user_mixpost_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  mixpost_workspace_id VARCHAR(255),
  mixpost_access_token TEXT,
  auto_publish_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. INDEXES ERSTELLEN (IF NOT EXISTS)
-- ========================================

CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_media_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_media_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_active ON social_media_accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_social_posts_video ON social_media_posts(video_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_media_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_media_posts(platform);
CREATE INDEX IF NOT EXISTS idx_user_mixpost_config_user ON user_mixpost_config(user_id);

-- ========================================
-- 3. RLS AKTIVIEREN
-- ========================================

ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mixpost_config ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. RLS POLICIES (SAFE DROP & CREATE)
-- ========================================

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- social_media_accounts policies
  DROP POLICY IF EXISTS "Users can view their own social media accounts" ON social_media_accounts;
  DROP POLICY IF EXISTS "Users can insert their own social media accounts" ON social_media_accounts;
  DROP POLICY IF EXISTS "Users can update their own social media accounts" ON social_media_accounts;
  DROP POLICY IF EXISTS "Users can delete their own social media accounts" ON social_media_accounts;
  
  -- social_media_posts policies
  DROP POLICY IF EXISTS "Users can view their own social media posts" ON social_media_posts;
  DROP POLICY IF EXISTS "Users can insert their own social media posts" ON social_media_posts;
  DROP POLICY IF EXISTS "Users can update their own social media posts" ON social_media_posts;
  DROP POLICY IF EXISTS "Users can delete their own social media posts" ON social_media_posts;
  
  -- user_mixpost_config policies
  DROP POLICY IF EXISTS "Users can view their own mixpost config" ON user_mixpost_config;
  DROP POLICY IF EXISTS "Users can insert their own mixpost config" ON user_mixpost_config;
  DROP POLICY IF EXISTS "Users can update their own mixpost config" ON user_mixpost_config;
  DROP POLICY IF EXISTS "Users can delete their own mixpost config" ON user_mixpost_config;
END $$;

-- Create policies for social_media_accounts
CREATE POLICY "Users can view their own social media accounts"
  ON social_media_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social media accounts"
  ON social_media_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social media accounts"
  ON social_media_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social media accounts"
  ON social_media_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for social_media_posts
CREATE POLICY "Users can view their own social media posts"
  ON social_media_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own social media posts"
  ON social_media_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own social media posts"
  ON social_media_posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own social media posts"
  ON social_media_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Create policies for user_mixpost_config
CREATE POLICY "Users can view their own mixpost config"
  ON user_mixpost_config FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mixpost config"
  ON user_mixpost_config FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mixpost config"
  ON user_mixpost_config FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mixpost config"
  ON user_mixpost_config FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 5. TRIGGER FUNCTIONS & TRIGGERS
-- ========================================

-- Function für updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_social_media_accounts_updated_at ON social_media_accounts;
DROP TRIGGER IF EXISTS update_social_media_posts_updated_at ON social_media_posts;
DROP TRIGGER IF EXISTS update_user_mixpost_config_updated_at ON user_mixpost_config;

-- Create triggers
CREATE TRIGGER update_social_media_accounts_updated_at
  BEFORE UPDATE ON social_media_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_media_updated_at();

CREATE TRIGGER update_social_media_posts_updated_at
  BEFORE UPDATE ON social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_media_updated_at();

CREATE TRIGGER update_user_mixpost_config_updated_at
  BEFORE UPDATE ON user_mixpost_config
  FOR EACH ROW
  EXECUTE FUNCTION update_social_media_updated_at();

-- ========================================
-- ✅ FERTIG!
-- ========================================
-- Alle Tabellen, Indexes, Policies und Trigger erstellt

