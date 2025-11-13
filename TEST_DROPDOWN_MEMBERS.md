# 🐛 Dropdown Members Problem

## Problem:
Nicht alle Personen mit Zugriff werden in Dropdowns angezeigt

## Analyse:

### Tabelle `workspace_members`:
```sql
workspace_owner_id | user_id | status | role | permissions
user_a_id         | user_b_id | active | collaborator | {can_edit: true}
user_a_id         | user_c_id | active | collaborator | {can_view: true}
```

**WICHTIG:** Der Owner (user_a) ist NICHT in der Tabelle!

### Eigener Workspace (`/dashboard/videos`):
```typescript
const workspaceOwner = user ? {
  id: user.id,  // ✅ Owner ID
  firstname: user.user_metadata?.firstname || '',
  lastname: user.user_metadata?.lastname || '',
  email: user.email || ''
} : undefined;

const { members: workspaceMembers } = useWorkspaceMembers();
// Lädt: [user_b, user_c] - OHNE user_a!
```

**Dropdown zeigt:**
- ✅ kosmamedia
- ✅ user_a (vom workspaceOwner)
- ✅ user_b, user_c (von workspaceMembers)

**→ SOLLTE KORREKT SEIN**

### Fremder Workspace (`/dashboard/workspace/[ownerId]`):
```typescript
const workspaceOwner = currentWorkspace ? {
  id: ownerId,  // ✅ Owner ID
  firstname: currentWorkspace.owner_name.split(' ')[0] || '',
  lastname: currentWorkspace.owner_name.split(' ').slice(1).join(' ') || '',
  email: currentWorkspace.owner_email
} : undefined;

// workspaceMembers wird manuell geladen
// Lädt: [user_a (als member!), user_b, user_c]
```

**ABER:** Wenn user_b in user_a's Workspace schaut:
- `workspaceMembers` enthält NUR: [user_b (self), user_c (other)]
- `workspaceMembers` enthält NICHT user_a (owner)!

**Dropdown zeigt:**
- ✅ kosmamedia
- ✅ user_a (vom workspaceOwner) ← GUT!
- ✅ user_b, user_c (von workspaceMembers)
- ❌ user_a wird DOPPELT hinzugefügt wenn er auch in workspaceMembers ist

## Das eigentliche Problem:

Ich glaube das Problem ist dass:
1. `workspaceOwner` ist korrekt gesetzt (Owner wird hinzugefügt)
2. `workspaceMembers` wird korrekt geladen

ABER vielleicht wird der Owner NICHT als Member geladen in fremden Workspaces?

Lass mich prüfen ob der Owner einen Eintrag in workspace_members hat...

## Test-Query:
```sql
SELECT * FROM workspace_members 
WHERE workspace_owner_id = '<owner_id>' 
AND user_id = '<owner_id>';
```

Wenn das LEER ist, dann hat der Owner KEINEN Self-Entry!

## Fix:
Der Owner wird bereits via `workspaceOwner` hinzugefügt - das sollte funktionieren!

Das Problem ist wahrscheinlich was ANDERES - vielleicht werden neu hinzugefügte Members nicht korrekt geladen?

