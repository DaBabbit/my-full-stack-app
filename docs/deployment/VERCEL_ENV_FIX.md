# 🚨 SOFORT-FIX: Vercel Environment Variables

## Problem

Deine Webapp verwendet noch `localhost:8000` statt der Production-URL.

**Beweis:**
```
redirect_uri=http://localhost:8000/api/social-media/callback
```

## Lösung

### Schritt 1: Vercel Environment Variables setzen

**URL:** https://vercel.com/david-kosmas-projects/my-full-stack-app/settings/environment-variables

**Füge GENAU diese 5 Variables hinzu:**

| Name | Value | Environment |
|------|-------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://my-full-stack-alpha.vercel.app` | ✅ Production |
| `MIXPOST_URL` | `https://mixpost.davidkosma.de` | ✅ Production |
| `NEXT_PUBLIC_MIXPOST_URL` | `https://mixpost.davidkosma.de` | ✅ Production |
| `MIXPOST_CORE_PATH` | `mixpost` | ✅ Production |
| `MIXPOST_API_TOKEN` | `[DEIN TOKEN]` | ✅ Production |

**Screenshot-Anleitung:**

1. Gehe zu Environment Variables Settings
2. Klicke **"Add New"**
3. Name: `NEXT_PUBLIC_APP_URL`
4. Value: `https://my-full-stack-alpha.vercel.app`
5. Environment: **NUR "Production" anhaken!**
6. Klicke **"Save"**
7. Wiederhole für die anderen 4 Variables

---

### Schritt 2: Redeploy triggern

**Wichtig:** Environment Variables werden erst nach Redeploy aktiv!

**Option A: Via Vercel Dashboard**
1. Gehe zu: https://vercel.com/david-kosmas-projects/my-full-stack-app/deployments
2. Wähle das letzte Deployment
3. Klicke die 3 Punkte `⋯`
4. Klicke **"Redeploy"**
5. Warte bis Status = "Ready"

**Option B: Via Git Push (nicht nötig, da Code unverändert)**
```bash
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

### Schritt 3: Prüfen ob Variables aktiv sind

Nach dem Redeploy:

1. Öffne: https://my-full-stack-alpha.vercel.app/profile/social-media
2. Öffne Browser Console (F12)
3. Klicke **"Twitter verbinden"**
4. **Erwarteter Log:**
   ```
   [social-media/connect] Callback URL: https://my-full-stack-alpha.vercel.app/api/social-media/callback
   ```
   **NICHT mehr:** `localhost:8000` ✅

---

## Mixpost Twitter OAuth prüfen

### Schritt 4: Twitter in Mixpost konfiguriert?

**URL:** https://mixpost.davidkosma.de/mixpost/settings

1. Login als Admin
2. **Settings** → **Integrations**
3. Suche **"Twitter"** oder **"X"**
4. Prüfe: Client ID + Client Secret eingetragen?

**Falls NICHT eingetragen:**

Du brauchst Twitter OAuth Credentials:
1. Gehe zu: https://developer.twitter.com/en/portal/projects-and-apps
2. Wähle deine App
3. **Keys and tokens** Tab
4. Notiere:
   - **API Key** (Client ID)
   - **API Secret Key** (Client Secret)
5. Trage sie in Mixpost ein
6. **Save**

---

### Schritt 5: Mixpost OAuth Endpoint testen

**Test 1: Ist Mixpost erreichbar?**
```bash
curl -I https://mixpost.davidkosma.de/mixpost
```

**Erwartete Antwort:**
```
HTTP/2 200
```

**Test 2: Ist Twitter OAuth Endpoint verfügbar?**

Öffne in Browser:
```
https://mixpost.davidkosma.de/mixpost/oauth/twitter?state=test&redirect_uri=https://example.com/callback
```

**Erwartetes Verhalten:**
- ❌ 404 Error → Twitter NICHT in Mixpost konfiguriert
- ✅ Redirect zu Twitter → Twitter korrekt konfiguriert

---

## Zusammenfassung

**2 Probleme zu lösen:**

1. **Vercel Environment Variables fehlen**
   - [ ] 5 Variables in Vercel setzen
   - [ ] Redeploy triggern
   - [ ] Testen: Kein `localhost:8000` mehr

2. **Mixpost Twitter OAuth nicht konfiguriert**
   - [ ] Twitter Credentials in Mixpost eintragen
   - [ ] Test: OAuth Endpoint funktioniert

**Nach beiden Fixes:**
- ✅ Callback URL ist korrekt (Vercel Production URL)
- ✅ Mixpost OAuth Endpoint funktioniert (200 statt 404)
- ✅ Twitter verbinden funktioniert!

---

## Next Steps nach Fix

Wenn beide Probleme behoben sind:

1. **Test erneut:**
   - Webapp öffnen
   - Twitter verbinden
   - Sollte zu Twitter OAuth weiterleiten
   - Nach Authorize: Zurück zur Webapp
   - Success! ✅

2. **Mixpost Dashboard prüfen:**
   - Accounts Tab
   - Neuer Twitter Account sollte sichtbar sein

3. **Supabase prüfen:**
   - Tabelle `social_media_accounts`
   - Neuer Eintrag mit `mixpost_account_id` sollte da sein

