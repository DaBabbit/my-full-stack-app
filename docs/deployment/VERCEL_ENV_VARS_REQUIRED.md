# Vercel Environment Variables - Social Media Integration

## 🚨 WICHTIG: Diese Environment Variables müssen in Vercel gesetzt werden!

Gehe zu: https://vercel.com/david-kosmas-projects/my-full-stack-app/settings/environment-variables

## Setze folgende Variables:

### App URL
```
NEXT_PUBLIC_APP_URL=https://my-full-stack-alpha.vercel.app
```
(oder deine Custom Domain, falls du eine hast)

### Mixpost Configuration
```
MIXPOST_URL=https://mixpost.davidkosma.de
NEXT_PUBLIC_MIXPOST_URL=https://mixpost.davidkosma.de
```

### Mixpost Core Path
```
MIXPOST_CORE_PATH=mixpost
```
(Default-Wert, nur wenn du es in Mixpost geändert hast, anpassen)

### Mixpost API Token
```
MIXPOST_API_TOKEN=y7WjJ4xmUGbBA4t8uaEK220QUDs732gkDCTgpFjTe437809e
```
(Ersetze mit deinem echten Token aus Mixpost Dashboard → API Tokens)

### n8n Webhook URL
```
N8N_WEBHOOK_URL=http://188.245.34.21:5678/webhook/video-published
NEXT_PUBLIC_N8N_WEBHOOK_URL=http://188.245.34.21:5678/webhook/video-published
```
(oder `https://n8n.davidkosma.de/...` falls du auch dafür eine Domain hast)

## Wichtig:
- Alle Variables mit `NEXT_PUBLIC_` Prefix sind auch im Browser verfügbar
- Nach dem Setzen der Variables musst du ein **Redeploy** triggern
- Die OAuth Redirect URIs in Twitter müssen dann auf `https://mixpost.davidkosma.de/mixpost/callback/twitter` zeigen

## Twitter App Update:

Nachdem du die Environment Variables gesetzt hast, musst du auch in der Twitter App die Callback URI aktualisieren:

**Alte URI (FALSCH):**
```
http://188.245.34.21:8082/mixpost/callback/twitter
```

**Neue URI (RICHTIG):**
```
https://mixpost.davidkosma.de/mixpost/callback/twitter
```

## Nach dem Update:

1. ✅ Vercel Environment Variables setzen
2. ✅ Redeploy triggern
3. ✅ Twitter App Callback URI aktualisieren
4. ✅ Testen: Twitter verbinden von der Webapp

## SSL/HTTPS Issue:

Der Error `ERR_SSL_PROTOCOL_ERROR` kam, weil deine App versucht hat, mit `http://188.245.34.21:8082` zu kommunizieren, aber dein Browser HTTPS erzwingen wollte. Mit `https://mixpost.davidkosma.de` ist das Problem behoben.

