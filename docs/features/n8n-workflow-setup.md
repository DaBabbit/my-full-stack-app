# n8n Workflow Setup Guide für Social Media Publishing

## Voraussetzungen

1. **n8n Installation**: Self-hosted n8n Instanz
2. **Mixpost n8n Node**: Installation des Community-Nodes
3. **Environment Variables**: Konfigurierte URLs und API-Keys

## Installation

### 1. Mixpost n8n Community Node installieren

```bash
# Im n8n Container
docker exec -it n8n bash
cd ~/.n8n/nodes
npm install n8n-nodes-mixpost
exit
# n8n Container neu starten
docker restart n8n
```

Oder in n8n UI:
- Settings → Community Nodes
- Suche nach "mixpost"
- Installiere "n8n-nodes-mixpost"

### 2. Credentials einrichten

#### Mixpost API Credentials
- Name: `Mixpost API`
- Type: `Mixpost API`
- API URL: `http://188.245.34.21:8082` (oder `https://mixpost.davidkosma.de`)
- API Token: `your_mixpost_api_token` (aus Mixpost UI: Settings → API)

**Container-Info:**
- Mixpost Container: `root-mixpost-1` (Port 8082)
- n8n Container: `n8n` (Port 5678)

#### App API Credentials (für Webhook Calls)
- Name: `App API`
- Type: `HTTP Header Auth`
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_API_TOKEN`

### 3. Workflow importieren

1. Kopiere den Inhalt von `n8n-mixpost-workflow.json`
2. In n8n UI: Workflows → Import from File
3. Füge den JSON-Content ein
4. Speichern

### 4. Workflow-Konfiguration

#### Webhook Node
- **Path**: `video-published`
- **Full Webhook URL**: `http://188.245.34.21:5678/webhook/video-published`
  - Production: `https://n8n.davidkosma.de/webhook/video-published`
- **Method**: POST
- **Container**: `n8n` (Port 5678, direkt exposed)

**Expected Payload:**
```json
{
  "video_id": "uuid",
  "user_id": "uuid",
  "status": "Schnitt abgeschlossen",
  "storage_location": "https://nextcloud.url/share/video.mp4"
}
```

#### Get Video Details Node
- **URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/videos/{{$json.video_id}}`
- **Authentication**: App API Credentials
- **Method**: GET

#### Get User's Social Accounts Node
- **URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/social-media/accounts`
- **Query Parameter**: `userId={{$json.user_id}}`
- **Authentication**: App API Credentials
- **Method**: GET

#### Has Connected Accounts? (IF Node)
- **Condition**: `{{$json.accounts.length}} > 0`
- **True**: Continue to upload
- **False**: End workflow (no action)

#### Download Video from Nextcloud
- **URL**: `{{$json.storage_location}}`
- **Method**: GET
- **Response Format**: File
- **Note**: Lädt das Video als Binary für Upload

#### Get Video Caption Node
- **URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/nextcloud/markdown`
- **Query Parameter**: `videoId={{$json.video_id}}`
- **Authentication**: App API Credentials
- **Method**: GET

#### Upload to Mixpost Node
- **Operation**: Upload Media
- **File**: `{{$binary}}`
- **Credentials**: Mixpost API
- **Returns**: `media_id`

#### Create Social Media Post Node
- **Operation**: Schedule Post
- **Content**: `{{$node['Get Video Caption'].json.content}}`
- **Accounts**: `{{$node['Get User\'s Social Accounts'].json.accounts.map(acc => acc.mixpost_account_id)}}`
- **Media**: `[{{$node['Upload to Mixpost'].json.media_id}}]`
- **Scheduled At**: `now` (sofort) oder spezifisches Datum
- **Credentials**: Mixpost API

#### Update Database Node
- **URL**: `{{$env.NEXT_PUBLIC_APP_URL}}/api/social-media/publish`
- **Method**: POST
- **Authentication**: App API Credentials
- **Body**:
```json
{
  "videoId": "{{$node['Webhook'].json.video_id}}",
  "mixpost_post_id": "{{$node['Create Social Media Post'].json.id}}",
  "status": "published"
}
```

### 5. Supabase Trigger einrichten

Um den Workflow automatisch zu triggern wenn ein Video auf "Schnitt abgeschlossen" gesetzt wird:

```sql
-- Create function to trigger n8n webhook
CREATE OR REPLACE FUNCTION trigger_n8n_video_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed to "Schnitt abgeschlossen"
  IF NEW.status = 'Schnitt abgeschlossen' AND 
     (OLD.status IS NULL OR OLD.status != 'Schnitt abgeschlossen') THEN
    
    -- Call n8n webhook via HTTP
    PERFORM net.http_post(
      url := 'http://188.245.34.21:5678/webhook/video-published',
      -- Production: 'https://n8n.davidkosma.de/webhook/video-published'
      body := json_build_object(
        'video_id', NEW.id,
        'user_id', NEW.user_id,
        'status', NEW.status,
        'storage_location', NEW.storage_location
      )::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER video_status_changed_trigger
  AFTER UPDATE OF status ON videos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_n8n_video_publish();
```

**Note**: Erfordert `pg_net` Extension in Supabase.

### Alternative: Manual Trigger via API

Falls Supabase Webhooks nicht verfügbar sind, kann der Workflow auch manuell getriggert werden:

In `/app/api/videos/[id]/route.ts`:
```typescript
// Nach Video-Status Update
if (newStatus === 'Schnitt abgeschlossen') {
  // Trigger n8n workflow
  const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://188.245.34.21:5678/webhook/video-published';
  
  await fetch(n8nUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_id: videoId,
      user_id: userId,
      status: 'Schnitt abgeschlossen',
      storage_location: video.storage_location
    })
  });
}
```

## Testing

1. **Aktiviere Workflow in n8n**
2. **Teste Webhook**:
   ```bash
   # Von lokalem Terminal
   curl -X POST http://188.245.34.21:5678/webhook/video-published \
     -H "Content-Type: application/json" \
     -d '{
       "video_id": "test-uuid",
       "user_id": "test-user-uuid",
       "status": "Schnitt abgeschlossen",
       "storage_location": "https://test-video-url.mp4"
     }'
   
   # Production
   curl -X POST https://n8n.davidkosma.de/webhook/video-published \
     -H "Content-Type: application/json" \
     -d '{
       "video_id": "test-uuid",
       "user_id": "test-user-uuid",
       "status": "Schnitt abgeschlossen",
       "storage_location": "https://test-video-url.mp4"
     }'
   ```
3. **Überprüfe Execution Log in n8n UI**
4. **Verifiziere in Mixpost**: Post sollte erscheinen
5. **Verifiziere in DB**: `social_media_posts` Table sollte Eintrag haben

## Fehlerbehandlung

### Workflow fehlgeschlagen?
1. Überprüfe n8n Execution Log
2. Verifiziere alle Credentials
3. Teste einzelne Nodes manuell
4. Überprüfe Environment Variables

### Video-Upload fehlgeschlagen?
- Überprüfe Nextcloud-URL und Zugriffsrechte
- Verifiziere Video-Format (MP4 empfohlen)
- Prüfe Mixpost Upload-Limits

### Post nicht erstellt?
- Verifiziere connected accounts in DB
- Überprüfe Mixpost account IDs
- Prüfe Caption-Format

## Monitoring

- **n8n Executions**: Überwache erfolgreiche/fehlgeschlagene Runs
- **Mixpost Dashboard**: Verifiziere scheduled/published posts
- **Supabase**: Überwache `social_media_posts` Table
- **App Logs**: Checke API-Endpoint Responses

## Skalierung

Für höhere Volumina:
- Nutze n8n Queue Mode
- Implementiere Retry-Logic
- Füge Rate-Limiting hinzu
- Überwache Platform-spezifische Limits

