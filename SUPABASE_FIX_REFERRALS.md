# Supabase Fix: Referrals Status Column

## Problem

Die `referrals` Tabelle hat noch den alten Status-Wert `'rewarded'` aus der Stripe-Zeit.
Invoice Ninja verwendet `'completed'` stattdessen.

**Fehler:**
```
GET .../referrals?status=eq.completed 406 (Not Acceptable)
```

## Lösung

Führe dieses SQL in Supabase SQL Editor aus:

```sql
-- 1. Update existierende 'rewarded' zu 'completed'
UPDATE referrals
SET status = 'completed'
WHERE status = 'rewarded';

-- 2. Prüfe Ergebnis
SELECT status, COUNT(*) 
FROM referrals 
GROUP BY status;
```

## Ausführung

1. Gehe zu: https://supabase.com/dashboard/project/ohaduturfrhqiuhnewhg/sql/new
2. Kopiere das SQL oben
3. Klicke "Run"
4. Prüfe ob alle `rewarded` zu `completed` wurden

## Nach dem Fix

Die Abfrage `status=eq.completed` sollte dann funktionieren und keine 406-Fehler mehr werfen.

