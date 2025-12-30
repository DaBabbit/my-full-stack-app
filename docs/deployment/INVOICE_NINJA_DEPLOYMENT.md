# Invoice Ninja Migration - Deployment Guide

## Übersicht

Dieser Guide führt Sie durch das Production Deployment der Invoice Ninja Integration.

## ⚠️ WICHTIG: Vor dem Deployment

### 1. Backup erstellen

```bash
# Supabase Datenbank Backup über Dashboard
# Settings > Database > Backup > Create manual backup
```

### 2. Lokale Tests durchgeführt

- [ ] Alle Tests aus `INVOICE_NINJA_TESTING.md` erfolgreich
- [ ] GoCardless Sandbox funktioniert
- [ ] Mindestens eine Test-Subscription erfolgreich erstellt
- [ ] Status-Sync funktioniert

## Deployment-Schritte

### Schritt 1: Datenbank-Migrationen (Supabase)

**Reihenfolge wichtig!**

```sql
-- 1. Subscriptions Tabelle migrieren
-- Datei: migrations/subscriptions/migrate_to_invoice_ninja.sql
-- Im Supabase SQL Editor ausführen

-- 2. Referrals Tabelle migrieren
-- Datei: migrations/referrals/migrate_to_invoice_ninja.sql
-- Im Supabase SQL Editor ausführen
```

**Verifizierung:**

```sql
-- Prüfe ob neue Spalten existieren
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
  AND column_name LIKE 'invoice_ninja%';

-- Sollte zurückgeben:
-- invoice_ninja_client_id
-- invoice_ninja_subscription_id
-- invoice_ninja_invoice_id
-- payment_method
-- gocardless_mandate_id
-- last_api_sync
```

### Schritt 2: Environment Variables (Vercel)

Gehe zu Vercel Dashboard → Settings → Environment Variables

**Hinzufügen:**

```bash
INVOICE_NINJA_URL=https://your-invoice-ninja-domain.com
INVOICE_NINJA_API_TOKEN=your_production_api_token
NEXT_PUBLIC_INVOICE_NINJA_URL=https://your-invoice-ninja-domain.com
```

**Entfernen (optional, kann auch bleiben):**

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_BUTTON_ID
```

**⚠️ WICHTIG:** 
- Setze alle für `Production`, `Preview` und `Development`
- Verwende Production API Token für Production
- Verwende Sandbox Token für Preview/Development

### Schritt 3: GoCardless Production Mode

1. Gehe zu Invoice Ninja: Settings → Payment Gateways → GoCardless
2. Aktiviere "Production Mode"
3. Gebe Production API Keys ein (GoCardless Dashboard)
4. Teste mit echtem Bankkonto (eigenes)

**GoCardless API Keys:**
- Zugang Token: `live_xxx`
- Environment: `live`

### Schritt 4: Recurring Invoice Settings

In Invoice Ninja für Production:

1. Gehe zu Settings → Company Details
2. Stelle sicher: Currency = EUR
3. Gehe zu Settings → Recurring Invoices
4. **Wichtig:** "Send Date" Offset = **7 days**
   - GoCardless braucht 5 Werktage Vorlauf für Erstlastschrift
   - Mit 7 Tagen bist du auf der sicheren Seite

### Schritt 5: Code Deployment

```bash
# 1. Pull neuesten Code
git pull origin develop

# 2. Dependencies installieren (Stripe ist weg)
npm install

# 3. Build testen
npm run build

# 4. Deployment
git push origin main  # Oder wie in deinen Memories konfiguriert
```

**Vercel deployt automatisch!**

### Schritt 6: Stripe Webhooks deaktivieren

**NUR NACH erfolgreichem Test in Production!**

1. Gehe zu Stripe Dashboard
2. Developers → Webhooks
3. Finde Webhook für deine Production URL
4. Klicke auf Webhook
5. Klicke "..." → "Disable"
6. **NICHT löschen** (für Rollback falls nötig)

### Schritt 7: Erste Production Test

**Mit eigenem Account:**

1. Registriere Test-User (oder verwende bestehenden ohne Stripe-Abo)
2. Gehe zu `/pay`
3. Erstelle Subscription
4. Richte echtes SEPA-Mandat ein (eigene IBAN)
5. Warte auf erste Rechnung (kann bis zu 7 Tage dauern)
6. Prüfe Status-Sync funktioniert

**Empfehlung:** 
- Verwende zunächst 0,01€ Test-Subscription
- Oder erstelle "Test-Preis" in Invoice Ninja (1€/Monat)

## Rollback-Plan

Falls etwas schief geht:

### Sofortiges Rollback

1. **Vercel Deployment rückgängig:**
   ```bash
   # In Vercel Dashboard: Deployments → Previous → Promote to Production
   ```

2. **Stripe Webhooks wieder aktivieren:**
   - Stripe Dashboard → Webhooks → Enable

3. **Environment Variables zurücksetzen:**
   - Stripe Keys wieder aktivieren

### Datenbank-Rollback (nur im Notfall)

```sql
-- Nur wenn nötig! Prüfe zuerst ob Stripe-Daten noch vorhanden
SELECT * FROM subscriptions WHERE stripe_customer_id IS NOT NULL;

-- Falls Stripe-Daten weg sind:
-- Restore from Backup (Supabase Dashboard)
```

## Migration bestehender Stripe-Kunden

### Opt 1: Harte Migration (Alle auf einmal)

**Nicht empfohlen** - Zu riskant

### Option 2: Sanfte Migration (Empfohlen)

1. **Phase 1:** Neue Kunden ab jetzt über Invoice Ninja
2. **Phase 2:** Bestehende Stripe-Kunden laufen weiter
3. **Phase 3:** Bei Renewal: Migriere zu Invoice Ninja

**Code-Anpassung für hybride Phase:**

```typescript
// In useSubscription.ts
// Prüfe ob Stripe ODER Invoice Ninja
if (subscription.stripe_subscription_id) {
  // Alte Stripe-Logik
} else if (subscription.invoice_ninja_client_id) {
  // Neue Invoice Ninja Logik
}
```

### Option 3: Manuelle Migration

Für jeden bestehenden Kunden:

1. Kündige Stripe-Abo (cancel at period end)
2. Erstelle Invoice Ninja Subscription
3. Update Supabase Eintrag

## Post-Deployment Monitoring

### Erste 48 Stunden

- [ ] Prüfe Vercel Logs: Keine 500 Errors
- [ ] Prüfe Supabase Logs: Keine DB-Fehler
- [ ] Prüfe Invoice Ninja Logs: `docker logs <container>`
- [ ] Prüfe GoCardless Dashboard: Mandates erstellt?
- [ ] Prüfe erste Subscriptions erfolgreich?

### Metriken überwachen

```sql
-- Anzahl neuer Invoice Ninja Subscriptions
SELECT COUNT(*) 
FROM subscriptions 
WHERE invoice_ninja_client_id IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days';

-- Status-Verteilung
SELECT status, COUNT(*) 
FROM subscriptions 
WHERE invoice_ninja_client_id IS NOT NULL
GROUP BY status;

-- Letzte API-Syncs
SELECT user_id, last_api_sync, status
FROM subscriptions 
WHERE invoice_ninja_client_id IS NOT NULL
ORDER BY last_api_sync DESC
LIMIT 20;
```

## Häufige Probleme

### Problem: API Token funktioniert nicht

**Symptom:** 401 Unauthorized Errors in Vercel Logs

**Lösung:**
1. Prüfe Token in Invoice Ninja: Settings → API Tokens
2. Token muss "Company User" Permissions haben
3. Neu generieren falls nötig
4. In Vercel Environment Variables updaten

### Problem: GoCardless Mandates werden nicht erstellt

**Symptom:** Client Portal zeigt keine Payment Gateway Option

**Lösung:**
1. Prüfe GoCardless ist auf "Production" in Invoice Ninja
2. Prüfe API Keys sind korrekt
3. Prüfe Company Country = Deutschland (für SEPA)

### Problem: Rechnungen werden nicht automatisch erstellt

**Symptom:** Status bleibt auf "pending", keine Invoices

**Lösung:**
1. Prüfe Recurring Invoice `next_send_date`
2. Prüfe `auto_bill` = 'always'
3. Prüfe Invoice Ninja Cron läuft: `docker exec <container> php artisan schedule:run`

### Problem: Status-Sync funktioniert nicht

**Symptom:** Status bleibt veraltet

**Lösung:**
1. Prüfe `INVOICE_NINJA_URL` ist korrekt (inkl. https://)
2. Prüfe API Token Permissions
3. Manuell triggern: `/api/invoice-ninja/sync-status`

## Support & Debugging

### Logs anschauen

```bash
# Vercel Logs
# Dashboard → Deployments → View Logs

# Invoice Ninja Container Logs
docker logs -f <invoice-ninja-container>

# Supabase Logs
# Dashboard → Logs → API Logs
```

### Debug-Mode aktivieren

```bash
# Temporär in Vercel für debugging
LOG_LEVEL=debug
```

### Test-API-Calls

```bash
# Test Invoice Ninja API
curl -X GET "https://your-invoice-ninja-url.com/api/v1/clients" \
  -H "X-API-TOKEN: your_token" \
  -H "Content-Type: application/json"
```

## Checkliste: Deployment Complete

- [ ] Datenbank-Migrationen erfolgreich
- [ ] Environment Variables in Vercel gesetzt
- [ ] GoCardless Production Mode aktiv
- [ ] Code deployed (Vercel)
- [ ] Erste Test-Subscription erfolgreich
- [ ] Status-Sync funktioniert
- [ ] Rechnungen werden erstellt
- [ ] Client Portal erreichbar
- [ ] PDF-Downloads funktionieren
- [ ] Referral-System getestet
- [ ] Stripe Webhooks deaktiviert (nach erfolg)
- [ ] Team/Stakeholder informiert

## Kontakt

Bei kritischen Problemen:
- Invoice Ninja Community: https://forum.invoiceninja.com/
- GoCardless Support: support@gocardless.com
- Supabase Support: support@supabase.io

---

**Viel Erfolg! 🚀**

