# 🔐 OAuth Flow: Komplette Dokumentation

## 📋 Übersicht

Dieser Flow ermöglicht es deinen Kunden, Social Media Accounts direkt in deiner Webapp zu verbinden, **ohne Mixpost je zu sehen**. Die Accounts landen automatisch in Mixpost und können via API gesteuert werden.

---

## 🌊 Der komplette OAuth-Flow

```
┌─────────────┐
│   Kunde     │
│  (Webapp)   │
└──────┬──────┘
       │
       │ 1. Klickt "Twitter verbinden"
       │
       v
┌──────────────────────────────────────┐
│  /api/social-media/connect           │
│  - Generiert OAuth URL zu Mixpost    │
│  - State enthält: userId + platform  │
└──────┬───────────────────────────────┘
       │
       │ 2. Redirect zu Mixpost OAuth
       │
       v
┌──────────────────────────────────────┐
│  Mixpost OAuth Endpoint              │
│  /mixpost/oauth/twitter              │
│  - Empfängt state + redirect_uri     │
└──────┬───────────────────────────────┘
       │
       │ 3. Mixpost leitet zu Twitter
       │
       v
┌──────────────────────────────────────┐
│  Twitter OAuth                       │
│  - Zeigt Autorisierung               │
│  - User gibt Berechtigung            │
└──────┬───────────────────────────────┘
       │
       │ 4. Twitter leitet zurück zu Mixpost
       │    URL: https://mixpost.davidkosma.de/mixpost/callback/twitter
       │
       v
┌──────────────────────────────────────┐
│  Mixpost Callback                    │
│  /mixpost/callback/twitter           │
│  - Tauscht Auth Code gegen Token     │
│  - Speichert Account in Mixpost DB   │
└──────┬───────────────────────────────┘
       │
       │ 5. Mixpost leitet zurück zur Webapp
       │    URL: https://my-full-stack-alpha.vercel.app/api/social-media/callback?state=...
       │
       v
┌──────────────────────────────────────┐
│  /api/social-media/callback          │
│  - Dekodiert state → userId          │
│  - Holt Account-Daten von Mixpost    │
│  - Speichert Mapping in Supabase     │
└──────┬───────────────────────────────┘
       │
       │ 6. Redirect zur Webapp mit Success
       │
       v
┌──────────────────────────────────────┐
│  /profile/social-media?success=true  │
│  - Zeigt Erfolgs-Toast               │
│  - Account ist verbunden ✅          │
└──────────────────────────────────────┘
```

---

## 🎯 Kritische URLs - Was wo steht

### ⚠️ WICHTIG: 3 verschiedene URLs!

| URL | Wo konfiguriert | Zweck |
|-----|-----------------|-------|
| `https://mixpost.davidkosma.de/mixpost/callback/twitter` | **Twitter Developer Console** | Twitter leitet hierhin zurück (zu Mixpost!) |
| `https://my-full-stack-alpha.vercel.app/api/social-media/callback` | **Vercel Environment Variables** (`NEXT_PUBLIC_APP_URL`) | Mixpost leitet hierhin zurück (zu deiner Webapp!) |
| `https://mixpost.davidkosma.de/mixpost/oauth/twitter` | **Automatisch generiert** von `/api/social-media/connect` | User wird hierhin geschickt zum Starten |

---

## ✅ Checkliste: Korrekte Konfiguration

### 1️⃣ Twitter Developer Console

**URL:** https://developer.twitter.com/en/portal/projects-and-apps

**Schritte:**
1. Wähle deine App
2. **Settings** → **User authentication settings** → **Edit**
3. **App permissions:** Read and write (für Posting)
4. **Type of App:** Web App, Automated App or Bot
5. **Callback URI / Redirect URL:**
   ```
   https://mixpost.davidkosma.de/mixpost/callback/twitter
   ```
   ⚠️ **NICHT** die Webapp-URL eintragen!
6. **Website URL:** 
   ```
   https://my-full-stack-alpha.vercel.app
   ```
7. **Save**

**API Keys notieren:**
- API Key (Client ID)
- API Secret Key (Client Secret)

---

### 2️⃣ Mixpost OAuth Credentials

**URL:** https://mixpost.davidkosma.de/mixpost/settings

**Schritte:**
1. Login als Admin
2. **Settings** → **Integrations** → **Twitter**
3. Trage ein:
   - **Client ID:** [dein Twitter API Key]
   - **Client Secret:** [dein Twitter API Secret Key]
4. **Save**

**Test:**
- Gehe zu **Accounts** → **Add Account** → **Twitter**
- Wenn OAuth-Flow funktioniert → ✅ Credentials korrekt

---

### 3️⃣ Vercel Environment Variables

**URL:** https://vercel.com/david-kosmas-projects/my-full-stack-app/settings/environment-variables

**Erforderliche Variables (für Production):**

| Variable | Value | Zweck |
|----------|-------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://my-full-stack-alpha.vercel.app` | OAuth Callback URL (Mixpost → Webapp) |
| `MIXPOST_URL` | `https://mixpost.davidkosma.de` | Mixpost Base URL |
| `NEXT_PUBLIC_MIXPOST_URL` | `https://mixpost.davidkosma.de` | Mixpost URL für Frontend |
| `MIXPOST_CORE_PATH` | `mixpost` | Mixpost Core Path (Standard) |
| `MIXPOST_API_TOKEN` | `[dein Token]` | Mixpost API Token für Backend-Calls |

**Nach dem Setzen:**
- **Redeploy** triggern (Deployments → Redeploy)
- Neue Variables werden erst nach Redeploy aktiv!

---

### 4️⃣ Supabase Schema

**Schema muss existieren:**

```sql
CREATE TABLE public.social_media_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  mixpost_account_id VARCHAR(255) UNIQUE NOT NULL,
  platform_user_id VARCHAR(255),
  platform_username VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  mixpost_account_data JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, mixpost_account_id)
);
```

**RLS Policies:**
- User kann eigene Accounts sehen: ✅
- User kann eigene Accounts löschen: ✅

---

## 🧪 Test-Flow

### Manueller Test:

1. **Öffne Webapp:** https://my-full-stack-alpha.vercel.app
2. **Login** mit Test-Account
3. **Profile** → **Social Media**
4. **Klick "Twitter verbinden"**

**Erwartetes Verhalten:**
- ✅ Redirect zu Mixpost OAuth URL
- ✅ Mixpost leitet zu Twitter weiter
- ✅ Twitter zeigt Autorisierungs-Screen
- ✅ Nach Erlauben: Redirect zurück zur Webapp
- ✅ Success-Toast: "X (Twitter) erfolgreich verbunden!"
- ✅ Account erscheint in Liste

**Debug-Logs:**

Browser Console:
```
[social-media/connect] Mixpost URL: https://mixpost.davidkosma.de
[social-media/connect] Callback URL: https://my-full-stack-alpha.vercel.app/api/social-media/callback
[social-media/connect] Generated OAuth URL: https://mixpost.davidkosma.de/mixpost/oauth/twitter?state=...&redirect_uri=...
```

Vercel Logs (Function Logs):
```
[social-media/callback] Decoded state: { userId: '...', platform: 'twitter' }
[social-media/callback] Fetching all accounts from Mixpost...
[social-media/callback] Fetched accounts count: 1
[social-media/callback] Selected account: { id: '...', username: '@...', provider: 'twitter' }
[social-media/callback] Success! Redirecting...
```

---

## 🔧 Troubleshooting

### Problem: 404 bei OAuth URL

**Symptom:**
```
GET https://mixpost.davidkosma.de/mixpost/oauth/twitter 404
```

**Ursachen:**
1. Mixpost ist down
2. Falsche `MIXPOST_CORE_PATH` (sollte `mixpost` sein)
3. Twitter-Integration in Mixpost nicht aktiviert

**Lösung:**
1. Prüfe Mixpost erreichbar: `https://mixpost.davidkosma.de/mixpost`
2. Prüfe Mixpost Settings → Integrations → Twitter ist konfiguriert
3. Prüfe Vercel Env Vars gesetzt

---

### Problem: Callback mit `localhost:8000`

**Symptom:**
```
redirect_uri=http://localhost:8000/api/social-media/callback
```

**Ursache:**
- `NEXT_PUBLIC_APP_URL` nicht in Vercel gesetzt
- Oder: Vercel nicht redeployed nach Env Var Änderung

**Lösung:**
1. Setze `NEXT_PUBLIC_APP_URL=https://my-full-stack-alpha.vercel.app`
2. **Redeploy** Vercel App
3. Warte bis Deployment fertig
4. Test erneut

---

### Problem: "Account not found" nach Callback

**Symptom:**
```
[social-media/callback] No accounts found for platform: twitter
```

**Ursache:**
- Mixpost hat Account noch nicht gespeichert (Race Condition)
- Oder: Mixpost API Token falsch

**Lösung:**
1. Prüfe Mixpost Dashboard → Accounts: Ist Account sichtbar?
2. Prüfe `MIXPOST_API_TOKEN` korrekt gesetzt
3. Teste manuell: `curl -H "Authorization: Bearer TOKEN" https://mixpost.davidkosma.de/api/v1/accounts`

---

### Problem: "Database error" beim Speichern

**Symptom:**
```
[social-media/callback] Error inserting account: { code: '23505' }
```

**Ursache:**
- Duplicate entry (Account schon verbunden)
- Oder: RLS Policy blockiert Insert

**Lösung:**
1. Prüfe Supabase: `SELECT * FROM social_media_accounts WHERE user_id = '...'`
2. Prüfe RLS Policies aktiviert und korrekt
3. Falls Duplicate: Code handelt es via Update (sollte funktionieren)

---

## 📊 Monitoring

### Was du überwachen solltest:

1. **Vercel Function Logs:**
   - `/api/social-media/connect` Aufrufe
   - `/api/social-media/callback` Success Rate

2. **Mixpost Logs:**
   ```bash
   docker logs root-mixpost-1 --tail 100 -f
   ```

3. **Supabase:**
   - Anzahl verbundener Accounts
   - Fehlerhafte Einträge (`is_active = false`)

---

## 🎯 Next Steps nach erstem erfolgreichen Connect

1. ✅ **Publishing testen:**
   - Video auf "Schnitt abgeschlossen" setzen
   - n8n Webhook wird getriggert
   - Post landet auf Twitter

2. ✅ **Analytics testen:**
   - Posts in Mixpost anschauen
   - Analytics via API abrufen
   - Im Dashboard anzeigen

3. ✅ **Multi-Account Test:**
   - Zweiten Twitter Account verbinden (anderer User)
   - Prüfe: Beide Accounts in Mixpost sichtbar
   - Prüfe: Korrekte Zuordnung in Supabase

---

## 📝 Zusammenfassung

**Der Flow funktioniert so:**

1. User klickt in **Webapp** auf "Verbinden"
2. Webapp generiert OAuth URL zu **Mixpost**
3. Mixpost leitet zu **Twitter**
4. Twitter leitet zurück zu **Mixpost** (nicht Webapp!)
5. Mixpost speichert Account und leitet zu **Webapp** zurück
6. Webapp speichert Mapping in **Supabase**
7. ✅ **User sieht nur Webapp + Twitter - niemals Mixpost!**

**Der Kunde merkt NICHTS von Mixpost.** 🎉

Alle Accounts landen zentral in Mixpost, können aber nur vom jeweiligen User via Webapp gesteuert werden (dank Supabase Mapping).

