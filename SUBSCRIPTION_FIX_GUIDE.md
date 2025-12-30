# 🔧 Subscription Status Fix für dk136@hdm-stuttgart.de

## Problem

User zeigt **"Content-Planer gesperrt"** obwohl er als Kunde #27 in Invoice Ninja existiert.

**Logs zeigen:**
```
currentSubscriptionStatus: "pending"
isSubscriber: false
```

## Diagnose

Der Status in Supabase ist **"pending"** statt **"active"**.

Das kann 2 Ursachen haben:
1. ❌ **User hat KEINE aktive Recurring Invoice in Invoice Ninja** → Nur manuelle Payment Links
2. ✅ **User hat aktive Recurring Invoice** → Supabase-Sync hat nicht funktioniert

---

## ✅ Lösung: 3 Schritte

### Schritt 1: Prüfe Invoice Ninja Status 🔍

1. Gehe zu Invoice Ninja: https://invoice.kosmamedia.de
2. **Clients** → Suche nach `dk136@hdm-stuttgart.de` (Customer #27)
3. Klicke auf den Client
4. Prüfe **Recurring Invoices** Tab:

**Fall A: KEINE Recurring Invoice gefunden**
→ User hat nur manuelle Payment Links erstellt
→ **Das ist das Problem!** Der User braucht eine Recurring Invoice für automatisches Abo

**Fall B: Recurring Invoice gefunden**
→ Prüfe **Status**: Muss `Active` sein (nicht `Draft` oder `Paused`)
→ Falls `Active`: Gehe zu Schritt 2

---

### Schritt 2: Supabase Status manuell aktualisieren 🔄

**Falls Recurring Invoice in Invoice Ninja ACTIVE ist:**

1. Gehe zu Supabase: https://supabase.com/dashboard/project/ohaduturfrhqiuhnewhg
2. **SQL Editor** → Neues Query
3. **Kopiere und führe aus:**

```sql
-- Prüfe aktuellen Status
SELECT 
  status,
  invoice_ninja_client_id,
  invoice_ninja_subscription_id,
  current_period_end
FROM public.subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';

-- Setze Status auf "active"
UPDATE public.subscriptions
SET 
  status = 'active',
  last_api_sync = NOW(),
  updated_at = NOW()
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2'
  AND status = 'pending';

-- Prüfe ob erfolgreich
SELECT status FROM public.subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';
-- Sollte zeigen: status = 'active'
```

4. Nach dem Update: **Browser neu laden** (Cmd+Shift+R)
5. Content-Planer sollte jetzt freigeschaltet sein ✅

---

### Schritt 3: Recurring Invoice erstellen (Falls keine vorhanden) 📝

**Falls KEINE Recurring Invoice in Invoice Ninja existiert:**

Du hast wahrscheinlich nur **manuelle Payment Links** erstellt. Das reicht nicht für automatisches Abo!

**So erstellst du eine Recurring Invoice:**

1. Invoice Ninja → **Recurring Invoices** → **"New Recurring Invoice"**
2. **Client**: Wähle `dk136@hdm-stuttgart.de` (Customer #27)
3. **Frequency**: `Monthly` (Monatlich)
4. **Auto Bill**: `Enabled` (Automatische Abrechnung)
5. **Line Items**: 
   - Beschreibung: "Social Media Abo" (oder "Test Payment")
   - Betrag: 29.99€ (oder 1€)
6. **Start Date**: Heute
7. **Klicke "Save"**
8. **Klicke "Start"** um die Recurring Invoice zu aktivieren

**Danach:**
- Status muss `Active` sein (grün)
- Die erste Invoice wird automatisch generiert
- GoCardless wird den Betrag automatisch abbuchen

**Dann**: Gehe zurück zu Schritt 2 und setze den Status in Supabase auf "active"

---

## 🧪 Verification

Nach dem Fix:

1. **Browser neu laden** (Cmd+Shift+R)
2. Gehe zu: `/profile`
3. ✅ "Content-Planer gesperrt" sollte **NICHT** mehr angezeigt werden
4. ✅ Voller Zugriff auf Dashboard und Content-Planer

**Browser Console sollte zeigen:**
```javascript
[Profile] hasActiveSubscription check: {
  currentSubscriptionStatus: "active",  // ← NICHT "pending"
  isSubscriber: true,                   // ← NICHT false
  result: true                          // ← NICHT false
}
```

---

## 🔍 Debugging

### Problem: Status bleibt "pending" nach SQL Update

**Ursache**: Browser-Cache zeigt alte Daten
**Fix**: 
1. Hard Reload: `Cmd + Shift + R`
2. Oder: Incognito-Fenster öffnen
3. Oder: DevTools → Application → Clear Storage

### Problem: Content-Planer immer noch gesperrt

**Check 1**: Supabase Status prüfen
```sql
SELECT status FROM subscriptions 
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';
```
Sollte zeigen: `active`

**Check 2**: Invoice Ninja Recurring Invoice prüfen
- Muss `Active` sein
- Muss `Auto Bill: Enabled` haben
- Muss mindestens 1 generierte Invoice haben

**Check 3**: Browser Console prüfen
```javascript
// In DevTools Console tippen:
console.log('Subscription Status:', localStorage.getItem('subscription'))
```

### Problem: Subscription wird wieder auf "pending" gesetzt

**Ursache**: API-Sync überschreibt den Status, weil keine aktive Recurring Invoice existiert
**Fix**: **Du MUSST eine Recurring Invoice in Invoice Ninja erstellen** (siehe Schritt 3)

---

## 📊 Unterschied: Payment Link vs. Recurring Invoice

### ❌ Payment Link (was du aktuell hast)
- Manuelle Zahlung
- Keine automatische Verlängerung
- Kein automatisches Abo-Management
- Status bleibt "pending" bis Zahlung erfolgt

### ✅ Recurring Invoice (was du brauchst)
- Automatische monatliche Abrechnung
- GoCardless zieht automatisch Geld ein
- Status wird automatisch auf "active" gesetzt
- Abo läuft ohne manuelle Intervention

---

## 🎯 Quick Fix Checklist

- [ ] Invoice Ninja öffnen
- [ ] Client `dk136@hdm-stuttgart.de` suchen
- [ ] Prüfen: Hat der Client eine **aktive Recurring Invoice**?
  - [ ] JA → SQL in Supabase ausführen (Schritt 2)
  - [ ] NEIN → Recurring Invoice erstellen (Schritt 3), dann SQL ausführen
- [ ] Supabase SQL ausgeführt
- [ ] Status = "active" bestätigt
- [ ] Browser Hard Reload (Cmd+Shift+R)
- [ ] Content-Planer freigeschaltet ✅

---

## 🆘 Immer noch Probleme?

Schicke mir:
1. Screenshot von Invoice Ninja → Client #27 → Recurring Invoices Tab
2. Output von diesem SQL:
   ```sql
   SELECT * FROM subscriptions 
   WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';
   ```
3. Browser Console Log (F12 → Console Tab)

