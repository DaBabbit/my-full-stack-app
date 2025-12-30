# 🔧 Payment Links Fix - Schritt-für-Schritt

## Problem

Das Modal zeigt den Error: `[PlanModal] No payment link configured for plan: test`

## Ursache

Die ENV-Variablen `NEXT_PUBLIC_PAYMENT_LINK_TEST` und `NEXT_PUBLIC_PAYMENT_LINK_SOCIAL_MEDIA` sind **nicht in Vercel gesetzt**.

---

## ✅ Lösung (3 Schritte)

### 1️⃣ Payment Links in Invoice Ninja kopieren

#### Test Payment Link:
1. Gehe zu Invoice Ninja: https://invoice.kosmamedia.de
2. **Recurring Invoices** → Finde die 1€ Test-Rechnung
3. Klicke auf die Rechnung → **"Client Portal"** oder **"View"**
4. Kopiere den vollständigen Link aus der Adressleiste:
   ```
   https://invoice.kosmamedia.de/client/payment/xxxxxxxxx
   ```

#### Social Media Abo Link:
1. **Recurring Invoices** → Finde die 29,99€ Social Media Rechnung
2. Klicke auf die Rechnung → **"Client Portal"** oder **"View"**
3. Kopiere den vollständigen Link:
   ```
   https://invoice.kosmamedia.de/client/payment/yyyyyyyyy
   ```

**Wichtig**: Du brauchst die **Client Portal Payment Links**, NICHT die Webhook-URLs!

---

### 2️⃣ ENV-Variablen in Vercel setzen

1. Öffne Vercel: https://vercel.com/david-kosmas-projects/my-full-stack-app/settings/environment-variables

2. **Erste Variable hinzufügen**:
   - **Key**: `NEXT_PUBLIC_PAYMENT_LINK_TEST`
   - **Value**: `https://invoice.kosmamedia.de/client/payment/xxxxxxxxx` (dein kopierter Test-Link)
   - **Environments**: Wähle **alle 3** aus:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Klicke **"Save"**

3. **Zweite Variable hinzufügen**:
   - **Key**: `NEXT_PUBLIC_PAYMENT_LINK_SOCIAL_MEDIA`
   - **Value**: `https://invoice.kosmamedia.de/client/payment/yyyyyyyyy` (dein kopierter Social Media Link)
   - **Environments**: Wähle **alle 3** aus:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - Klicke **"Save"**

---

### 3️⃣ Redeploy & Cache leeren

#### A) Redeploy auf Vercel:
1. Gehe zu: https://vercel.com/david-kosmas-projects/my-full-stack-app
2. **Deployments** Tab → Klicke auf das neueste Deployment
3. Klicke **"⋯" (3 Punkte)** → **"Redeploy"**
4. Warte bis Status: ✅ **Ready** (ca. 1-2 Minuten)

#### B) Browser-Cache leeren:
1. Öffne die App: https://my-full-stack-app-git-develop-david-kosmas-projects.vercel.app
2. **Hard Reload**:
   - **Mac**: `Cmd + Shift + R`
   - **Windows**: `Ctrl + Shift + R`
3. **Oder**: Öffne DevTools (F12) → Rechtsklick auf Reload-Button → "Empty Cache and Hard Reload"

---

## ✅ Verification

Nach dem Setup teste:

1. Gehe zu: `/profile/manage-subscription`
2. Klicke auf **"Plan ändern"**
3. Das Modal sollte öffnen mit **2 Plan-Optionen**
4. Klicke auf **"Jetzt auswählen"** bei einem Plan
5. Der iFrame sollte laden mit dem Invoice Ninja Payment Link

**Browser Console sollte zeigen**:
- ✅ Kein `[PlanModal] No payment link configured`
- ✅ Kein `ERR_NAME_NOT_RESOLVED`
- ✅ iFrame lädt Invoice Ninja URL

---

## 🐛 Debugging

Falls es noch nicht funktioniert:

### Check 1: ENV-Variablen in Browser prüfen
```javascript
// Öffne Browser Console (F12) und tippe:
console.log(process.env.NEXT_PUBLIC_PAYMENT_LINK_TEST)
console.log(process.env.NEXT_PUBLIC_PAYMENT_LINK_SOCIAL_MEDIA)
```

**Erwartetes Ergebnis**: Sollte die vollständigen URLs zeigen
**Fehler**: Zeigt `undefined` → ENV-Variablen nicht gesetzt oder Redeploy fehlt

### Check 2: Vercel Build Logs prüfen
1. Gehe zu Vercel → Deployments → Klicke auf das neueste
2. **Build Logs** durchsuchen nach:
   ```
   Creating an optimized production build
   ```
3. Sollte **keine** Errors zeigen

### Check 3: Network Tab prüfen
1. Öffne DevTools → **Network** Tab
2. Lade die Seite neu
3. Filter auf `page-` JavaScript Dateien
4. Prüfe ob neue Build-Versionen geladen werden (nicht gecacht)

---

## ⚠️ Bekannte Probleme & Fixes

### Problem: "ERR_NAME_NOT_RESOLVED"
**Ursache**: ENV-Variable ist leer oder hat falsches Format
**Fix**: Prüfe ob der Link vollständig ist (inkl. `https://`)

### Problem: "401 Unauthorized" beim Plan-Ändern
**Ursache**: Browser lädt gecachten alten Stripe-Code
**Fix**: Hard Reload (Cmd+Shift+R) oder Incognito-Fenster nutzen

### Problem: "406 Not Acceptable" für Referrals
**Ursache**: Alte Supabase-Daten mit `status='rewarded'`
**Fix**: SQL in Supabase ausführen:
```sql
UPDATE referrals SET status = 'completed' WHERE status = 'rewarded';
```

---

## 📸 Screenshot-Guide

Du hast einen Screenshot der Webhook-Seite gesendet - das ist **NICHT** was wir brauchen!

### ❌ Falsch: Webhook-URL (nicht für Payment Links)
```
Neuer Zahlungslink
Webhook URL: [_________]
REST-Methode: [Dropdown]
```

### ✅ Richtig: Client Portal Payment Link

So findest du den richtigen Link:
1. **Recurring Invoices** → Klicke auf die Rechnung
2. Klicke auf **"View"** oder **"Client Portal"** Button
3. Eine neue Seite öffnet sich → Kopiere die URL aus der Adressleiste
4. Format: `https://invoice.kosmamedia.de/client/payment/abc123xyz`

Der Link ist die **URL der Zahlungsseite**, nicht ein Webhook-Endpunkt!

---

## 🎯 Quick Fix Checklist

- [ ] Invoice Ninja Test Payment Link kopiert
- [ ] Invoice Ninja Social Media Link kopiert
- [ ] `NEXT_PUBLIC_PAYMENT_LINK_TEST` in Vercel gesetzt (alle 3 Environments)
- [ ] `NEXT_PUBLIC_PAYMENT_LINK_SOCIAL_MEDIA` in Vercel gesetzt (alle 3 Environments)
- [ ] Vercel Redeploy getriggert
- [ ] Deployment Status: ✅ Ready
- [ ] Browser-Cache geleert (Hard Reload)
- [ ] Modal öffnet und zeigt Pläne
- [ ] iFrame lädt Payment Link

---

**Bei weiteren Problemen**: Schicke einen Screenshot der Vercel Environment Variables Seite (mit zensiertem Link-Teil) und der Browser Console.

