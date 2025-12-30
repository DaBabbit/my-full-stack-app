# 🚨 KRITISCHE FIXES BENÖTIGT

## 1. Supabase SQL ausführen (SOFORT!)

### Fix 1: Referrals Status
```sql
UPDATE referrals
SET status = 'completed'
WHERE status = 'rewarded';
```

### Fix 2: Client ID für User setzen
```sql
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
```

**Ausführen unter**: https://supabase.com/dashboard/project/ohaduturfrhqiuhnewhg/sql/new

---

## 2. Code-Fixes (in Arbeit)

### Problem: API-Header
- ✅ GEFIXT: `X-API-TOKEN` → `X-Api-Token`

### Problem: Invoice Ninja API-Calls
- 🔄 PRÜFE: Alle API-Endpoints gegen Dokumentation
- 🔄 TESTE: Lokale API-Calls funktionieren

### Problem: Vercel Deployment
- ⚠️ Routes werden nicht korrekt deployed
- 🔄 PRÜFE: Vercel Build-Logs

---

## 3. Nächste Schritte

1. ✅ SQL in Supabase ausführen (MANUELL)
2. 🔄 API-Calls testen und fixen
3. 🔄 Deployment prüfen
4. 🔄 End-to-End Test

**Status**: Warte auf SQL-Ausführung durch User

