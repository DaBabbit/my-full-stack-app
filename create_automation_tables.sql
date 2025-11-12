-- Tabelle für Automatisierungseinstellungen pro User/Workspace
CREATE TABLE IF NOT EXISTS public.automation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL für eigene Videos
  
  -- Automatische Zuständigkeit bei Status-Wechsel
  auto_assign_on_idea UUID REFERENCES auth.users(id), -- NULL = keine Auto-Zuweisung
  auto_assign_on_waiting_for_recording UUID REFERENCES auth.users(id),
  
  -- System-definierte Automatisierungen (immer aktiv)
  -- auto_assign_on_in_progress -> immer kosmamedia
  -- auto_assign_on_editing_complete -> immer kosmamedia
  -- auto_assign_on_uploaded -> immer kosmamedia
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Nur eine Einstellung pro User/Workspace-Kombination
  UNIQUE(user_id, workspace_owner_id)
);

-- RLS Policies
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

-- User kann eigene Automation-Settings sehen und bearbeiten
CREATE POLICY "Users can manage their own automation settings"
ON public.automation_settings
FOR ALL
USING (auth.uid() = user_id);

-- Workspace-Owner kann Settings für ihren Workspace sehen
CREATE POLICY "Workspace owners can view automation settings"
ON public.automation_settings
FOR SELECT
USING (
  auth.uid() = workspace_owner_id OR
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_owner_id = automation_settings.workspace_owner_id
    AND wm.user_id = auth.uid()
    AND wm.status = 'active'
  )
);

-- Index für Performance
CREATE INDEX idx_automation_settings_user_workspace 
ON public.automation_settings(user_id, workspace_owner_id);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_automation_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER automation_settings_updated_at
BEFORE UPDATE ON public.automation_settings
FOR EACH ROW
EXECUTE FUNCTION update_automation_settings_updated_at();

-- Tabelle für Benachrichtigungen bei Zuständigkeitswechsel
CREATE TABLE IF NOT EXISTS public.responsibility_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  video_title TEXT NOT NULL,
  previous_responsible_person UUID REFERENCES auth.users(id),
  new_responsible_person UUID REFERENCES auth.users(id),
  status TEXT NOT NULL, -- Der neue Status des Videos
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.responsibility_notifications ENABLE ROW LEVEL SECURITY;

-- User kann nur eigene Benachrichtigungen sehen
CREATE POLICY "Users can view their own responsibility notifications"
ON public.responsibility_notifications
FOR SELECT
USING (auth.uid() = recipient_user_id);

-- User kann eigene Benachrichtigungen als gelesen markieren
CREATE POLICY "Users can update their own responsibility notifications"
ON public.responsibility_notifications
FOR UPDATE
USING (auth.uid() = recipient_user_id);

-- System kann Benachrichtigungen erstellen (via Service Role)
CREATE POLICY "Service role can insert responsibility notifications"
ON public.responsibility_notifications
FOR INSERT
WITH CHECK (true);

-- Index für Performance
CREATE INDEX idx_responsibility_notifications_recipient 
ON public.responsibility_notifications(recipient_user_id, is_read, created_at DESC);

CREATE INDEX idx_responsibility_notifications_video 
ON public.responsibility_notifications(video_id);

-- Kommentare für Dokumentation
COMMENT ON TABLE public.automation_settings IS 'Speichert Automatisierungseinstellungen pro User/Workspace';
COMMENT ON TABLE public.responsibility_notifications IS 'Benachrichtigungen für Zuständigkeitswechsel bei Videos';

