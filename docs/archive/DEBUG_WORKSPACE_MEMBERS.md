# 🐛 Problem: Neue Mitarbeiter erscheinen nicht in Dropdowns

## Problem-Analyse:

### 1. **Eigener Workspace** (`/dashboard/videos`):
```typescript
const { members: workspaceMembers } = useWorkspaceMembers();
```
- ✅ Verwendet `useWorkspaceMembers()` Hook
- ✅ Hat Realtime Subscription (Zeile 137-160 in useWorkspaceMembers.ts)  
- ✅ Hört auf Änderungen: `filter: workspace_owner_id=eq.${user.id}`
- ✅ Ruft `fetchMembers()` bei Änderungen auf
- **SOLLTE FUNKTIONIEREN** - wenn jemand die Einladung akzeptiert

### 2. **Fremder Workspace** (`/dashboard/workspace/[ownerId]`):
```typescript
const [workspaceMembers, setWorkspaceMembers] = useState<Array<...>>([]);

useEffect(() => {
  fetchWorkspaceMembers(); // Lädt Members EINMAL
}, [ownerId, supabase]);
```
- ❌ Manueller State ohne Realtime
- ❌ Lädt Members NUR beim Mount
- ❌ Keine automatische Updates
- **FUNKTIONIERT NICHT** - keine Realtime Updates

### 3. **Dropdowns filtern nach `status === 'active'`**:
```typescript
if (member.status === 'active' && member.user_id && !addedIds.has(member.user_id))
```
- ✅ Korrekt - nur aktive Members sollten auswählbar sein
- ⚠️ Members mit `status: 'pending'` werden nicht angezeigt

## Lösung:

### Option A: Realtime für fremde Workspaces hinzufügen
```typescript
// In /dashboard/workspace/[ownerId]/page.tsx
useEffect(() => {
  const channel = supabase
    .channel(`workspace_members_${ownerId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workspace_members',
        filter: `workspace_owner_id=eq.${ownerId}`
      },
      () => {
        fetchWorkspaceMembers(); // Refetch bei Änderungen
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [ownerId, supabase]);
```

### Option B: React Query Invalidation optimieren
- Sicherstellen dass `useWorkspaceMembers` die Query invalidiert bei Einladungs-Accept
- Aktuell wird nur `sharedWorkspaces` invalidiert, nicht `workspaceMembers`

## Was zu testen ist:

1. User A lädt User B ein
2. User B akzeptiert Einladung
3. Bei User A: Erscheint User B in den Dropdowns?
   - Eigener Workspace: JA (Realtime)
   - Fremder Workspace: NEIN (kein Realtime)

## Fix implementieren:

- [ ] Realtime Subscription für fremde Workspaces
- [ ] Query Invalidation für useWorkspaceMembers prüfen
- [ ] Testen mit echten Einladungen

