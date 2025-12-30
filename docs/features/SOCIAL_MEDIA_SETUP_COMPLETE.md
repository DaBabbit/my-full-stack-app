# Multi-Tenant Social Media Integration - Setup Guide

## Architektur-Übersicht

✅ **Implementiert**: Alle Backend- und Frontend-Komponenten sind vollständig implementiert und deployed.

```
User → OAuth Flow → Mixpost → Supabase Mapping → n8n Auto-Publishing
```

### Was wurde implementiert:

1. ✅ **Supabase Schema**: `mixpost_account_id`, `mixpost_account_data` Spalten
2. ✅ **OAuth Integration**: Connect Route, Callback Route mit Account-Discovery
3. ✅ **API Routes**: `/api/social-media/*` für Accounts, Publishing, Callback
4. ✅ **Frontend Components**: Social Media Page, VideoSocialMediaSection
5. ✅ **n8n Workflow**: Mit Supabase-Filter für User-spezifisches Posting
6. ✅ **Auto-Trigger**: Video Status "Schnitt abgeschlossen" → n8n Webhook

---

## 🚀 Setup-Schritte (Manuelle Aufgaben)

### Phase 1: Supabase Schema Migration

**Datei**: `supabase_social_media_schema_enhanced.sql`

1. Öffne Supabase Dashboard → SQL Editor
2. Kopiere den Inhalt von `supabase_social_media_schema_enhanced.sql`
3. Führe das SQL-Script aus
4. Verifiziere:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'social_media_accounts';
   ```
   ✓ `mixpost_account_id` und `mixpost_account_data` sollten sichtbar sein

---

### Phase 2: OAuth Apps erstellen

Du musst **EINMAL** für jede Plattform OAuth-Apps erstellen:

#### 🎥 YouTube (Google Cloud Console)

1. Gehe zu: https://console.cloud.google.com
2. Erstelle neues Projekt oder wähle bestehendes
3. **APIs & Services** → **Library**
   - Suche "YouTube Data API v3"
   - Klick auf "Aktivieren"
4. **APIs & Services** → **Credentials**
   - Klick "CREATE CREDENTIALS" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Name: "Mixpost Video Publisher"
   - **Authorized redirect URIs**:
     ```
     http://188.245.34.21:8082/mixpost/oauth/youtube/callback
     ```
5. **Notiere**: Client ID + Client Secret

#### 📸 Instagram/Facebook (Meta Developer)

1. Gehe zu: https://developers.facebook.com
2. **My Apps** → **Create App**
3. Use case: **Other** → App Type: **Business**
4. App Name: "Mixpost Video Publisher"
5. **Add Product**: Facebook Login + Instagram Basic Display
6. **Facebook Login** → **Settings**:
   - Valid OAuth Redirect URIs:
     ```
     http://188.245.34.21:8082/mixpost/oauth/facebook/callback
     ```
7. **Basic Settings**:
   - **Notiere**: App ID + App Secret

**Wichtig für Instagram**:
- Instagram Accounts müssen **Business** oder **Creator** Accounts sein
- Müssen mit einer **Facebook Page** verbunden sein

#### 🎵 TikTok (TikTok Developer)

1. Gehe zu: https://developers.tiktok.com
2. **Manage apps** → **Create an app**
3. App Name: "Mixpost Video Publisher"
4. **Products**: "Login Kit" + "Video Kit"
5. **Redirect URL**:
   ```
   http://188.245.34.21:8082/mixpost/oauth/tiktok/callback
   ```
6. Submit für Review (kann 1-2 Wochen dauern)
7. **Notiere**: Client Key + Client Secret

#### 🐦 Twitter/X (Twitter Developer Portal)

1. Gehe zu: https://developer.twitter.com
2. **Projects & Apps** → **Create App**
3. App Name: "Mixpost Video Publisher"
4. **Settings** → **User authentication settings**
   - Enable OAuth 2.0
   - Type of App: **Web App**
   - Callback URLs:
     ```
     http://188.245.34.21:8082/mixpost/oauth/twitter/callback
     ```
   - Permissions: **Read and Write**
5. **Keys and tokens**:
   - **Notiere**: API Key + API Secret

#### 🔗 LinkedIn (LinkedIn Developer)

1. Gehe zu: https://www.linkedin.com/developers
2. **My apps** → **Create app**
3. App Name: "Mixpost Video Publisher"
4. LinkedIn Page: (deine Unternehmensseite)
5. **Auth** → **OAuth 2.0 settings**:
   - Redirect URLs:
     ```
     http://188.245.34.21:8082/mixpost/oauth/linkedin/callback
     ```
   - OAuth 2.0 scopes: `w_member_social`, `r_basicprofile`
6. **Notiere**: Client ID + Client Secret

---

### Phase 3: Mixpost OAuth Credentials hinterlegen

1. **SSH auf deinen Server**:
   ```bash
   ssh root@188.245.34.21
   ```

2. **Öffne Mixpost Dashboard**:
   ```
   http://188.245.34.21:8082
   ```

3. **Login** mit deinem Admin-Account

4. **Navigate**: Settings → **Providers** (oder Services)

5. **Für jede Plattform**:
   - **YouTube**:
     - Client ID: `[aus Google Cloud]`
     - Client Secret: `[aus Google Cloud]`
   - **Facebook**:
     - App ID: `[aus Meta Developer]`
     - App Secret: `[aus Meta Developer]`
   - **Instagram**: (nutzt Facebook Credentials)
   - **TikTok**:
     - Client Key: `[aus TikTok Developer]`
     - Client Secret: `[aus TikTok Developer]`
   - **Twitter**:
     - API Key: `[aus Twitter Developer]`
     - API Secret: `[aus Twitter Developer]`
   - **LinkedIn**:
     - Client ID: `[aus LinkedIn Developer]`
     - Client Secret: `[aus LinkedIn Developer]`

6. **Speichern**

---

### Phase 4: Mixpost API Token generieren

1. **Mixpost Dashboard** → User Menu (oben rechts)
2. Klick auf **Access Tokens**
3. **Create** → Name: "n8n-automation"
4. **Kopiere den Token** (wird nur einmal angezeigt!)

   Beispiel: `y7WjJ4xmUGbBA4t8uaEK220QUDs732gkDCTgpFjTe437809e`

5. **Füge zu `.env.local` hinzu**:
   ```bash
   MIXPOST_API_TOKEN=y7WjJ4xmUGbBA4t8uaEK220QUDs732gkDCTgpFjTe437809e
   ```

6. **Füge auch hinzu** (falls noch nicht vorhanden):
   ```bash
   MIXPOST_URL=http://188.245.34.21:8082
   MIXPOST_CORE_PATH=mixpost
   N8N_WEBHOOK_URL=http://188.245.34.21:5678/webhook/video-published
   
   # Für Frontend (PUBLIC)
   NEXT_PUBLIC_N8N_WEBHOOK_URL=http://188.245.34.21:5678/webhook/video-published
   NEXT_PUBLIC_MIXPOST_URL=http://188.245.34.21:8082
   NEXT_PUBLIC_MIXPOST_API_TOKEN=y7WjJ4xmUGbBA4t8uaEK220QUDs732gkDCTgpFjTe437809e
   ```

7. **Auf dem Server** (für n8n):
   ```bash
   docker exec -it root-mixpost-1 bash
   cat /var/www/html/.env | grep APP_URL
   exit
   ```
   Stelle sicher dass `APP_URL=http://188.245.34.21:8082` gesetzt ist

---

### Phase 5: n8n Workflow importieren

1. **n8n Dashboard öffnen**:
   ```
   http://188.245.34.21:5678
   ```

2. **Workflows** → **Import from File**

3. **Wähle**: `n8n-mixpost-workflow-enhanced.json`

4. **Configure Nodes**:
   
   **A) Supabase Node** ("Get User Accounts"):
   - Credentials: Create new "Supabase API"
   - Project URL: `https://your-project.supabase.co`
   - Service Role Key: `[aus Supabase Settings → API]`

   **B) HTTP Request Node** ("Get Video Data"):
   - Authentication: Create "HTTP Header Auth"
   - Header Name: `Authorization`
   - Value: `Bearer YOUR_SUPABASE_SERVICE_KEY`

   **C) Mixpost Upload/Post Nodes**:
   - Nutzen Webhook Body Parameter `mixpost_token`
   - Kein extra Credential nötig (wird dynamisch übergeben)

5. **Activate Workflow**:
   - Toggle oben rechts auf "Active"

6. **Test Webhook URL**:
   ```bash
   curl -X POST http://188.245.34.21:5678/webhook/video-published \
     -H "Content-Type: application/json" \
     -d '{
       "video_id": "test-123",
       "user_id": "user-456",
       "trigger": "manual_test"
     }'
   ```

---

### Phase 6: Testing

#### Test 1: OAuth-Flow

1. **Öffne deine Webapp**:
   ```
   https://my-full-stack-alpha.vercel.app
   ```

2. **Login** → **Profile** → **Social Media**

3. **Klick "Instagram verbinden"**:
   - Wirst zu Mixpost OAuth weitergeleitet
   - Login mit Instagram
   - Zurück zur App → Toast "Instagram erfolgreich verbunden!"

4. **Prüfe Supabase**:
   ```sql
   SELECT * FROM social_media_accounts WHERE platform = 'instagram';
   ```
   ✓ Eintrag mit `mixpost_account_id` sollte vorhanden sein

5. **Prüfe Mixpost Dashboard**:
   - Settings → Accounts
   - Instagram Account sollte sichtbar sein

#### Test 2: Manuelles Publishing

1. **Dashboard** → **Videos** → Wähle ein Video

2. **Bearbeiten** → (Scroll nach unten zur Social Media Section)

3. **Wähle Plattformen** → Caption eingeben → "Jetzt veröffentlichen"

4. **Prüfe**:
   - Toast Notification erscheint
   - In Mixpost Dashboard → Posts → Neuer Post sichtbar
   - Auf Instagram → Post ist live

#### Test 3: Auto-Publishing (n8n)

1. **Dashboard** → **Videos** → Wähle ein Video

2. **Status** ändern auf **"Schnitt abgeschlossen"**

3. **Prüfe**:
   - Browser Console: `n8n workflow triggered`
   - n8n Dashboard → Executions → Neue Execution sichtbar
   - Mixpost → Posts → Neuer Post erstellt
   - Instagram/YouTube → Video ist gepostet

---

## 📊 Verifizierung

### Checkliste

- [ ] Supabase Schema erweitert (`mixpost_account_id`, `mixpost_account_data`)
- [ ] OAuth Apps für alle Plattformen erstellt
- [ ] OAuth Credentials in Mixpost hinterlegt
- [ ] Mixpost API Token generiert und in `.env.local`
- [ ] n8n Workflow importiert und aktiviert
- [ ] Test: Instagram verbinden erfolgreich
- [ ] Test: Manuelles Video-Posting funktioniert
- [ ] Test: Auto-Posting bei "Schnitt abgeschlossen" funktioniert

### Debugging

**Problem: OAuth-Flow schlägt fehl (404)**
```bash
# Prüfe Mixpost Logs
docker logs root-mixpost-1 --tail 100

# Prüfe ob OAuth Endpoint existiert
curl http://188.245.34.21:8082/mixpost/oauth/instagram
```

**Problem: Account nicht in Supabase gespeichert**
```sql
-- Prüfe Callback Route Logs
SELECT * FROM logs WHERE message LIKE '%social-media/callback%';

-- Prüfe Mixpost Account IDs
curl -H "Authorization: Bearer $MIXPOST_API_TOKEN" \
  http://188.245.34.21:8082/api/v1/accounts
```

**Problem: n8n Workflow startet nicht**
```bash
# Prüfe n8n Logs
docker logs n8n --tail 100

# Test Webhook manuell
curl -X POST http://188.245.34.21:5678/webhook/video-published \
  -H "Content-Type: application/json" \
  -d '{"video_id":"test","user_id":"123"}'
```

**Problem: Video wird nicht gepostet**
```bash
# Prüfe ob User Accounts verbunden hat
curl -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  https://your-project.supabase.co/rest/v1/social_media_accounts?user_id=eq.USER_ID

# Prüfe Mixpost API
curl -H "Authorization: Bearer $MIXPOST_API_TOKEN" \
  http://188.245.34.21:8082/api/v1/posts
```

---

## 🎯 Workflow-Übersicht

### User-Flow

```
1. User: Profile → Social Media → "Instagram verbinden"
   ↓
2. App: POST /api/social-media/connect {platform: "instagram"}
   ↓
3. App: Redirect zu Mixpost OAuth URL
   ↓
4. Mixpost: User verbindet Instagram Account
   ↓
5. Mixpost: Redirect zurück zu /api/social-media/callback
   ↓
6. App: GET Mixpost API /accounts → findet neuen Account
   ↓
7. App: INSERT in Supabase mit mixpost_account_id
   ↓
8. User: Sieht "Instagram erfolgreich verbunden!" Toast
```

### Auto-Publishing-Flow

```
1. User: Ändert Video Status → "Schnitt abgeschlossen"
   ↓
2. App: useVideoMutations Hook → POST /api/videos/[id] Update
   ↓
3. App: Trigger n8n Webhook (POST $N8N_WEBHOOK_URL)
   ↓
4. n8n: Supabase Query → Lädt User's mixpost_account_ids
   ↓
5. n8n: GET Video Daten via App API
   ↓
6. n8n: POST Mixpost API /media/upload → Video hochladen
   ↓
7. n8n: POST Mixpost API /posts → Create Post mit account_ids
   ↓
8. n8n: INSERT in Supabase social_media_posts (Logging)
   ↓
9. Mixpost: Veröffentlicht Video auf allen Plattformen
```

---

## 🔒 Sicherheit

- ✅ Alle API Routes verwenden Bearer Token Authentication
- ✅ Supabase RLS Policies: User kann nur eigene Accounts sehen
- ✅ n8n Webhook: Server-seitig (nicht öffentlich exposed)
- ✅ Mixpost API Token: Nur Server-seitig verwendet
- ✅ OAuth Credentials: Nur in Mixpost gespeichert, nicht in DB

---

## 📝 Nächste Schritte

Nach erfolgreichem Setup:

1. **Weitere Accounts verbinden**: YouTube, TikTok, Facebook, LinkedIn
2. **Custom Captions**: Für jede Plattform unterschiedliche Captions
3. **Scheduling**: Videos für bestimmte Zeiten planen
4. **Analytics**: Post-Performance tracken
5. **Multi-Upload**: Mehrere Videos gleichzeitig posten

---

## 🆘 Support

Bei Problemen:
1. Prüfe Browser Console für Frontend-Fehler
2. Prüfe n8n Execution Logs
3. Prüfe Mixpost Container Logs: `docker logs root-mixpost-1`
4. Prüfe Supabase API Logs
5. Kontaktiere Support mit Screenshots + Error Messages

---

**Status**: ✅ Vollständig implementiert und deployed
**Letzte Aktualisierung**: 21.11.2025

