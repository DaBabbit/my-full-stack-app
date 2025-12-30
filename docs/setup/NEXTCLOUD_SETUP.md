# Nextcloud Upload Integration Setup

Diese Anleitung beschreibt die Einrichtung der Nextcloud WebDAV Upload-Integration für direkte Client-zu-Server Uploads ohne Vercel-Bandwidth zu belasten.

## 🎯 Übersicht

- **Uploads erfolgen direkt**: Browser → Nextcloud (ZERO Vercel-Bandwidth!)
- **Chunked Uploads**: Große Video-Dateien werden in 10 MB Chunks aufgeteilt
- **Retry Logic**: Automatische Wiederholung bei Fehlern
- **Progress Tracking**: Echtzeit-Fortschrittsanzeige pro Datei
- **Parallel Uploads**: Mehrere Dateien gleichzeitig möglich

---

## 📋 Voraussetzungen

1. **Nextcloud Server**: Zugriff auf `https://storage.davidkosma.de`
2. **Service-Account**: Nextcloud-User für die App (z.B. `nextcloud`)
3. **App-Password**: Generiertes Passwort in Nextcloud
4. **Vercel Account**: Für Environment Variables

---

## 🔧 Setup Schritte

### 1. Nextcloud App-Password erstellen

1. Melde dich in Nextcloud an: `https://storage.davidkosma.de`
2. Gehe zu: **Einstellungen → Sicherheit**
3. Scrolle zu **"Geräte & Sitzungen"**
4. Klicke auf **"Neues App-Passwort"**
5. Name eingeben: `kosmamediaWebApp-ServiceAccount`
6. Kopiere das generierte Passwort (z.B. `bRpXB-P2n7Z-jR8db-e4fJk-NcrBR`)

### 2. Vercel Environment Variables setzen

Gehe zu: [Vercel Dashboard → Project Settings → Environment Variables](https://vercel.com/dashboard)

Füge folgende Variables hinzu (für **alle Environments: Production, Preview, Development**):

```env
# Nextcloud WebDAV Configuration
NEXTCLOUD_USERNAME=nextcloud
NEXTCLOUD_APP_PASSWORD=bRpXB-P2n7Z-jR8db-e4fJk-NcrBR
NEXTCLOUD_BASE_URL=https://storage.davidkosma.de
NEXTCLOUD_WEBDAV_PATH=/remote.php/dav/files/nextcloud
```

**Wichtig:**
- `NEXTCLOUD_USERNAME`: Dein Nextcloud Service-Account Username
- `NEXTCLOUD_APP_PASSWORD`: Das generierte App-Passwort (NICHT dein Login-Passwort!)
- `NEXTCLOUD_BASE_URL`: Die URL zu deinem Nextcloud Server
- `NEXTCLOUD_WEBDAV_PATH`: WebDAV-Pfad zum Dateisystem des Users

### 3. Lokale Entwicklung (.env.local)

Für lokale Entwicklung erstelle eine `.env.local` Datei im Projekt-Root:

```bash
# .env.local (NICHT committen!)
NEXTCLOUD_USERNAME=nextcloud
NEXTCLOUD_APP_PASSWORD=bRpXB-P2n7Z-jR8db-e4fJk-NcrBR
NEXTCLOUD_BASE_URL=https://storage.davidkosma.de
NEXTCLOUD_WEBDAV_PATH=/remote.php/dav/files/nextcloud
```

**Achtung:** Die `.env.local` Datei ist bereits in `.gitignore` und wird NICHT ins Repository committed!

### 4. Supabase Migration ausführen

Führe die SQL-Migration in Supabase aus:

```sql
-- Datei: add_nextcloud_path_to_videos.sql
ALTER TABLE public.videos
ADD COLUMN nextcloud_path TEXT;

CREATE INDEX IF NOT EXISTS idx_videos_nextcloud_path 
ON public.videos(nextcloud_path);

COMMENT ON COLUMN public.videos.nextcloud_path IS 
'WebDAV path for direct file uploads (e.g. /KosmahdmAccountTest/01_Status_Idee/n8ntestpublia)';
```

1. Öffne Supabase Dashboard
2. Gehe zu: **SQL Editor**
3. Kopiere den Inhalt von `add_nextcloud_path_to_videos.sql`
4. Führe die Query aus

### 5. N8N Workflow anpassen

Wenn N8N einen neuen Video-Ordner erstellt, muss es **zwei** Felder in Supabase setzen:

#### Beispiel N8N Node (Supabase Insert/Update):

```javascript
{
  // ... andere Felder
  storage_location: "https://storage.davidkosma.de/apps/files/?dir=/KosmahdmAccountTest/01_Status_Idee/n8ntestpublia",
  nextcloud_path: "/KosmahdmAccountTest/01_Status_Idee/n8ntestpublia"
}
```

**Format von `nextcloud_path`:**
- ✅ `/KosmahdmAccountTest/01_Status_Idee/video-name/`
- ✅ Muss mit `/` beginnen
- ✅ OHNE `data/kosmamedia/` Prefix
- ✅ Entspricht dem WebDAV-Pfad relativ zum User-Root

---

## 🧪 Testing

### Lokaler Test:

```bash
# Development Server starten
npm run dev

# In Browser öffnen
http://localhost:3000

# Test-Schritte:
1. Video mit nextcloud_path in Supabase anlegen (oder via N8N)
2. Upload-Button (blaues Upload-Icon) klicken
3. Modal öffnet sich mit Drag & Drop Zone
4. Datei hochladen und Progress beobachten
5. In Nextcloud prüfen ob Datei angekommen ist
```

### Production Test:

1. Deploy to Vercel
2. Prüfe Environment Variables sind gesetzt
3. Teste Upload-Funktion
4. Verifiziere in Nextcloud

---

## 🔒 Sicherheit

### ✅ Secure by Design

- **App-Password statt Haupt-Passwort**: Kann jederzeit widerrufen werden
- **Server-side Credentials**: App-Password wird NIE an Frontend geschickt
- **API Route Auth**: Nur authentifizierte User bekommen Credentials
- **Permission Checks**: User muss Video-Owner oder Collaborator sein
- **HTTPS Only**: Alle Transfers verschlüsselt

### ⚠️ Wichtige Hinweise

1. **Niemals App-Password ins Frontend**
2. **Niemals .env.local committen**
3. **Regelmäßig App-Passwords rotieren**
4. **Bei Leak sofort in Nextcloud widerrufen**

---

## 🚀 Wie es funktioniert

### Upload-Flow:

```
1. User klickt Upload-Button
   ↓
2. Frontend ruft /api/nextcloud/credentials auf
   ↓
3. Backend prüft:
   - User authentifiziert?
   - User hat Zugriff auf Video?
   ↓
4. Backend gibt zurück:
   - webdavUrl: https://storage.davidkosma.de/remote.php/dav/files/nextcloud/path/to/folder
   - username: nextcloud
   - password: bRpXB-P2n7Z-jR8db-e4fJk-NcrBR
   ↓
5. Frontend uploaded direkt zu Nextcloud:
   - Via XMLHttpRequest PUT
   - Chunked für große Dateien
   - Progress Tracking
   - Retry bei Fehler
   ↓
6. Dateien landen in Nextcloud
   ✅ ZERO Vercel-Bandwidth!
```

### Architektur-Diagramm:

```
┌─────────┐                    ┌──────────────┐
│ Browser │ ──────────────────▶│   Vercel     │
└─────────┘  1. Request        │   (API)      │
     │        Credentials        └──────────────┘
     │                                  │
     │                                  │ 2. Validate User
     │                                  │    Return Credentials
     │                                  ▼
     │                           ┌──────────────┐
     │                           │   Supabase   │
     │                           └──────────────┘
     │
     │ 3. Direct Upload
     │    (WebDAV PUT)
     ▼
┌─────────────┐
│  Nextcloud  │
│   Server    │
└─────────────┘
```

---

## 📊 Bandwidth-Vergleich

### ❌ Ohne direkte Integration (via Vercel):

```
Upload 1 GB Video:
Browser → Vercel (1 GB Upload)
Vercel → Nextcloud (1 GB Upload)
= 2 GB Vercel Bandwidth = ~$8 Kosten
```

### ✅ Mit direkter Integration (WebDAV):

```
Upload 1 GB Video:
Browser → Nextcloud (1 GB Upload)
= 0 GB Vercel Bandwidth = $0 Kosten
```

**Ersparnis bei 100 GB/Monat: ~$400!** 💰

---

## 🐛 Troubleshooting

### Problem: "Server-Konfiguration unvollständig"

**Lösung:**
- Prüfe ob alle Environment Variables in Vercel gesetzt sind
- Re-deploy nach Änderung der Variables

### Problem: "Nicht authentifiziert"

**Lösung:**
- User muss eingeloggt sein
- Prüfe Supabase Session

### Problem: "Keine Berechtigung für dieses Video"

**Lösung:**
- User muss Video-Owner sein ODER
- User muss Workspace-Member mit `can_edit` Berechtigung sein

### Problem: "Upload failed with status 401"

**Lösung:**
- Nextcloud App-Password ist falsch oder abgelaufen
- Erstelle neues App-Password in Nextcloud
- Update Environment Variable in Vercel

### Problem: "Chunk upload failed"

**Lösung:**
- Netzwerk-Problem - Retry Logic greift automatisch
- Falls persistent: Nextcloud Server-Logs prüfen

### Problem: "CORS Error"

**Lösung:**
- Nextcloud muss CORS für deine Domain erlauben
- In Nextcloud config.php:
  ```php
  'cors.allowed-domains' => [
    'your-app.vercel.app',
    'localhost:3000'
  ],
  ```

---

## 📚 Weitere Informationen

- [Nextcloud WebDAV Dokumentation](https://docs.nextcloud.com/server/latest/user_manual/en/files/access_webdav.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [XMLHttpRequest Upload](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#monitoring_progress)

---

## ✅ Checkliste Setup

- [ ] Nextcloud App-Password erstellt
- [ ] Environment Variables in Vercel gesetzt
- [ ] .env.local für lokale Entwicklung erstellt
- [ ] Supabase Migration ausgeführt
- [ ] N8N Workflow angepasst (nextcloud_path speichern)
- [ ] Lokaler Test erfolgreich
- [ ] Production Test erfolgreich
- [ ] Team informiert

---

## 🎉 Fertig!

Die Nextcloud Upload-Integration ist nun vollständig eingerichtet und einsatzbereit!

**Bei Fragen oder Problemen:** Dokumentation prüfen oder Support kontaktieren.

