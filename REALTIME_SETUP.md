# 🔄 Realtime Setup für automatische UI-Updates

## Problem
Nach dem Erstellen eines Videos wird der Nextcloud-Ordner von N8N erstellt und der Sharelink in Supabase eingetragen. **Aber:** Der User muss die Seite manuell neu laden, um den blauen Upload-Button zu sehen.

## Lösung: Supabase Realtime aktivieren

### Schritt 1: SQL Script in Supabase ausführen

1. Öffne **Supabase Dashboard** → Dein Projekt → **SQL Editor**
2. Führe das Script `enable_realtime_for_videos.sql` aus:

```sql
-- Realtime für videos Tabelle aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;

-- Replica Identity auf FULL setzen (wichtig für UPDATEs)
ALTER TABLE public.videos REPLICA IDENTITY FULL;
```

3. **Erwartete Ausgabe:**
   - ✅ Realtime aktiviert
   - ✅ FULL (alle Spalten)

### Schritt 2: Realtime in Supabase Dashboard überprüfen

1. Gehe zu **Database** → **Replication**
2. Prüfe ob die `videos` Tabelle in der Liste der Realtime-Tabellen erscheint
3. Falls nicht sichtbar: Gehe zu **Database** → **Publications** → `supabase_realtime` → Füge `videos` hinzu

### Schritt 3: Test

1. Erstelle ein neues Video im Content Planner
2. ⏳ Orangener Ladebalken erscheint
3. N8N erstellt den Ordner und trägt den Link ein (ca. 5-30 Sekunden)
4. ✅ **Automatisches Update:** Blauer Upload-Button erscheint **OHNE Reload**

## Wie es funktioniert

```
1. Video erstellt
   ↓
2. Webhook → N8N
   ↓
3. N8N erstellt Nextcloud-Ordner
   ↓
4. N8N: UPDATE videos SET storage_location = '...' WHERE id = '...'
   ↓
5. 📡 Supabase Realtime sendet Event an Browser
   ↓
6. useRealtimeVideos Hook empfängt Event
   ↓
7. React Query refetcht Daten
   ↓
8. 🎉 UI aktualisiert sich automatisch
```

## Debugging

Falls es nicht funktioniert, prüfe die Browser-Console:

**Erfolgreiche Realtime-Verbindung:**
```
[useRealtimeVideos] 📡 Setting up Realtime subscription for user: xxx
[useRealtimeVideos] 🔌 Connection status: SUBSCRIBED
```

**Wenn storage_location aktualisiert wird:**
```
[useRealtimeVideos] 📡 Realtime event received: UPDATE
[useRealtimeVideos] 🔄 storage_location wurde aktualisiert!
[useRealtimeVideos] Alt: null
[useRealtimeVideos] Neu: https://nextcloud.example.com/s/xxxxx
[useRealtimeVideos] ✅ Refetching videos now - UI will update immediately
```

## Fehlersuche

### Problem: "Table is not part of the publication"
**Lösung:** Führe das SQL-Script nochmal aus

### Problem: "Connection status: CLOSED"
**Lösung:** 
1. Prüfe ob Realtime in deinem Supabase-Plan enthalten ist (kostenlos bis zu 200 simultane Connections)
2. Prüfe ob die Tabelle wirklich in der Publication ist

### Problem: Events kommen an, aber UI aktualisiert nicht
**Lösung:** Prüfe ob React Query korrekt konfiguriert ist und die queryKey stimmt
