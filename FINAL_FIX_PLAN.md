# 🎯 Finaler Fix-Plan: Invoice Ninja Integration

## Status: API funktioniert lokal ✅

Lokaler Test erfolgreich:
- ✅ `X-API-TOKEN` Header korrekt
- ✅ 4 Rechnungen gefunden für Client `z3YaOYpdxq`
- ✅ API-Verbindung funktioniert

---

## 🚨 KRITISCHE FIXES (SOFORT)

### 1. Supabase SQL ausführen

**Gehe zu**: https://supabase.com/dashboard/project/ohaduturfrhqiuhnewhg/sql/new

```sql
-- Fix 1: Referrals Status (406 Error beheben)
UPDATE referrals
SET status = 'completed'
WHERE status = 'rewarded';

-- Fix 2: Client ID für dk136@hdm-stuttgart.de setzen
INSERT INTO subscriptions (
  user_id,
  invoice_ninja_client_id,
  payment_method,
  status,
  last_api_sync,
  created_at,
  updated_at,
  cancel_at_period_end
)
VALUES (
  '8ed7f903-a032-4bb8-adde-4248b2d3c0d2',
  'z3YaOYpdxq',
  'gocardless_sepa',
  'active',
  NOW(),
  NOW(),
  NOW(),
  FALSE
)
ON CONFLICT (user_id) 
DO UPDATE SET
  invoice_ninja_client_id = 'z3YaOYpdxq',
  payment_method = 'gocardless_sepa',
  last_api_sync = NOW(),
  updated_at = NOW();

-- Prüfe Ergebnis
SELECT 
  user_id,
  invoice_ninja_client_id,
  status,
  payment_method
FROM subscriptions
WHERE user_id = '8ed7f903-a032-4bb8-adde-4248b2d3c0d2';
```

---

## 📋 Synchronisation: Webhooks vs. Polling

### Aktuelle Lösung: **API-Polling** ✅

**Implementiert in** `hooks/useSubscription.ts`:
- Sync alle 5 Minuten
- Prüft Invoice Ninja Status
- Updated Supabase automatisch

**Vorteile**:
- ✅ Einfach zu implementieren
- ✅ Keine Webhook-Konfiguration nötig
- ✅ Funktioniert mit Docker Invoice Ninja
- ✅ Robust gegen Netzwerkfehler

**Nachteile**:
- ⚠️ Nicht Echtzeit (5 Min Verzögerung)
- ⚠️ Mehr API-Calls

### Alternative: **Webhooks** (Optional, später)

Laut [Invoice Ninja API Docs](https://api-docs.invoicing.co/):
- Webhooks verfügbar für: `create`, `update`, `delete` Events
- Müssen in Invoice Ninja konfiguriert werden
- Benötigen öffentlichen Endpoint

**Empfehlung**: Bleibe bei Polling, füge Webhooks später hinzu wenn nötig.

---

## 🔄 Sync-Flow (Aktuell)

```
User lädt Seite
    ↓
useSubscription Hook
    ↓
Prüfe Supabase → Subscription vorhanden?
    ↓
Ja → Prüfe last_api_sync
    ↓
> 5 Min? → API-Call zu Invoice Ninja
    ↓
checkSubscriptionStatus()
    ↓
Update Supabase mit neuem Status
    ↓
Frontend zeigt aktuellen Status
```

---

## ✅ Nach SQL-Fix erwartetes Verhalten

1. **Rechnungen-Seite** (`/profile/invoices`):
   - ✅ Lädt 4 Rechnungen von Invoice Ninja
   - ✅ Zeigt Status, Betrag, Datum

2. **Abo-Verwaltung** (`/profile/manage-subscription`):
   - ✅ Status: "Aktiv"
   - ✅ Button: "Kundenportal öffnen"
   - ✅ Button: "Abo kündigen"

3. **Keine Fehler mehr**:
   - ✅ Kein 406 bei Referrals
   - ✅ Kein 500 bei Invoices
   - ✅ Kein 404 bei Client Portal

---

## 🚀 Deployment-Status

**Aktuell**: Code ist korrekt, wartet auf SQL-Fix

**Nach SQL-Fix**:
1. Seite neu laden
2. Alle Funktionen sollten funktionieren
3. Rechnungen werden angezeigt

---

## 📊 Monitoring & Fehlerbehandlung

**Implementiert**:
- ✅ Console Logs für Debugging
- ✅ Try-Catch in allen API-Calls
- ✅ Fallback auf leere Arrays bei Fehlern
- ✅ Toast-Benachrichtigungen bei Fehlern

**Fehlt noch**:
- ⚠️ Sentry/Error Tracking
- ⚠️ Retry-Logic bei API-Fehlern
- ⚠️ Rate-Limiting-Handling

---

## 🎯 Nächste Schritte

1. ✅ Code deployed (X-API-TOKEN Header korrekt)
2. ⏳ **WARTE AUF**: User führt SQL in Supabase aus
3. ⏳ Test: Rechnungen werden angezeigt
4. ⏳ Test: Abo-Verwaltung funktioniert
5. ⏳ Optional: Webhooks implementieren

**Status**: Bereit für Testing nach SQL-Fix

