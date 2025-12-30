# Invoice Ninja Integration - Test-Anleitung

## Übersicht

Diese Anleitung führt Sie durch die wichtigsten Tests für die Invoice Ninja + GoCardless Integration.

## Voraussetzungen

- [ ] Supabase Datenbank-Migrationen ausgeführt:
  - `migrations/subscriptions/migrate_to_invoice_ninja.sql`
  - `migrations/referrals/migrate_to_invoice_ninja.sql`
  
- [ ] Environment Variables gesetzt:
  - `INVOICE_NINJA_URL`
  - `INVOICE_NINJA_API_TOKEN`
  - `NEXT_PUBLIC_INVOICE_NINJA_URL`
  
- [ ] Invoice Ninja läuft (Docker Container)
- [ ] GoCardless in Invoice Ninja aktiviert (Settings > Payment Gateways)

## Test 1: API-Verbindung testen

### Manueller API-Test

```bash
# In Invoice Ninja Container
docker exec -it <invoice-ninja-container> bash

# Test API Token
curl -X GET "http://localhost/api/v1/clients" \
  -H "X-API-TOKEN: your_api_token_here" \
  -H "Content-Type: application/json"

# Sollte Liste der Clients zurückgeben (oder leeres Array)
```

### Test via Next.js API Route

```bash
# Lokalen Dev-Server starten
npm run dev

# Test API-Route (ersetze USER_ID)
curl -X POST "http://localhost:3000/api/invoice-ninja/sync-status" \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-uuid"}'
```

## Test 2: Subscription erstellen

### Via UI

1. Registriere einen neuen Test-User
2. Navigiere zu `/pay`
3. Klicke "Jetzt abonnieren"
4. Sollte zu Invoice Ninja Client Portal weiterleiten

### Erwartetes Ergebnis

- ✅ Client in Invoice Ninja erstellt
- ✅ Recurring Invoice erstellt (status_id = '2' = active)
- ✅ Eintrag in Supabase `subscriptions` Tabelle:
  - `invoice_ninja_client_id` gesetzt
  - `invoice_ninja_subscription_id` gesetzt
  - `status` = 'pending'

### Verifizierung

```sql
-- Prüfe Supabase Eintrag
SELECT * FROM subscriptions 
WHERE user_id = 'your-user-uuid';

-- Sollte invoice_ninja_* Spalten gefüllt haben
```

## Test 3: GoCardless SEPA-Mandat einrichten

### Im Client Portal

1. Öffne Client Portal URL (aus Test 2)
2. Navigiere zu "Payment Methods"
3. Füge GoCardless SEPA hinzu
4. Gebe Test-IBAN ein:
   - Deutschland: `DE89370400440532013000`
   - (Siehe GoCardless Sandbox Docs)
5. Bestätige Mandat

### Erwartetes Ergebnis

- ✅ Mandat in GoCardless Sandbox erstellt
- ✅ Mandat in Invoice Ninja verknüpft

## Test 4: Test-Zahlung initiieren

### Erste Rechnung

Invoice Ninja erstellt automatisch die erste Rechnung basierend auf `next_send_date` der Recurring Invoice.

**Manuell auslösen:**

1. In Invoice Ninja: Gehe zu "Recurring Invoices"
2. Finde die Test-Subscription
3. Klicke "Send Now"
4. Invoice wird erstellt und GoCardless initiiert automatisch Lastschrift

### GoCardless Sandbox

In GoCardless Sandbox können Sie Zahlungen manuell bestätigen:

1. Öffne GoCardless Dashboard (Sandbox)
2. Navigiere zu "Payments"
3. Finde Test-Payment
4. Klicke "Simulate Success" (oder "Simulate Failure" für Test)

## Test 5: Status-Sync prüfen

### Automatischer Sync (alle 5 Minuten)

Der Hook `useSubscription` synct automatisch alle 5 Minuten beim Login.

**Manuell triggern:**

```bash
# Trigger Status-Sync
curl -X POST "http://localhost:3000/api/invoice-ninja/sync-status" \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-user-uuid"}'
```

### Erwartetes Ergebnis

Nach erfolgreicher Zahlung:

- ✅ Supabase `status` = 'active'
- ✅ `current_period_end` gesetzt (30 Tage in Zukunft)
- ✅ `invoice_ninja_invoice_id` gesetzt
- ✅ `last_api_sync` aktualisiert

### UI Check

1. Logge dich in die App ein
2. Gehe zu `/profile`
3. Status sollte "Aktiv" zeigen
4. Gehe zu `/profile/invoices`
5. Rechnung sollte als "Bezahlt" angezeigt werden

## Test 6: Abo kündigen

1. Gehe zu `/profile/manage-subscription`
2. Klicke "Abo kündigen"
3. Bestätige

### Erwartetes Ergebnis

- ✅ Recurring Invoice in Invoice Ninja: `status_id` = '4' (completed)
- ✅ Supabase `status` = 'canceled'
- ✅ `cancel_at_period_end` = true
- ✅ UI zeigt "Gekündigt" mit Enddatum

## Test 7: Abo reaktivieren

1. Gehe zu `/profile/manage-subscription`
2. Klicke "Abo wiederherstellen"
3. Bestätige

### Erwartetes Ergebnis

- ✅ Recurring Invoice in Invoice Ninja: `status_id` = '2' (active)
- ✅ Supabase `status` = 'active'
- ✅ `cancel_at_period_end` = false

## Test 8: Rechnungen anzeigen

1. Gehe zu `/profile/invoices`
2. Liste aller Rechnungen sollte angezeigt werden
3. Klicke "PDF" Button
4. PDF sollte sich öffnen

### Erwartetes Ergebnis

- ✅ Alle Rechnungen werden angezeigt
- ✅ Status-Labels korrekt (Bezahlt, Gesendet, etc.)
- ✅ Beträge in EUR
- ✅ PDF-Download funktioniert

## Test 9: Referral-System

### Referral erstellen

1. User A generiert Referral-Code: `/profile/referrals`
2. User B registriert sich mit Referral-Code
3. User B erstellt Subscription (Test 2-4)
4. User B's erste Zahlung wird als "paid" markiert

### Rabatt anwenden

```bash
# Trigger Referral-Rabatt für User A's nächste Rechnung
curl -X POST "http://localhost:3000/api/referrals/apply-credit" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-a-uuid"}'
```

### Erwartetes Ergebnis

- ✅ Referral `status` = 'completed' (nach User B's Zahlung)
- ✅ Rabatt von 250€ auf User A's nächste Rechnung angewendet
- ✅ Referral `discount_applied` = true
- ✅ `applied_to_invoice_id` gesetzt

## Fehlerbehandlung testen

### Test: API-Token ungültig

```bash
# Setze falschen Token in .env.local
INVOICE_NINJA_API_TOKEN=invalid_token

# Restart Dev-Server
npm run dev

# Versuche Subscription zu erstellen
# Sollte Fehler anzeigen: "Failed to create subscription"
```

### Test: Invoice Ninja nicht erreichbar

```bash
# Stoppe Invoice Ninja Container
docker stop <invoice-ninja-container>

# Versuche Status-Sync
# Sollte graceful degradieren (Status bleibt 'pending')
```

### Test: GoCardless-Zahlung fehlgeschlagen

1. In GoCardless Sandbox: "Simulate Failure"
2. Warte 5 Minuten (Status-Sync)
3. Prüfe Supabase: `status` sollte 'past_due' sein
4. Nach 7 Tagen: `status` sollte 'canceled' werden

## Checkliste vor Production

- [ ] Alle Tests durchgeführt ✅
- [ ] GoCardless Production Mode aktiviert
- [ ] Recurring Invoices: `next_send_date` korrekt (7 Tage Vorlauf)
- [ ] Webhook-Secret (falls später hinzugefügt) gesetzt
- [ ] Alte Stripe-Webhooks deaktiviert
- [ ] Backup der Datenbank erstellt
- [ ] Environment Variables in Vercel gesetzt
- [ ] Test mit echtem Bankkonto (eigenes)

## Troubleshooting

### Problem: Status bleibt auf 'pending'

**Lösung:**
- Prüfe `last_api_sync` in Supabase
- Manuell Sync triggern via API-Route
- Prüfe Invoice Ninja Logs: `docker logs <container>`

### Problem: Rechnung wird nicht erstellt

**Lösung:**
- Prüfe Recurring Invoice `next_send_date`
- Prüfe `auto_bill` = 'always'
- Prüfe GoCardless Mandat ist aktiv

### Problem: PDF-Download funktioniert nicht

**Lösung:**
- Prüfe `NEXT_PUBLIC_INVOICE_NINJA_URL` ist korrekt gesetzt
- Prüfe Invoice Ninja ist von außen erreichbar (nicht nur localhost)

## Nächste Schritte

Nach erfolgreichem Testing:

1. Führe `migrations/subscriptions/migrate_to_invoice_ninja.sql` in Production aus
2. Setze Environment Variables in Vercel
3. Deploy Code
4. Teste mit echtem GoCardless Account (eigenes Bankkonto)
5. Deaktiviere Stripe Webhooks (Stripe Dashboard)

## Support

Bei Problemen:
- Invoice Ninja Docs: https://invoiceninja.github.io/
- GoCardless Docs: https://developer.gocardless.com/
- Supabase Logs prüfen
- Invoice Ninja Logs: `docker logs <container>`

