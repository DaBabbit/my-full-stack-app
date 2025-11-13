-- Test Script: Workspace Members Debugging
-- Führe das aus um zu sehen welche Members geladen werden sollten

-- 1. Zeige ALLE workspace_members Einträge
SELECT 
  wm.id,
  wm.workspace_owner_id,
  wm.user_id,
  wm.status,
  wm.role,
  wm.permissions,
  owner.email as owner_email,
  member.email as member_email,
  member.firstname as member_firstname,
  member.lastname as member_lastname
FROM workspace_members wm
LEFT JOIN users owner ON wm.workspace_owner_id = owner.id
LEFT JOIN users member ON wm.user_id = member.id
WHERE wm.status = 'active'
ORDER BY wm.workspace_owner_id, wm.created_at;

-- 2. Zähle Members pro Owner
SELECT 
  wm.workspace_owner_id,
  owner.email as owner_email,
  COUNT(*) as active_members_count
FROM workspace_members wm
LEFT JOIN users owner ON wm.workspace_owner_id = owner.id
WHERE wm.status = 'active'
GROUP BY wm.workspace_owner_id, owner.email
ORDER BY active_members_count DESC;

-- 3. Prüfe ob Owner einen Self-Entry hat (sollte NICHT der Fall sein)
SELECT 
  'Owner with self-entry' as issue,
  wm.*
FROM workspace_members wm
WHERE wm.workspace_owner_id = wm.user_id;

-- 4. Erwartete Dropdown-Liste für jeden Workspace:
-- Format: workspace_owner_id -> [kosmamedia, owner, member1, member2, ...]
SELECT 
  wm.workspace_owner_id,
  owner.email as owner_email,
  STRING_AGG(
    COALESCE(
      member.firstname || ' ' || member.lastname,
      member.email,
      wm.invitation_email
    ), 
    ', '
  ) as members_list
FROM workspace_members wm
LEFT JOIN users owner ON wm.workspace_owner_id = owner.id
LEFT JOIN users member ON wm.user_id = member.id
WHERE wm.status = 'active'
GROUP BY wm.workspace_owner_id, owner.email;

