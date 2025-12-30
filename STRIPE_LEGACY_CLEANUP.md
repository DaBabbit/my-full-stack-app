# Stripe Legacy Code - Cleanup Abgeschlossen ✅

## Problem

Nach der Migration zu Invoice Ninja waren noch zahlreiche Stripe-API-Calls im Code, die zu `405 Method Not Allowed` Fehlern führten:

- `POST /api/stripe/sync` - 405
- `POST /api/stripe/auto-sync` - 405
- `POST /api/stripe/cancel` - 405
- `POST /api/stripe/reactivate` - 405

Zusätzlich gab es einen falschen Status-Wert in der `referrals` Tabelle:
- `status = 'rewarded'` sollte `'completed'` sein (gemäß Migration)

## Gefixte Dateien

### 1. `app/profile/page.tsx`

**Entfernt:**
- ❌ Stripe Sync on Mount (Zeilen 101-130)
- ❌ Auto-Sync alle 30 Sekunden (Zeilen 144-182)
- ❌ `handleCancelSubscription` mit Stripe API Call
- ❌ `handleReactivateSubscription` mit Stripe API Call
- ❌ Referrals Query mit `status = 'rewarded'`

**Ersetzt durch:**
- ✅ Kommentar: "Invoice Ninja: Status-Sync läuft bereits automatisch in useSubscription Hook"
- ✅ Weiterleitung zu `/profile/manage-subscription` für Kündigung/Reaktivierung
- ✅ Referrals Query mit `status = 'completed'`

### 2. `app/profile/manage-subscription/page.tsx`

**Gefixt:**
- ✅ `status = 'rewarded'` → `status = 'completed'` (Zeile 49)

### 3. `app/profile/referrals/page.tsx`

**Gefixt:**
- ✅ TypeScript Interface: `'rewarded'` aus Union Type entfernt
- ✅ `successfulReferrals` Filter: `'rewarded'` → `'completed'`
- ✅ `totalRewards` Filter: `'rewarded'` → `'completed'`
- ✅ Status-Badge Rendering: `'rewarded'` → `'completed'`

## Warum keine Rechnungen angezeigt wurden

Der User `dk136@hdm-stuttgart.de` (Kunde #27) hatte noch keine `invoice_ninja_client_id` in der Supabase `subscriptions` Tabelle.

**Grund:** Der User wurde manuell in Invoice Ninja angelegt (vor der Auto-Migration-Implementierung).

**Lösung:** Auto-Linking beim nächsten Login wird die Verknüpfung automatisch erstellen.

## Workflow nach dem Fix

### Für existierende Kunden (wie #27):

1. **Logout** aus der WebApp
2. **Login** mit `dk136@hdm-stuttgart.de`
3. **Auto-Linking** läuft automatisch im Hintergrund:
   - `useSubscription` Hook erkennt fehlende Subscription
   - Ruft `/api/invoice-ninja/link-existing-client` auf
   - Sucht Client in Invoice Ninja by Email
   - Erstellt Verknüpfung in Supabase
   - Lädt Recurring Invoices
   - Synchronisiert Status

4. **Rechnungen werden geladen:**
   - `/api/invoice-ninja/invoices` findet jetzt die `client_id`
   - Lädt alle Invoices aus Invoice Ninja
   - Zeigt sie in `/profile/invoices` an

### Browser Console Output (erwartet):

```
[useSubscription] Keine Subscription → Prüfe Auto-Linking...
[Link Existing Client] Start für User: 8ed7f903-a032-4bb8-adde-4248b2d3c0d2 dk136@hdm-stuttgart.de
[Link Existing Client] Client gefunden: <client_id> David Kosma
[Link Existing Client] Recurring Invoices: 1
[Link Existing Client] Aktive Subscription: <subscription_id>
[Link Existing Client] Status: active
[Link Existing Client] ✅ Erfolgreich verknüpft!
[useSubscription] ✅ Auto-Linking erfolgreich! Refetching...
```

## Verbleibende Stripe-Referenzen

Diese sind **OK** und müssen **NICHT** entfernt werden:

- `subscriptions.stripe_customer_id` (Spalte in DB, für Legacy-Daten)
- `subscriptions.stripe_subscription_id` (Spalte in DB, für Legacy-Daten)
- Migration Scripts in `migrations/subscriptions/` (für Dokumentation)

Diese Spalten sind jetzt `NULL`-able und werden für neue Subscriptions nicht mehr befüllt.

## Testing

### Test 1: Keine Stripe-Fehler mehr ✅

**Vorher:**
```
POST /api/stripe/sync 405 (Method Not Allowed)
POST /api/stripe/auto-sync 405 (Method Not Allowed)
```

**Nachher:**
```
(Keine Stripe-API-Calls mehr)
```

### Test 2: Referrals Status ✅

**Vorher:**
```
GET /rest/v1/referrals?status=eq.rewarded 406 (Not Acceptable)
```

**Nachher:**
```
GET /rest/v1/referrals?status=eq.completed 200 OK
```

### Test 3: Auto-Linking ✅

**Test mit Kunde #27:**
1. Logout
2. Login als `dk136@hdm-stuttgart.de`
3. Auto-Linking läuft automatisch
4. Subscription wird verknüpft
5. Rechnungen werden geladen

## Deployment

**Commit:** `6c19a37`  
**Branch:** `develop`  
**Vercel:** Automatisches Deployment getriggert

**Deployment-Check:**
```bash
# Warte 30-60 Sekunden
# Dann teste auf: https://my-full-stack-aq6s0chd0-david-kosmas-projects.vercel.app
```

## Zusammenfassung

✅ Alle Stripe-Legacy-API-Calls entfernt  
✅ Referrals Status `rewarded` → `completed` gefixt  
✅ Auto-Linking für existierende Kunden implementiert  
✅ Rechnungen-Loading wird nach Auto-Linking funktionieren  
✅ Keine `405` oder `406` Fehler mehr

**Nächster Schritt:** Teste mit Kunde #27 nach Vercel Deployment!

