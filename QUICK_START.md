# 🚀 Quick Start - Social Media Integration

## Schnellstart in 5 Schritten

### ✅ Schritt 1: Environment Variables setzen

Erstelle `.env.local` (kopiere von `env.example`):

```bash
# Mixpost (Port 8082)
MIXPOST_URL=http://188.245.34.21:8082
MIXPOST_API_TOKEN=your_token_here

# n8n (Port 5678)
N8N_WEBHOOK_URL=http://188.245.34.21:5678/webhook/video-published

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### ✅ Schritt 2: Mixpost API Token generieren

1. Browser: `http://188.245.34.21:8082`
2. Login als Admin
3. Settings → API → "Create New Token"
4. Token kopieren → in `.env.local` als `MIXPOST_API_TOKEN`

### ✅ Schritt 3: Supabase Schema erstellen

```bash
# In Supabase SQL Editor:
```

Inhalt von `supabase_social_media_schema.sql` ausführen.

### ✅ Schritt 4: n8n Workflow importieren

1. Browser: `http://188.245.34.21:5678`
2. Workflows → Import from File
3. `n8n-mixpost-workflow.json` importieren
4. Credentials einrichten:
   - Mixpost API: `http://188.245.34.21:8082` + Token
   - App API: Bearer Token für Webhooks
5. Workflow aktivieren ✅

### ✅ Schritt 5: Erste Platform verbinden

1. App starten: `npm run dev`
2. Browser: `http://localhost:3000/profile/social-media`
3. "Verbinden" klicken für gewünschte Platform (z.B. YouTube)
4. OAuth Flow durchlaufen
5. ✅ Account verbunden!

---

## 🎬 Test: Erstes Video veröffentlichen

### Option A: Manuell

1. Dashboard → Videos → Video öffnen
2. Status: "Schnitt abgeschlossen"
3. Tab: "Social Media" (wenn integriert)
4. Platforms auswählen
5. "Jetzt veröffentlichen" ✅

### Option B: Automatisch via n8n

1. Dashboard → Videos → Video öffnen
2. Status auf "Schnitt abgeschlossen" setzen
3. n8n Workflow wird automatisch getriggert ⚡
4. Video wird auf allen verbundenen Accounts gepostet 🚀

---

## 📊 Analytics anzeigen

Browser: `http://localhost:3000/profile/social-media/analytics`

- Impressionen, Engagement, Klicks
- Filter nach Platform
- Sync-Button für aktuelle Daten

---

## 🔧 Wichtige Befehle

### Container Status

```bash
# Alle Container anzeigen
docker ps

# Mixpost Logs
docker logs root-mixpost-1 --tail 50

# n8n Logs
docker logs n8n --tail 50
```

### Container neu starten

```bash
docker restart root-mixpost-1
docker restart n8n
```

### Mixpost Container Zugriff

```bash
docker exec -it root-mixpost-1 bash
cat /var/www/html/.env
```

### n8n Container Zugriff

```bash
docker exec -it n8n bash
env | grep N8N
```

---

## 🐛 Troubleshooting

### "Connection refused" bei Mixpost

```bash
# Port Check
curl http://188.245.34.21:8082

# Container läuft?
docker ps | grep mixpost

# Neu starten
docker restart root-mixpost-1
```

### OAuth schlägt fehl

1. **Redirect URI prüfen** in Platform Console
2. **Client ID/Secret** in Mixpost UI verifizieren
3. **Browser Console** checken für Errors

### Video-Upload schlägt fehl

1. **Nextcloud URL** erreichbar?
2. **Mixpost Upload Limits** checken
3. **n8n Workflow** aktiviert?
4. **n8n Execution Log** in UI checken

---

## 📚 Weiterführende Docs

- **Vollständige Anleitung**: `SOCIAL_MEDIA_SETUP.md`
- **n8n Workflow Details**: `n8n-workflow-setup.md`
- **Deployment Notes**: `DEPLOYMENT_NOTES.md`

---

## ✨ Fertig!

Du kannst jetzt:
- ✅ Social Media Accounts verbinden
- ✅ Videos automatisch veröffentlichen
- ✅ Analytics tracken
- ✅ Multi-Platform Posts erstellen

Bei Fragen → siehe Troubleshooting oder Docs!

