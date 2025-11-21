-- Social Media Integration Schema
-- Created: 2025-11-21

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

-- Indexes für Performance
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_media_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_media_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_social_accounts_active ON social_media_accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_social_posts_video ON social_media_posts(video_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_user ON social_media_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_media_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON social_media_posts(platform);
CREATE INDEX IF NOT EXISTS idx_user_mixpost_config_user ON user_mixpost_config(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mixpost_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies für social_media_accounts
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

-- RLS Policies für social_media_posts
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

-- RLS Policies für user_mixpost_config
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

-- Trigger für updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

