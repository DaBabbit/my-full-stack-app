# ⚙️ Vercel Environment Variables Setup

## 🚨 WICHTIG: Payment Links konfigurieren

Die Payment Links für die Plan-Auswahl funktionieren **NUR**, wenn diese ENV-Variablen in Vercel gesetzt sind!

### Schritt 1: Payment Links in Invoice Ninja erstellen

1. Öffne Invoice Ninja: https://invoice.kosmamedia.de
2. Gehe zu **Recurring Invoices** (Wiederkehrende Rechnungen)
3. Erstelle/Öffne die Recurring Invoice für **Test Payment** (1€)
   - Klicke auf "View Client Portal"
   - Kopiere den Payment Link (Format: `https://invoice.kosmamedia.de/client/payment/XXXXX`)
4. Erstelle/Öffne die Recurring Invoice für **Social Media Abo** (29,99€)
   - Klicke auf "View Client Portal"
   - Kopiere den Payment Link (Format: `https://invoice.kosmamedia.de/client/payment/YYYYY`)

### Schritt 2: ENV-Variablen in Vercel setzen

1. Gehe zu: https://vercel.com/david-kosmas-projects/my-full-stack-app/settings/environment-variables

2. Füge diese 2 Variablen hinzu (für **Production**, **Preview** UND **Development**):

```
NEXT_PUBLIC_PAYMENT_LINK_TEST
```
**Value**: `https://invoice.kosmamedia.de/client/payment/XXXXX` (dein Test Payment Link)

**Environments**: ✅ Production, ✅ Preview, ✅ Development

---

```
NEXT_PUBLIC_PAYMENT_LINK_SOCIAL_MEDIA
```
**Value**: `https://invoice.kosmamedia.de/client/payment/YYYYY` (dein Social Media Link)

**Environments**: ✅ Production, ✅ Preview, ✅ Development

### Schritt 3: Redeploy

Nach dem Setzen der ENV-Variablen musst du ein **Redeploy** triggern:

**Option A: Via Vercel Dashboard**
- Gehe zu Deployments → Klicke auf das letzte Deployment → "Redeploy"

**Option B: Via Git Push**
```bash
git commit --allow-empty -m "chore: Trigger redeploy for ENV vars"
git push origin develop
```

### Schritt 4: Browser-Cache leeren

Nach dem Redeploy:
1. Öffne die App in Chrome/Firefox
2. Drücke **Cmd+Shift+R** (Mac) oder **Ctrl+Shift+R** (Windows)
3. Oder: DevTools öffnen → Rechtsklick auf Reload → "Empty Cache and Hard Reload"

## ✅ Verification

Nach dem Setup solltest du im Modal die Payment Links sehen können. Prüfe in der Browser Console:
- **Kein Error**: `[PlanModal] No payment link configured for plan: test`
- **Kein Error**: `ERR_NAME_NOT_RESOLVED`

Stattdessen sollte der iFrame mit dem Invoice Ninja Payment Link laden.

## 📝 Debugging

Falls es immer noch nicht funktioniert:

1. **Console prüfen**: Öffne Browser DevTools → Console
2. **ENV-Variablen prüfen**: Tippe in Console:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_PAYMENT_LINK_TEST)
   console.log(process.env.NEXT_PUBLIC_PAYMENT_LINK_SOCIAL_MEDIA)
   ```
3. **Sollte zeigen**: Die vollständigen URLs (nicht `undefined`)

Falls `undefined`: ENV-Variablen wurden nicht korrekt gesetzt oder Redeploy fehlt.

