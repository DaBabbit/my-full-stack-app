# ✅ Twitter OAuth Setup - Schnell-Checkliste

## 🎯 Was du JETZT prüfen musst

### ☑️ Schritt 1: Twitter Developer Console

**URL:** https://developer.twitter.com/en/portal/projects-and-apps

1. [ ] App auswählen
2. [ ] **Settings** → **User authentication settings** öffnen
3. [ ] **Callback URI** prüfen:
   ```
   MUSS SEIN: https://mixpost.davidkosma.de/mixpost/callback/twitter
   
   ⚠️ NICHT: https://my-full-stack-alpha.vercel.app/...
   ```
4. [ ] **Website URL** prüfen:
   ```
   https://my-full-stack-alpha.vercel.app
   ```
5. [ ] **App permissions:** Read and write ✅
6. [ ] **Keys and tokens** Tab → API Keys notieren

---

### ☑️ Schritt 2: Mixpost Credentials

**URL:** https://mixpost.davidkosma.de/mixpost/settings

1. [ ] Login als Admin
2. [ ] **Settings** → **Integrations**
3. [ ] **Twitter** Sektion
4. [ ] **Client ID** = Twitter API Key ✅
5. [ ] **Client Secret** = Twitter API Secret Key ✅
6. [ ] **Save**

**Quick-Test:**
- [ ] Gehe zu **Accounts** → **Add Account** → **Twitter**
- [ ] OAuth-Flow startet ohne Fehler → ✅ Credentials korrekt

---

### ☑️ Schritt 3: Vercel Environment Variables

**URL:** https://vercel.com/david-kosmas-projects/my-full-stack-app/settings/environment-variables

**Prüfe diese 5 Variables (Environment: Production):**

1. [ ] `NEXT_PUBLIC_APP_URL` = `https://my-full-stack-alpha.vercel.app`
2. [ ] `MIXPOST_URL` = `https://mixpost.davidkosma.de`
3. [ ] `NEXT_PUBLIC_MIXPOST_URL` = `https://mixpost.davidkosma.de`
4. [ ] `MIXPOST_CORE_PATH` = `mixpost`
5. [ ] `MIXPOST_API_TOKEN` = `[dein Token aus Mixpost]`

**Nach Änderungen:**
- [ ] **Redeploy** getriggert
- [ ] Deployment Status = "Ready" ✅

---

### ☑️ Schritt 4: Test-Flow

**URL:** https://my-full-stack-alpha.vercel.app/profile/social-media

1. [ ] Login
2. [ ] **Social Media** Seite öffnen
3. [ ] **Twitter verbinden** klicken
4. [ ] Browser Console öffnen (F12)
5. [ ] **Erwartete Logs sehen:**
   ```
   [social-media/connect] Mixpost URL: https://mixpost.davidkosma.de
   [social-media/connect] Callback URL: https://my-full-stack-alpha.vercel.app/api/social-media/callback
   [social-media/connect] Generated OAuth URL: https://mixpost.davidkosma.de/mixpost/oauth/twitter?...
   ```
6. [ ] **Redirect zu Twitter** funktioniert
7. [ ] **Twitter Autorisierungs-Screen** erscheint
8. [ ] Nach "Authorize app": **Redirect zurück zur Webapp**
9. [ ] **Success-Toast:** "X (Twitter) erfolgreich verbunden!"
10. [ ] **Account in Liste sichtbar** ✅

---

## 🔴 Häufige Fehler

### Fehler 1: `404 (Not Found)` bei OAuth URL

**Symptom:**
```
GET https://mixpost.davidkosma.de/mixpost/oauth/twitter 404
```

**Check:**
- [ ] Ist Mixpost erreichbar? → https://mixpost.davidkosma.de/mixpost
- [ ] Sind Twitter Credentials in Mixpost korrekt eingetragen?
- [ ] `MIXPOST_CORE_PATH` in Vercel = `mixpost`?

---

### Fehler 2: `localhost:8000` in Callback URL

**Symptom:**
```
redirect_uri=http://localhost:8000/api/social-media/callback
```

**Check:**
- [ ] `NEXT_PUBLIC_APP_URL` in Vercel gesetzt?
- [ ] Vercel nach Env Var Änderung redeployed?
- [ ] Browser Cache geleert? (Cmd+Shift+R)

---

### Fehler 3: Twitter zeigt "Invalid Callback URL"

**Symptom:**
Twitter OAuth Error: "Callback URL not whitelisted"

**Check:**
- [ ] Twitter App Callback URI = `https://mixpost.davidkosma.de/mixpost/callback/twitter`?
- [ ] **NICHT** die Webapp URL eingetragen?
- [ ] Änderungen in Twitter Developer Console gespeichert?

---

### Fehler 4: "Account not found" nach Callback

**Symptom:**
Nach Twitter Auth zurück zur Webapp → Error "account_not_found"

**Check:**
- [ ] Mixpost Dashboard → Accounts: Ist Twitter Account sichtbar?
- [ ] `MIXPOST_API_TOKEN` korrekt?
- [ ] Test: `curl -H "Authorization: Bearer TOKEN" https://mixpost.davidkosma.de/api/v1/accounts`

---

## 📞 Debug-Kommandos

### Mixpost Logs anschauen:
```bash
ssh root@188.245.34.21
cd /path/to/mixpost
docker logs root-mixpost-1 --tail 100 -f
```

### Mixpost API testen:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://mixpost.davidkosma.de/api/v1/accounts
```

### Supabase Accounts prüfen:
```sql
SELECT 
  user_id, 
  platform, 
  platform_username, 
  mixpost_account_id,
  is_active,
  connected_at
FROM social_media_accounts
WHERE is_active = true
ORDER BY connected_at DESC;
```

---

## 🎯 Success-Kriterien

Nach erfolgreichem Setup:

- ✅ User kann Twitter verbinden ohne Mixpost zu sehen
- ✅ Account landet in Mixpost Dashboard
- ✅ Supabase hat Mapping (user_id ↔ mixpost_account_id)
- ✅ User sieht Success-Toast in Webapp
- ✅ Account erscheint in Liste unter /profile/social-media

---

## 🚀 Next Steps nach erfolgreichem Connect

1. **Weitere Plattformen testen:**
   - Instagram (benötigt Facebook Business Account)
   - YouTube (benötigt Google Cloud Project)
   - LinkedIn
   - TikTok

2. **Publishing testen:**
   - Video erstellen
   - Status auf "Schnitt abgeschlossen" setzen
   - n8n Workflow triggern
   - Post landet auf Twitter ✅

3. **Analytics testen:**
   - Dashboard öffnen
   - Social Media Analytics Widget prüfen
   - Daten von Mixpost API kommen ✅

---

## 📝 Notizen

**Wichtige URLs:**
- Webapp Production: https://my-full-stack-alpha.vercel.app
- Mixpost Dashboard: https://mixpost.davidkosma.de/mixpost
- Twitter Developer: https://developer.twitter.com/en/portal

**Wichtige Konzepte:**
- Twitter leitet zu **Mixpost** zurück (nicht zur Webapp!)
- Mixpost leitet dann zur **Webapp** zurück
- User sieht nur: Webapp → Twitter → Webapp ✅
- Mixpost bleibt unsichtbar für User 🎉

