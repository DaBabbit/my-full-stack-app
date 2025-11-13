-- Fix: Add missing owner entries to workspace_members
-- Problem: Alte Subscriptions wurden vor dem Trigger erstellt
-- Lösung: Füge für jeden User mit Subscription einen Self-Entry hinzu

-- 1. Prüfe welche User Subscriptions haben aber KEINEN Self-Entry
SELECT 
  s.user_id,
  u.email,
  u.firstname,
  u.lastname,
  s.status as subscription_status,
  CASE 
    WHEN wm.id IS NOT NULL THEN '✅ Hat Self-Entry'
    ELSE '❌ FEHLT Self-Entry'
  END as owner_entry_status
FROM subscriptions s
JOIN users u ON s.user_id = u.id
LEFT JOIN workspace_members wm ON wm.workspace_owner_id = s.user_id AND wm.user_id = s.user_id
WHERE s.status IN ('active', 'trialing')
ORDER BY owner_entry_status DESC;

-- 2. Füge fehlende Owner-Entries hinzu
INSERT INTO public.workspace_members (
  workspace_owner_id,
  user_id,
  role,
  permissions,
  status,
  invited_by,
  invited_at,
  created_at,
  updated_at
)
SELECT 
  s.user_id,  -- workspace_owner_id
  s.user_id,  -- user_id (self)
  'owner',    -- role
  '{"can_view": true, "can_create": true, "can_edit": true, "can_delete": true}'::jsonb,  -- permissions
  'active',   -- status
  s.user_id,  -- invited_by (self)
  s.created_at,  -- invited_at
  NOW(),      -- created_at
  NOW()       -- updated_at
FROM subscriptions s
WHERE s.status IN ('active', 'trialing')
  AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_owner_id = s.user_id 
    AND wm.user_id = s.user_id
  )
ON CONFLICT (workspace_owner_id, user_id) 
DO UPDATE SET 
  status = 'active',
  updated_at = NOW();

-- 3. Verification: Zeige alle Owner mit ihren Entries
SELECT 
  s.user_id,
  u.email,
  u.firstname || ' ' || u.lastname as name,
  s.status as subscription_status,
  wm.role as member_role,
  wm.status as member_status
FROM subscriptions s
JOIN users u ON s.user_id = u.id
LEFT JOIN workspace_members wm ON wm.workspace_owner_id = s.user_id AND wm.user_id = s.user_id
WHERE s.status IN ('active', 'trialing')
ORDER BY u.email;

-- 4. Zeige Zusammenfassung
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(wm.id) as with_owner_entry,
  COUNT(*) - COUNT(wm.id) as missing_owner_entry
FROM subscriptions s
LEFT JOIN workspace_members wm ON wm.workspace_owner_id = s.user_id AND wm.user_id = s.user_id
WHERE s.status IN ('active', 'trialing');

