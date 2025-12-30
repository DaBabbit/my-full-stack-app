# Deployment Notes - Social Media Integration

## Server Setup (188.245.34.21)

### Docker Container Übersicht

```bash
# Mixpost
Container: root-mixpost-1
Internal Port: 80
External Port: 8082
URL: http://188.245.34.21:8082
Production: https://mixpost.davidkosma.de

# n8n
Container: n8n
Internal Port: 5678
External Port: 5678
URL: http://188.245.34.21:5678
Production: https://n8n.davidkosma.de

# Wichtig: Kein Apache Proxy für n8n - direkte Port-Freigabe
```

### Mixpost Container Zugriff

```bash
# In Container einloggen
docker exec -it root-mixpost-1 bash

# .env Location
cat /var/www/html/.env

# Wichtige Werte in Mixpost .env:
APP_URL=https://mixpost.davidkosma.de
REVERB_HOST=mixpost.davidkosma.de
REVERB_SCHEME=http
REVERB_PORT=8082

# Logs anzeigen
docker logs root-mixpost-1

# Container neu starten
docker restart root-mixpost-1
```

### n8n Container Zugriff

```bash
# In Container einloggen
docker exec -it n8n bash

# Environment Variables anzeigen
env | grep N8N

# Community Nodes installieren
cd ~/.n8n/nodes
npm install n8n-nodes-mixpost
exit
docker restart n8n

# Logs anzeigen
docker logs n8n

# Container neu starten
docker restart n8n
```

## Environment Variables Setup

### Development (.env.local)

```bash
# Mixpost
MIXPOST_URL=http://188.245.34.21:8082
MIXPOST_API_TOKEN=your_token_from_mixpost_ui

# n8n
N8N_WEBHOOK_URL=http://188.245.34.21:5678/webhook/video-published

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production (.env.production)

```bash
# Mixpost
MIXPOST_URL=https://mixpost.davidkosma.de
MIXPOST_API_TOKEN=your_production_token

# n8n
N8N_WEBHOOK_URL=https://n8n.davidkosma.de/webhook/video-published

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Mixpost API Token erstellen

1. Browser öffnen: `http://188.245.34.21:8082`
2. Login mit Admin-Account
3. Settings → API
4. "Create New Token" klicken
5. Name eingeben (z.B. "Production API")
6. Token kopieren → zu `.env.local` als `MIXPOST_API_TOKEN`

**Wichtig:** Token kann nur EINMAL angezeigt werden!

## OAuth Redirect URIs

Beim Erstellen der OAuth Apps für Social Media Plattformen:

### Development
```
http://localhost:3000/api/social-media/callback
```

### Production
```
https://your-domain.com/api/social-media/callback
```

### Mixpost Callbacks (für Platform-Verbindung in Mixpost UI)
```
http://188.245.34.21:8082/callback/youtube
http://188.245.34.21:8082/callback/instagram
http://188.245.34.21:8082/callback/facebook
http://188.245.34.21:8082/callback/tiktok
http://188.245.34.21:8082/callback/linkedin
http://188.245.34.21:8082/callback/twitter

# Production:
https://mixpost.davidkosma.de/callback/youtube
https://mixpost.davidkosma.de/callback/instagram
# ... etc
```

## Network & Firewall

### Ports die offen sein müssen:

```bash
# Mixpost
Port 8082 (TCP) - HTTP/HTTPS

# n8n
Port 5678 (TCP) - HTTP/HTTPS

# Webapp (Next.js)
Port 3000 (TCP) - Development
Port 80/443 (TCP) - Production
```

### Firewall Check:

```bash
# UFW Status
sudo ufw status

# Ports öffnen falls nötig
sudo ufw allow 8082/tcp
sudo ufw allow 5678/tcp
```

## Testing

### 1. Mixpost Erreichbarkeit

```bash
curl http://188.245.34.21:8082/api/v1/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. n8n Webhook Test

```bash
curl -X POST http://188.245.34.21:5678/webhook/video-published \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "test",
    "user_id": "test",
    "status": "Schnitt abgeschlossen",
    "storage_location": "https://test.mp4"
  }'
```

### 3. Webapp → Mixpost Connection

```bash
# In deiner Next.js App
npm run dev

# Browser: http://localhost:3000/profile/social-media
# Versuche einen Account zu verbinden
# Checke Browser DevTools Console für Errors
```

## Troubleshooting

### Mixpost nicht erreichbar?

```bash
# Container läuft?
docker ps | grep mixpost

# Container neu starten
docker restart root-mixpost-1

# Logs checken
docker logs root-mixpost-1 --tail 100

# Port-Mapping checken
docker port root-mixpost-1
```

### n8n nicht erreichbar?

```bash
# Container läuft?
docker ps | grep n8n

# Container neu starten
docker restart n8n

# Logs checken
docker logs n8n --tail 100

# Port-Mapping checken
docker port n8n
```

### OAuth-Flow schlägt fehl?

1. **Redirect URI prüfen**:
   - Muss EXAKT übereinstimmen in Platform Console
   - http vs https beachten
   - Port inkludieren bei Development

2. **Mixpost Provider Settings**:
   ```bash
   docker exec -it root-mixpost-1 bash
   cd /var/www/html
   cat .env | grep -i youtube
   cat .env | grep -i instagram
   # etc.
   ```

3. **Logs checken**:
   ```bash
   # Mixpost Logs
   docker logs root-mixpost-1 | grep -i oauth
   
   # App Logs (Next.js)
   # Browser DevTools Console
   ```

### Video-Upload schlägt fehl?

1. **Nextcloud URL erreichbar?**
   ```bash
   curl -I https://your-nextcloud.com/video.mp4
   ```

2. **Mixpost Upload Limits?**
   ```bash
   docker exec -it root-mixpost-1 bash
   cat /var/www/html/.env | grep UPLOAD
   php -i | grep upload_max_filesize
   php -i | grep post_max_size
   ```

3. **n8n Workflow läuft?**
   - n8n UI öffnen: `http://188.245.34.21:5678`
   - Workflow aktiviert?
   - Execution Log checken

## Security Checklist

- [ ] Mixpost API Token sicher in .env gespeichert
- [ ] Nicht im Git committen
- [ ] Firewall konfiguriert
- [ ] HTTPS für Production (via Domain + SSL)
- [ ] OAuth Client Secrets sicher in Mixpost
- [ ] Supabase RLS Policies aktiv
- [ ] n8n Authentication aktiviert
- [ ] Regelmäßige Container Updates

## Backup

```bash
# Mixpost Datenbank Backup
docker exec root-mixpost-1 mysqldump -u user -p database > mixpost_backup.sql

# n8n Workflows Export
# Via n8n UI: Settings → Import/Export

# .env Files Backup (ohne Secrets auf Server speichern!)
```

## Monitoring

```bash
# Container Status
docker ps -a

# Resource Usage
docker stats root-mixpost-1 n8n

# Logs Live-View
docker logs -f root-mixpost-1
docker logs -f n8n
```

## Domain Setup (für Production)

### Mixpost Domain: mixpost.davidkosma.de

1. **DNS A-Record**:
   ```
   mixpost.davidkosma.de → 188.245.34.21
   ```

2. **Apache/Nginx Reverse Proxy**:
   ```nginx
   server {
       listen 80;
       server_name mixpost.davidkosma.de;
       
       location / {
           proxy_pass http://localhost:8082;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

3. **SSL mit Let's Encrypt**:
   ```bash
   certbot --nginx -d mixpost.davidkosma.de
   ```

### n8n Domain: n8n.davidkosma.de

Gleicher Prozess, Port 5678

## Quick Commands

```bash
# Alle Container neu starten
docker restart root-mixpost-1 n8n

# Alle Logs checken
docker logs root-mixpost-1 --tail 50
docker logs n8n --tail 50

# Container Stats
docker stats --no-stream

# Disk Usage
docker system df
```

