# Social Media Integration Setup Guide

## Übersicht

Dieses Projekt integriert Mixpost für Social Media Management, um Videos automatisch auf YouTube, Instagram, TikTok, Facebook, LinkedIn und X (Twitter) zu veröffentlichen.

## Voraussetzungen

1. **Mixpost Pro License** (bereits vorhanden)
2. **n8n** (self-hosted oder cloud)
3. **Supabase** (für Datenbank)
4. **Nextcloud** (für Video-Speicherung)

## Setup-Schritte

### 1. Supabase Schema Migration

Führe die SQL-Migration aus um die benötigten Tabellen zu erstellen:

```bash
# In Supabase SQL Editor ausführen
```

Datei: `supabase_social_media_schema.sql`

Dies erstellt folgende Tabellen:
- `social_media_accounts` - Verbundene Social Media Accounts
- `social_media_posts` - Veröffentlichte/geplante Posts
- `user_mixpost_config` - Mixpost-Konfiguration pro User

### 2. Environment Variables

Füge folgende Variablen zu `.env.local` hinzu:

```bash
# Mixpost Configuration
# Docker Container: root-mixpost-1 (Port 8082)
MIXPOST_URL=http://188.245.34.21:8082
# Production: https://mixpost.davidkosma.de

MIXPOST_API_TOKEN=your_mixpost_admin_api_token

# App URL (für OAuth Callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Production: https://your-domain.com

# n8n Webhook URL
# Docker Container: n8n (Port 5678)
N8N_WEBHOOK_URL=http://188.245.34.21:5678/webhook/video-published
# Production: https://n8n.davidkosma.de/webhook/video-published
```

**Wichtig:** 
- Mixpost läuft auf Port **8082** (nicht 9000)
- n8n läuft auf Port **5678** (direkt exposed, kein Apache Proxy)
- Beide Container sind auf Server **188.245.34.21**

### 3. Mixpost Installation

#### Docker Installation (empfohlen):

```bash
# Mixpost mit Docker Compose
git clone https://github.com/inovector/mixpost-pro
cd mixpost-pro
cp .env.example .env

# .env anpassen:
# - APP_URL
# - DATABASE_URL
# - REDIS_URL
# - etc.

docker-compose up -d
```

#### Nach Installation:

1. Öffne Mixpost UI: `http://188.245.34.21:8082`
   - Container: `root-mixpost-1`
   - Internal Port: 80
   - External Port: 8082
   - .env Location: `/var/www/html/.env` (im Container)
   
2. Erstelle Admin-Account

3. Gehe zu Settings → API

4. Erstelle neuen API Token

5. Kopiere Token zu `.env.local` als `MIXPOST_API_TOKEN`

**Mixpost Container .env wichtige Werte:**
```bash
APP_URL=https://mixpost.davidkosma.de
REVERB_HOST=mixpost.davidkosma.de
REVERB_SCHEME=http
REVERB_PORT=8082
```

Zugriff auf Mixpost Container:
```bash
docker exec -it root-mixpost-1 bash
cat /var/www/html/.env
```

### 4. n8n Workflow Setup

#### 4.1 Mixpost Community Node installieren

```bash
# In n8n
Settings → Community Nodes → Install
Suche: "n8n-nodes-mixpost"
```

#### 4.2 Workflow importieren

1. Öffne n8n UI
2. Workflows → Import from File
3. Importiere `n8n-mixpost-workflow.json`
4. Aktiviere Workflow

#### 4.3 Credentials einrichten

**Mixpost API:**
- URL: `http://188.245.34.21:8082` (oder `https://mixpost.davidkosma.de`)
- Token: `your_mixpost_api_token` (aus Mixpost UI generiert)

**App API (für Webhooks):**
- Type: HTTP Header Auth
- Header: `Authorization`
- Value: `Bearer your_internal_api_token`

**n8n Container Info:**
- Container: `n8n`
- Port: 5678 (direkt exposed)
- Kein Apache Proxy (direkte Port-Freigabe)
- .env im Container: `docker exec -it n8n env`

### 5. Social Media Platform Setup

Für jede Plattform musst du OAuth-Apps erstellen:

#### YouTube
1. Google Cloud Console: https://console.cloud.google.com
2. Erstelle neues Projekt
3. APIs & Services → YouTube Data API v3 aktivieren
4. Credentials → OAuth 2.0 Client erstellen
5. Redirect URI: `http://188.245.34.21:8082/callback/youtube`
   - Production: `https://mixpost.davidkosma.de/callback/youtube`

#### Instagram
1. Facebook Developer: https://developers.facebook.com
2. Erstelle App
3. Instagram Basic Display API hinzufügen
4. OAuth Redirect URI eintragen

#### TikTok
1. TikTok Developer: https://developers.tiktok.com
2. Registriere App
3. Video API Zugriff beantragen

#### Facebook
1. Facebook Developer Console
2. Erstelle App
3. Facebook Login hinzufügen
4. Permissions: pages_manage_posts, pages_read_engagement

#### LinkedIn
1. LinkedIn Developer: https://www.linkedin.com/developers
2. Erstelle App
3. OAuth 2.0 Credentials
4. Permissions: w_member_social, r_basicprofile

#### X (Twitter)
1. Twitter Developer Portal: https://developer.twitter.com
2. Erstelle App
3. OAuth 2.0 Setup
4. Permissions: tweet.read, tweet.write

**Alle Credentials in Mixpost hinterlegen:**
- Mixpost UI → Settings → Providers
- Für jede Platform Client ID & Secret eintragen

## Verwendung

### 1. Social Media Accounts verbinden

```
User → Profile → Social Media Accounts
→ Klick auf "Verbinden" für gewünschte Platform
→ OAuth Flow durchlaufen
→ Account wird in Supabase gespeichert
```

### 2. Video veröffentlichen

**Option A: Manuell über Video Edit Modal**

```
Dashboard → Videos → Video öffnen
→ Tab "Social Media Veröffentlichung"
→ Platforms auswählen
→ "Jetzt veröffentlichen" klicken
```

**Option B: Automatisch bei Status-Änderung**

```
Video Status → "Schnitt abgeschlossen" setzen
→ n8n Workflow wird getriggert
→ Video wird automatisch auf allen verbundenen Accounts gepostet
```

### 3. Analytics anzeigen

```
Profile → Social Media Accounts → Analytics
→ Übersicht aller Posts mit Metriken
→ Filter nach Platform
→ Sync-Button für aktuelle Daten
```

## API Endpoints

### Social Media Management

- `POST /api/social-media/connect` - OAuth Flow starten
- `GET /api/social-media/callback` - OAuth Callback
- `GET /api/social-media/accounts` - Accounts abrufen
- `DELETE /api/social-media/accounts` - Account trennen

### Publishing

- `POST /api/social-media/publish` - Video veröffentlichen
- `GET /api/social-media/posts` - Alle Posts abrufen
- `POST /api/social-media/sync` - Analytics synchronisieren

### Webhooks

- `POST /api/webhooks/mixpost` - Mixpost Events empfangen

## Komponenten

### Frontend

- `/app/profile/social-media/page.tsx` - Account-Verwaltung
- `/app/profile/social-media/analytics/page.tsx` - Analytics Dashboard
- `/components/VideoSocialMediaSection.tsx` - Publishing UI für Videos

### Backend

- `/lib/mixpost-client.ts` - Mixpost API Client
- `/app/api/social-media/*` - API Routes

### n8n

- `n8n-mixpost-workflow.json` - Workflow Definition
- `n8n-workflow-setup.md` - Detaillierte Anleitung

## Troubleshooting

### OAuth-Flow schlägt fehl

**Lösung:**
1. Prüfe Mixpost Provider-Einstellungen
2. Verifiziere Redirect URIs in Platform-Consoles
3. Checke Mixpost Logs: `docker logs mixpost`

### Video-Upload fehlgeschlagen

**Lösung:**
1. Prüfe Nextcloud-URL und Zugriffsrechte
2. Verifiziere Video-Format (MP4 empfohlen)
3. Checke Mixpost Upload-Limits in Settings

### n8n Workflow startet nicht

**Lösung:**
1. Prüfe Webhook URL in Supabase
2. Verifiziere alle Credentials in n8n
3. Teste Webhook manuell mit curl
4. Checke n8n Execution Logs

### Analytics werden nicht aktualisiert

**Lösung:**
1. Platform-APIs haben Delays (24-48h)
2. Manuell Sync-Button nutzen
3. Prüfe Mixpost Analytics-Support für Platform

## Platform Limits

**Beachte die API-Limits der Plattformen:**

- **Instagram**: 25 Posts/Tag, 100 Stories/Tag
- **X (Twitter)**: 2.400 Posts/Tag
- **YouTube**: Keine strikten Limits
- **TikTok**: ~3 Videos/Tag (neue Accounts)
- **Facebook**: ~50 Posts/Tag empfohlen
- **LinkedIn**: 100 Posts/Tag

## Support

Bei Problemen:
1. Checke Logs in n8n und Mixpost
2. Verifiziere Supabase RLS Policies
3. Prüfe API-Responses in Browser DevTools
4. Konsultiere Mixpost Docs: https://docs.mixpost.app

## Nächste Schritte

- [ ] Mixpost installieren und konfigurieren
- [ ] Supabase Migration ausführen
- [ ] Environment Variables setzen
- [ ] n8n Workflow importieren
- [ ] OAuth Apps für Plattformen erstellen
- [ ] Test-Account verbinden
- [ ] Test-Video veröffentlichen
- [ ] Analytics verifizieren

