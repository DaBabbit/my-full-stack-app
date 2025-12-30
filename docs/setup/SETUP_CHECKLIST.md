# 🚀 Setup Checklist - Social Media Integration

## ✅ Phase 1: Datenbank Setup (Supabase)

### Schritt 1: SQL Schema ausführen
```sql
-- In Supabase SQL Editor ausführen:
```
Datei: `supabase_social_media_schema_clean.sql`

**Status:** ⬜ Todo / ✅ Erledigt

**Prüfung:**
```sql
-- Prüfe ob Tabellen existieren:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('social_media_accounts', 'social_media_posts', 'user_mixpost_config');
```

---

## ✅ Phase 2: Environment Variables

### Schritt 2: .env.local anpassen
Datei: `.env.local` (bereits erstellt mit Mixpost Token)

**Fehlende Werte ergänzen:**
```bash
# Supabase (aus Supabase Dashboard → Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe (falls noch nicht vorhanden)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Nextcloud (falls noch nicht vorhanden)
NEXTCLOUD_URL=
NEXTCLOUD_USERNAME=
NEXTCLOUD_PASSWORD=
```

**Status:** ⬜ Todo / ✅ Erledigt

---

## ✅ Phase 3: Mixpost Setup

### Schritt 3: Mixpost OAuth Apps konfigurieren

**URL:** http://188.245.34.21:8082

#### 3.1 YouTube
- [ ] Google Cloud Console: https://console.cloud.google.com
- [ ] Projekt erstellen
- [ ] YouTube Data API v3 aktivieren
- [ ] OAuth 2.0 Client erstellen
- [ ] Redirect URI: `http://188.245.34.21:8082/callback/youtube`
- [ ] Client ID & Secret in Mixpost UI eintragen (Settings → Providers)

#### 3.2 Instagram (via Facebook)
- [ ] Facebook Developer: https://developers.facebook.com
- [ ] App erstellen
- [ ] Instagram Basic Display API hinzufügen
- [ ] Redirect URI: `http://188.245.34.21:8082/callback/instagram`
- [ ] Client ID & Secret in Mixpost UI eintragen

#### 3.3 TikTok
- [ ] TikTok Developer: https://developers.tiktok.com
- [ ] App registrieren
- [ ] Video API Zugriff beantragen
- [ ] Redirect URI: `http://188.245.34.21:8082/callback/tiktok`
- [ ] Client ID & Secret in Mixpost UI eintragen

#### 3.4 Facebook
- [ ] Facebook Developer Console
- [ ] App erstellen
- [ ] Facebook Login hinzufügen
- [ ] Permissions: `pages_manage_posts`, `pages_read_engagement`
- [ ] Redirect URI: `http://188.245.34.21:8082/callback/facebook`
- [ ] Client ID & Secret in Mixpost UI eintragen

#### 3.5 LinkedIn
- [ ] LinkedIn Developer: https://www.linkedin.com/developers
- [ ] App erstellen
- [ ] OAuth 2.0 Credentials
- [ ] Permissions: `w_member_social`, `r_basicprofile`
- [ ] Redirect URI: `http://188.245.34.21:8082/callback/linkedin`
- [ ] Client ID & Secret in Mixpost UI eintragen

#### 3.6 X (Twitter)
- [ ] Twitter Developer Portal: https://developer.twitter.com
- [ ] App erstellen
- [ ] OAuth 2.0 Setup
- [ ] Permissions: `tweet.read`, `tweet.write`
- [ ] Redirect URI: `http://188.245.34.21:8082/callback/twitter`
- [ ] Client ID & Secret in Mixpost UI eintragen

**Status:** ⬜ Todo / ✅ Erledigt

---

## ✅ Phase 4: n8n Workflow

### Schritt 4: n8n Community Node installieren

```bash
# SSH auf Server
ssh user@188.245.34.21

# In n8n Container
docker exec -it n8n bash
cd ~/.n8n/nodes
npm install n8n-nodes-mixpost
exit

# n8n neu starten
docker restart n8n
```

**Oder via n8n UI:**
- [ ] n8n öffnen: http://188.245.34.21:5678
- [ ] Settings → Community Nodes
- [ ] Suchen: "mixpost"
- [ ] Installieren: "n8n-nodes-mixpost"

**Status:** ⬜ Todo / ✅ Erledigt

---

### Schritt 5: n8n Workflow importieren

- [ ] n8n UI: http://188.245.34.21:5678
- [ ] Workflows → Import from File
- [ ] Datei auswählen: `n8n-mixpost-workflow.json`
- [ ] Workflow öffnen

**Status:** ⬜ Todo / ✅ Erledigt

---

### Schritt 6: n8n Credentials konfigurieren

#### Mixpost API Credential
- [ ] Name: `Mixpost API`
- [ ] URL: `http://188.245.34.21:8082`
- [ ] Token: `y7WjJ4xmUGbBA4t8uaEK220QUDs732gkDCTgpFjTe437809e`

#### App API Credential (für Webhook Calls)
- [ ] Name: `App API`
- [ ] Type: `HTTP Header Auth`
- [ ] Header: `Authorization`
- [ ] Value: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`

**Status:** ⬜ Todo / ✅ Erledigt

---

### Schritt 7: n8n Workflow aktivieren

- [ ] Workflow öffnen
- [ ] Alle Credentials zuweisen
- [ ] Workflow aktivieren ✅

**Status:** ⬜ Todo / ✅ Erledigt

---

## ✅ Phase 5: Testing

### Schritt 8: Ersten Social Media Account verbinden

**Lokal testen:**
```bash
# In Projekt-Verzeichnis
npm run dev
```

- [ ] Browser: http://localhost:3000/profile/social-media
- [ ] Klick auf "Verbinden" für eine Platform (z.B. YouTube)
- [ ] OAuth Flow durchlaufen
- [ ] ✅ Success-Toast sollte erscheinen
- [ ] Account sollte in Liste erscheinen

**Status:** ⬜ Todo / ✅ Erledigt

---

### Schritt 9: n8n Webhook testen

```bash
# Test-Request an n8n
curl -X POST http://188.245.34.21:5678/webhook/video-published \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "test-uuid",
    "user_id": "test-user-uuid",
    "status": "Schnitt abgeschlossen",
    "storage_location": "https://test-video-url.mp4"
  }'
```

**Prüfen:**
- [ ] n8n Execution Log zeigt erfolgreiche Ausführung
- [ ] Keine Fehler in n8n UI

**Status:** ⬜ Todo / ✅ Erledigt

---

### Schritt 10: End-to-End Test

**Video Publishing Test:**
1. [ ] Video im Dashboard erstellen
2. [ ] Status auf "Schnitt abgeschlossen" setzen
3. [ ] n8n Workflow wird automatisch getriggert
4. [ ] Video wird auf Mixpost hochgeladen
5. [ ] Post wird auf verbundenen Platforms erstellt
6. [ ] Check in Mixpost UI: Post sollte erscheinen
7. [ ] Check in `/profile/social-media/analytics`: Post sollte erscheinen

**Status:** ⬜ Todo / ✅ Erledigt

---

## 🎉 Fertig!

Wenn alle Schritte ✅ sind, ist die Social Media Integration voll funktionsfähig!

---

## 🔧 Troubleshooting

### Fehler: "Nicht autorisiert" bei Account-Verbindung
**Lösung:**
1. Prüfe ob `.env.local` korrekt ist
2. `npm run dev` neu starten
3. Browser-Cache leeren

### Fehler: n8n Workflow startet nicht
**Lösung:**
1. Workflow aktiviert? (Toggle in n8n UI)
2. Credentials korrekt?
3. n8n Logs checken: `docker logs n8n --tail 100`

### Fehler: OAuth-Redirect schlägt fehl
**Lösung:**
1. Redirect URI in Platform Console exakt prüfen
2. Muss sein: `http://188.245.34.21:8082/callback/{platform}`
3. Keine Trailing Slashes!
4. http vs https beachten

### Mixpost API nicht erreichbar
**Lösung:**
```bash
# Container läuft?
docker ps | grep mixpost

# Neu starten
docker restart root-mixpost-1

# Port-Check
curl http://188.245.34.21:8082/api/v1/accounts \
  -H "Authorization: Bearer y7WjJ4xmUGbBA4t8uaEK220QUDs732gkDCTgpFjTe437809e"
```

---

## 📞 Support

Bei Problemen siehe:
- `SOCIAL_MEDIA_SETUP.md` - Vollständige Anleitung
- `DEPLOYMENT_NOTES.md` - Server-spezifische Infos
- `QUICK_START.md` - Schnelleinstieg

