# 🔴 WICHTIG: Supabase Realtime Setup

## Problem
Wenn ein Video erstellt wird, triggert N8N einen Webhook → Nextcloud Ordner + Sharelink → `storage_location` wird in Supabase aktualisiert.

**Aktuell:** User muss die Seite manuell neu laden um den Link zu sehen.  
**Ziel:** Automatisches UI-Update sobald der Link in Supabase eingetragen wird!

---

## Lösung: Supabase Realtime ✅

Die App nutzt bereits **Supabase Realtime** (`hooks/useRealtimeVideos.ts`), aber es muss in der Datenbank aktiviert werden!

---

## Setup-Schritte

### 1️⃣ Realtime in Supabase aktivieren

Gehe zu **Supabase Dashboard** → **SQL Editor** und führe dieses SQL aus:

```sql
-- Realtime für videos-Tabelle aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;

-- Prüfen ob aktiviert (zur Bestätigung)
SELECT schemaname, tablename, 'Realtime aktiviert' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND schemaname = 'public' 
  AND tablename = 'videos';
```

**Erwartetes Ergebnis:**
```
| schemaname | tablename | status              |
|------------|-----------|---------------------|
| public     | videos    | Realtime aktiviert  |
```

Falls **keine Zeile** zurückkommt → Realtime ist NICHT aktiviert!

---

### 2️⃣ Deployment

Die Code-Änderungen sind bereits deployed! ✅

**Was wurde verbessert:**
- `invalidateQueries` + `refetchQueries` für doppelte Absicherung
- Besseres Logging für Storage Location Updates
- Funktioniert für eigene Videos UND geteilte Workspaces

---

## Wie es funktioniert

1. **Video wird erstellt** → `storage_location` ist `NULL` → Orangenes Ladesymbol 🟠
2. **N8N Webhook** → Nextcloud Ordner erstellen → Link in Supabase eintragen
3. **Supabase Realtime** → sendet `UPDATE` Event an Client
4. **`useRealtimeVideos`** → invalidiert Cache + refetched Videos
5. **UI aktualisiert automatisch** → Zeigt Upload Button 🔵

**Kein manueller Reload mehr nötig!** ⚡

---

## Debugging

Öffne die **Browser Console** und schaue nach diesen Logs:

### Beim Laden der Seite:
```
[useRealtimeVideos] 📡 Setting up Realtime subscription for user: abc123...
[useRealtimeVideos] 🔌 Connection status: SUBSCRIBED
```

### Wenn N8N den Link einträgt:
```
[useRealtimeVideos] 📡 Realtime event received: UPDATE
[useRealtimeVideos] 🎯 Storage Location hinzugefügt: https://nextcloud.com/...
[useRealtimeVideos] ✅ Cache invalidated + Refetching videos now - UI will update immediately
```

### Falls **keine Events ankommen:**
1. Prüfe ob Realtime aktiviert ist (SQL von oben)
2. Prüfe Supabase Dashboard → **Database → Replication** → `videos` sollte aktiviert sein
3. Prüfe Browser Console auf Connection-Fehler

---

## Fallback: Falls Realtime nicht funktioniert

Falls Realtime aus irgendeinem Grund nicht funktioniert, kann ein **Polling-Mechanismus** als Fallback implementiert werden:

```typescript
// In useRealtimeVideos.ts hinzufügen:
useEffect(() => {
  if (!userId) return;
  
  // Polling als Fallback (alle 10 Sekunden)
  const interval = setInterval(() => {
    queryClient.refetchQueries({ 
      queryKey: ['videos', 'own', userId] 
    });
  }, 10000); // 10 Sekunden
  
  return () => clearInterval(interval);
}, [userId, queryClient]);
```

Aber das ist **NICHT nötig** wenn Realtime korrekt funktioniert! Realtime ist die bessere Lösung. ✅

---

## Support

Falls Probleme auftreten:
1. Prüfe die SQL-Abfrage oben
2. Prüfe Browser Console Logs
3. Teste: Manuell einen `storage_location` in Supabase eintragen → UI sollte sich sofort aktualisieren

